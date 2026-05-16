# Real-Time Usage — How DataGuard Manages It

**Mentor question:** *"What if we're using it for real time — how can we manage?"*

This document explains how the DataGuard Privacy Audit system already handles real-time event ingestion today, what its current limits are, and how it can be scaled if the workload grows from a demo to a production-grade real-time pipeline.

---

## 1. What "real-time" means in this system

In DataGuard, real-time has two distinct sides:

| Side | What it means | Where it happens |
|---|---|---|
| **Write path** | Tenant apps push audit events (data access, consent change, deletion, etc.) the moment they happen | SDK → `POST /api/events` → BullMQ → Postgres |
| **Read path** | The dashboard sees those events live, without refreshing | Backend → SSE → React dashboard |

The mentor's concern usually maps to the write path: *can the system keep up if events arrive constantly, from many tenants, all at once?*

---

## 2. The current real-time design (what's already built)

The system was deliberately built so the HTTP request that records an event never blocks on slow work. The pipeline is:

```
 Tenant App                  Backend API              Worker                 DB / Stream
 ─────────                   ───────────              ──────                 ──────────
 SDK.log(event)  ──HTTP──►  POST /api/events
                            │
                            │ 1. Validate + auth
                            │ 2. Push job to Redis (BullMQ)
                            │ 3. Return 202 Accepted ◄── fast (~ms)
                            │
                            └──► Redis queue ──► AuditEventProcessor
                                                  │
                                                  │ 4. Hash-chain + persist  ──► PostgreSQL
                                                  │ 5. Risk scoring (AI)     ──► MongoDB
                                                  │ 6. Emit to stream        ──► EventStreamService (RxJS Subject)
                                                                                    │
                                                                                    └──► SSE  ──► Dashboard
```

Key properties:

- **Non-blocking ingestion.** The `POST /api/events` handler enqueues the work and returns immediately. The tenant app is never slowed down by analytics, hashing, or AI scoring.
- **Backpressure-friendly.** BullMQ buffers in Redis. If the worker is slow, jobs queue up instead of being dropped.
- **Live fan-out via SSE.** `EventStreamService` is an RxJS `Subject`. The dashboard subscribes through Server-Sent Events and filters by `tenantId` + `tenantUserId`. No persistence in the stream — only currently connected clients receive a push.
- **Decoupled storage.** Postgres stores the canonical hash-chained event; MongoDB stores enriched risk/AI metadata. Either can scale independently.

So in its current form the platform already operates as a real-time pipeline — it just runs on small Render instances, with one worker, one Redis, and one Postgres.

---

## 3. Where the current setup will hurt under real load

Honest limits of the demo deployment:

| Component | Demo limit | What breaks first |
|---|---|---|
| Render free tier backend | 1 instance, ~512 MB | API thread starvation under burst load |
| Redis (Render) | Single-node, small | Memory pressure if job backlog grows |
| BullMQ worker | 1 process, in-band with API | Slow AI scoring blocks event throughput |
| Postgres | Single primary | Write IOPS ceiling; no read replicas |
| SSE | Held HTTP connections | Connection-count limit per backend instance |
| AI provider (Gemini) | Per-key rate limit | Throttling under bursty traffic |

None of these are bugs — they're the natural ceiling of a free-tier demo. What matters is that the *architecture* doesn't have to change to lift them; only the *deployment* does.

---

## 4. How we manage real-time growth — the strategy

The approach is **layered scaling**: each layer has a known knob, so we only pay for the layers under pressure.

### 4.1 Ingestion layer (API)

- **Horizontal scale.** The NestJS API is stateless. Add more instances behind a load balancer (Render scaling, Fly, ECS, k8s — all equivalent).
- **Per-tenant rate limiting.** Add `@nestjs/throttler` keyed on `tenantId` so a single noisy tenant cannot starve the others.
- **Batch endpoint.** Expose `POST /api/events/batch` for SDKs to flush N events in one HTTP call — drops request overhead by 10–50×. The SDKs already buffer locally; only the endpoint is missing.

### 4.2 Queue layer (Redis + BullMQ)

- **Multiple workers.** BullMQ supports horizontal worker pools out of the box. Run workers as a separate Render service, scale them independently of the API.
- **Concurrency tuning.** Each worker has a `concurrency` setting — raise it for I/O-bound steps (DB writes), lower for CPU-bound steps (AI scoring).
- **Priority queues.** Critical events (consent change, deletion) get a high-priority queue; bulk reads go to low priority. Already supported by BullMQ — only configuration.
- **Dead-letter handling.** BullMQ retries with exponential backoff; failed jobs land in a "failed" set that the Queue Monitor page already visualises.

### 4.3 Storage layer

- **Postgres:** move from single instance to primary + read replica. Dashboard reads (`GET /api/dashboard/events`) go to the replica; writes stay on the primary. Use partitioning on `audit_events` by `created_at` (month) once volume passes ~10M rows.
- **MongoDB Atlas:** scale tier and enable sharding by `tenantId` once any single tenant crosses ~50 GB. Atlas does this without code changes.
- **Hot/cold split.** Recent 30 days stay in Postgres; older events archive to object storage (S3) as Parquet for cheap analytical queries. The hash chain remains intact because each archived event still references its previous hash.

### 4.4 Live dashboard (SSE) layer

- **Per-instance fan-out is fine** for hundreds of dashboard users per backend instance.
- **For thousands**, swap the in-process RxJS `Subject` for **Redis Pub/Sub** as the broadcast bus, so any backend instance can deliver to any connected client. The SSE controller code stays the same; only `EventStreamService.emit()` publishes to Redis instead of an in-memory subject.
- **Fallback to WebSocket** if clients need bidirectional traffic (e.g. live filtering commands from dashboard → backend).

### 4.5 AI risk scoring (the slowest step)

This is the one part of the pipeline that *cannot* keep up with a real-time firehose if every event is scored synchronously. Strategy:

1. **Synchronous fast path:** rule-based risk scoring runs inside the worker (already implemented — checks sensitivity, off-hours access, foreign-IP, volume).
2. **Asynchronous AI path:** the AI provider (Gemini) is called only for events that pass a "needs review" filter — e.g. HIGH/CRITICAL rule score, or random sampling for explainability. This keeps Gemini calls to ~1–5 % of events.
3. **Local LLM option:** for a tenant that needs full AI scoring on every event, swap the provider to a self-hosted model. The `ai-orchestration` module is already provider-agnostic.
4. **Caching identical signatures:** events with the same `{action, resource, sensitivity}` signature in a short window reuse the previous AI verdict.

### 4.6 Observability so we *know* it's real-time

- **Queue depth metric** is already on the Queue Monitor page — alert when waiting > N for > 5 min.
- **End-to-end latency:** measure `event.created_at − event.received_at` and surface a p95 chart. If p95 climbs above the SLO (e.g. 2 seconds), scale workers.
- **SSE connection count per instance:** Prometheus gauge.

---

## 5. Concrete capacity, in numbers

These are realistic targets per scaling step (rough engineering estimates, not benchmarks):

| Stage | Cost level | Sustained events/sec | Notes |
|---|---|---|---|
| Demo (Render free) | $0 | ~50 ev/s | Current state — fine for dissertation demo |
| Single paid instance | ~$50/mo | ~500 ev/s | One paid API + one paid worker + paid Redis |
| Horizontal (3 API + 3 workers) | ~$300/mo | ~5,000 ev/s | + Postgres with read replica |
| Production (sharded) | ~$1,500+/mo | 50,000+ ev/s | + MongoDB sharding, Redis cluster, Postgres partitioning, S3 archive |

The point isn't the exact numbers — it's that **each tier is reached by configuration and deployment changes, not by rewriting the code**. The asynchronous queue-based architecture was chosen specifically so this scaling story is straightforward.

---

## 6. Short answer for the mentor

> The system is already real-time today: the SDK posts events, the API enqueues them in Redis (BullMQ), a worker hashes/persists/scores them, and the dashboard sees them live over SSE. The HTTP request never blocks on slow work, so latency stays low even under bursts.
>
> If usage grows beyond the demo deployment, we scale in layers — more API instances, more BullMQ workers, Postgres read replicas, Redis Pub/Sub for SSE fan-out, and async (sampled) AI scoring instead of synchronous. Each layer is a deployment change, not a code rewrite. We measure queue depth and end-to-end latency to know which layer to scale next.
>
> The architecture was deliberately designed this way so the system can move from "MSc demo at ~50 events/s" to "production at thousands of events/s" without redesign.

---

*Document author: Rakesh Velavaluri — MSc Dissertation, Griffith College Dublin, 2026.*
