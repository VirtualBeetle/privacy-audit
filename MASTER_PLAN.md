# Privacy Audit and Data Transparency Service — Master Plan

> This document is the single source of truth for what this project is, how it is architected,
> what has been built, and everything that remains to be built.
> Last updated: 2026-04-13

---

## 1. What This Project Is

A reusable, SaaS-based Privacy Audit and Data Transparency Service for multi-tenant web applications.

**The problem it solves:**
Users of applications like Instagram or LinkedIn can see when other users access their data, but they have no visibility into how the *application itself* uses their data internally — for ad targeting, selling to data brokers, recommendations, and so on. This project brings that internal data usage into the light.

**How it works:**
- Tenant applications (e.g. HealthTrack, ConnectSocial) integrate with this service
- Every time the tenant app reads, exports, or shares a user's data internally, it sends an event to this service via an SDK or REST API
- The user can then visit a privacy dashboard and see exactly how their data has been used — by whom, for what reason, with what sensitivity, and whether third parties were involved

**Dissertation context:**
- Title: Building a Reusable Privacy Audit and Data Transparency Service for Multi-Tenant Web Applications
- Institution: Griffith College Dublin
- Programme: MSCC / MSCBD
- Student: Rakesh Velavaluri (GitHub: VirtualBeetle)

---

## 2. System Architecture — Five Layers

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 5 — CLIENTS                                        │
│  Tenant Apps (HealthTrack, ConnectSocial)                 │
│  User Privacy Dashboard (React)                           │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  LAYER 4 — API GATEWAY                                    │
│  NestJS REST API                                          │
│  Auth: API Key (tenant events) + JWT (admin) + OAuth      │
│  Rate limiting, CORS, tenant isolation middleware         │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  LAYER 3 — CORE SERVICES                                  │
│  Event Ingestor (with deduplication + hash chain)         │
│  Internal Queue (Bull/Redis — async processing)           │
│  Export Engine (GDPR Article 20)                          │
│  Deletion Engine (GDPR Article 17)                        │
│  Retention Cleanup Job (scheduled cron)                   │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  LAYER 2 — DATA LAYER                                     │
│  PostgreSQL (shared instance, all tenants)                │
│  Tenant isolation enforced on every query (tenant_id)     │
│  Tables: tenants, users, audit_events, export_requests,   │
│          deletion_requests, dashboard_users,              │
│          linked_accounts                                  │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  LAYER 1 — INTELLIGENCE                                   │
│  AI Risk Agent (Claude API)                               │
│  Reads audit events, flags anomalies, sends alerts        │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Tenancy Strategy

- All tenants share **one PostgreSQL instance**
- Every table has a `tenant_id` column
- Every query is scoped by `tenant_id` at the service layer — no cross-tenant leakage is possible
- Tenant isolation is enforced at three levels simultaneously: API (middleware), service (query scope), database (foreign key constraint)

---

## 4. Authentication Architecture — Three Tiers

### Tier 1 — Tenant App → Privacy Audit Service (sending events)

**Method: API Key**

- Tenant registers on the service → receives a unique API key (`pak_xxxxx`)
- The API key is stored as a bcrypt hash in the tenants table (never plaintext)
- When the tenant app sends an event, it includes the API key in the `x-api-key` header
- The backend validates the key, resolves the tenant, and scopes the event to that tenant
- This is the standard industry approach (same as Stripe, Segment, etc.)

### Tier 2 — Tenant Admin → Privacy Audit Service (admin operations)

**Method: JWT**

- Tenant admin logs in with email/password → receives a JWT
- JWT payload contains `tenantId`, `role`, `sub`
- Used for: viewing all events, managing tenant settings, viewing export/deletion requests
- Already implemented

### Tier 3 — End User → Privacy Dashboard (two phases)

#### Phase 1 — Simple Demo Login (current priority)

User opens the dashboard, they see a login page:
- Dropdown: "Which app are you from?" → HealthTrack / ConnectSocial
- Field: "Your user ID in that app" (e.g. james.obrien@demo.com)
- Button: "View my privacy dashboard"

The backend resolves `tenant_user_id` within the selected `tenant_id` and returns a short-lived session token scoped to that user's events.

No password required for demo — the user_id + tenant selection is sufficient for the proof-of-concept.

#### Phase 2 — Google OAuth + Account Linking (production architecture)

This is the production-grade design and adds significant architectural complexity.

**Flow:**

```
1. User visits /login
2. Clicks "Sign in with Google"
3. Google OAuth 2.0 flow completes
4. Privacy Audit Service receives Google profile (Google ID, email, name, picture)
5. Service creates or finds a dashboard_users record keyed by Google ID
6. User is redirected to /settings (first time) or /dashboard (returning user)

From /settings:
7. User clicks "Link an app account"
8. Selects tenant from dropdown (HealthTrack / ConnectSocial)
9. Enters the email address they registered with on that app
10. Service stores the link: dashboard_user_id → tenant_id + tenant_user_id
11. Dashboard now shows events from all linked tenants in one view
```

**New tables required:**

`dashboard_users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| google_id | VARCHAR UNIQUE | from Google OAuth |
| email | VARCHAR | |
| name | VARCHAR | |
| picture | VARCHAR | profile picture URL |
| created_at | TIMESTAMP | |

`linked_accounts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| dashboard_user_id | UUID FK → dashboard_users | |
| tenant_id | UUID FK → tenants | which tenant app |
| tenant_user_id | VARCHAR | user's ID in that tenant |
| linked_at | TIMESTAMP | |

**This architecture demonstrates:**
- OAuth 2.0 with Passport.js (industry-standard identity)
- Cross-tenant identity aggregation (user has one Google identity spanning multiple app accounts)
- Settings-driven account management
- Session management separate from tenant auth

---

## 5. SDK Design — Three Connection Modes

Each SDK (Go, Python, JS/TS) supports three modes. Tenants choose the mode that fits their infrastructure.

### Mode 1 — REST API Only (direct)
SDK sends the event synchronously to `POST /events` with the API key.
Simple and works out of the box.

### Mode 2 — REST API + Internal Queue (hybrid)
SDK sends to `POST /events`. The backend places the event on an internal Bull queue (Redis-backed). A consumer picks it up and stores it asynchronously. Tenant gets `202 Accepted` immediately.

### Mode 3 — Message Queue Direct (Kafka / RabbitMQ)
SDK publishes directly to a Kafka topic or RabbitMQ exchange. The Privacy Audit Service consumes from the queue independently. Most resilient — events survive service restarts.

---

## 6. Canonical Event Format

```json
{
  "tenant_id": "uuid",
  "tenant_user_id": "string",
  "event_id": "uuid — SDK-generated, used for deduplication",
  "timestamp": "ISO 8601",
  "action": { "code": "READ", "label": "Read" },
  "data_fields": ["email", "location", "phone_number"],
  "reason": { "code": "AD_TARGETING", "label": "Used for targeted advertising" },
  "actor": { "type": "THIRD_PARTY", "label": "Third-party advertiser", "identifier": "DoubleClick" },
  "sensitivity": { "code": "HIGH", "label": "High sensitivity" },
  "third_party_involved": true,
  "third_party_name": "DoubleClick Ads",
  "retention_days": 90,
  "region": "IE",
  "consent_obtained": true,
  "user_opted_out": false,
  "meta": { "feature": "ad_recommendations" }
}
```

Action codes: `READ` | `WRITE` | `SHARE` | `DELETE` | `EXPORT` | `ANALYSE`
Actor types: `SYSTEM` | `EMPLOYEE` | `THIRD_PARTY` | `OTHER_USER` | `DATA_BROKER`
Sensitivity: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

---

## 7. PostgreSQL Schema

### tenants
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR | |
| email | VARCHAR UNIQUE | |
| api_key_hash | VARCHAR | stored as bcrypt hash |
| retention_days | INT | default 90 |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |

### users (tenant admin users)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| email | VARCHAR UNIQUE | |
| password_hash | VARCHAR | |
| role | ENUM | tenant_admin, end_user |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |

### audit_events
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | |
| tenant_user_id | VARCHAR | tenant's own user identifier |
| event_id | UUID UNIQUE | SDK-generated, idempotency key |
| action_code | VARCHAR | READ, WRITE, etc. |
| action_label | VARCHAR | |
| data_fields | JSONB | array of strings |
| reason_code | VARCHAR | |
| reason_label | VARCHAR | |
| actor_type | VARCHAR | |
| actor_label | VARCHAR | |
| actor_identifier | VARCHAR nullable | |
| sensitivity_code | VARCHAR | |
| third_party_involved | BOOLEAN | |
| third_party_name | VARCHAR nullable | |
| retention_days | INT | default 90 |
| region | VARCHAR nullable | |
| consent_obtained | BOOLEAN | |
| user_opted_out | BOOLEAN | |
| meta | JSONB nullable | |
| prev_hash | VARCHAR nullable | SHA-256 hash of previous event |
| hash | VARCHAR | SHA-256 of this event + prev_hash |
| occurred_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### export_requests
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| tenant_user_id | VARCHAR | |
| status | VARCHAR | requested → processing → completed |
| download_url | VARCHAR nullable | expires after 24h |
| requested_at | TIMESTAMP | |
| completed_at | TIMESTAMP nullable | |

### deletion_requests
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK | |
| tenant_user_id | VARCHAR | |
| status | VARCHAR | requested → confirmed → completed |
| evidence_ref | VARCHAR nullable | proof of erasure |
| requested_at | TIMESTAMP | |
| completed_at | TIMESTAMP nullable | |

### dashboard_users (Phase 2)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| google_id | VARCHAR UNIQUE | |
| email | VARCHAR | |
| name | VARCHAR | |
| picture | VARCHAR nullable | |
| created_at | TIMESTAMP | |

### linked_accounts (Phase 2)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| dashboard_user_id | UUID FK → dashboard_users | |
| tenant_id | UUID FK → tenants | |
| tenant_user_id | VARCHAR | |
| linked_at | TIMESTAMP | |

---

## 8. GitHub Repositories

| Repo | Purpose | Tech |
|---|---|---|
| VirtualBeetle/privacy-audit-backend | Core NestJS service | NestJS + TypeScript + PostgreSQL |
| VirtualBeetle/privacy-audit-frontend | React dashboard (admin + user) | React + TypeScript + MUI + Tailwind |
| VirtualBeetle/privacy-audit-sdk | SDKs for tenant integration | Go + Python + JS/TS |
| VirtualBeetle/privacy-audit-infra | Root Docker Compose | Docker |
| VirtualBeetle/privacy-health-tenant | Demo Health App | Go + Gin + React |
| VirtualBeetle/privacy-social-media-tenant | Demo Social Media App | FastAPI + React |

---

## 9. Build Phases — Everything To Be Built

### Phase A — Backend: API Key Auth for Events (currently JWT only)

The events endpoint currently uses JWT auth. Tenant apps should send events using their API key, not a user JWT.

**What to build:**
- `ApiKeyGuard` — reads `x-api-key` header, validates against hashed keys in tenants table, attaches tenant to request
- Apply `ApiKeyGuard` on `POST /events` (replaces JWT guard for this endpoint)
- `GET /events` remains JWT-protected (for tenant admin use)
- Add `api_key_hash` column to tenants table (currently `api_key` is stored plaintext — must be hashed)

**Complexity this adds:** API key authentication pattern, bcrypt hashing for secrets (not just passwords), dual auth strategy (API key for machine-to-machine, JWT for human login)

---

### Phase B — Backend: Hash Chaining on Audit Events

The `audit_events` entity is missing `prev_hash` and `hash` columns. Every event should be linked in a chain so the log is tamper-evident.

**What to build:**
- Add `prevHash` and `hash` columns to `AuditEvent` entity
- In `EventsService.create()`: before saving, fetch the last event for this tenant, compute SHA-256 of (event data + prev_hash), store both columns
- Add a `GET /events/verify-chain` endpoint that walks the chain and confirms no tampering

**Complexity this adds:** SHA-256 cryptographic hash chaining (same concept as blockchain), tamper-evident audit log for GDPR Article 30 accountability

---

### Phase C — Backend: Export Workflow (GDPR Article 20)

**What to build:**
- `ExportRequest` entity
- `ExportsModule` with:
  - `POST /exports` — user requests export, creates record with status `requested`
  - Background job picks it up, generates a JSON/CSV of all their events, stores as a file, updates status to `completed`, sets `download_url` with expiry
  - `GET /exports/:id` — check status of an export request
  - `GET /exports/:id/download` — download the file (validates expiry)

**Complexity this adds:** Async workflow with status state machine (requested → processing → completed), file generation, expiring download URLs, GDPR Article 20 compliance

---

### Phase D — Backend: Deletion Workflow (GDPR Article 17)

**What to build:**
- `DeletionRequest` entity
- `DeletionsModule` with:
  - `POST /deletions` — user requests deletion
  - Background job: soft-deletes all audit events for that `tenant_user_id`, stores evidence reference, marks status `completed`
  - `GET /deletions/:id` — check status

**Complexity this adds:** GDPR Article 17 right to erasure, evidence of deletion stored for regulatory proof, soft delete pattern

---

### Phase E — Backend: Internal Queue (Bull + Redis)

**What to build:**
- Add `@nestjs/bull` + Redis to the project
- Add `BullModule` with an `audit-events` queue
- When `POST /events` is called: validate the payload, push to queue, return `202 Accepted` immediately
- `EventProcessor` consumer: dequeues, runs deduplication + hash chain, saves to database
- This is SDK Mode 2 (Hybrid)

**Complexity this adds:** Message queue architecture, async event processing, non-blocking API responses, resilience (events survive DB hiccups), Bull job dashboard (optional)

---

### Phase F — Backend: Data Retention Cleanup Job

**What to build:**
- Add `@nestjs/schedule` to the project
- `RetentionService` with a `@Cron` task that runs daily at midnight
- Queries all tenants, gets their `retention_days`, deletes `audit_events` older than that window per tenant

**Complexity this adds:** Scheduled background job (cron), per-tenant configurable data retention policy, GDPR Article 5(1)(e) storage limitation compliance

---

### Phase G — Backend: Rate Limiting

**What to build:**
- Add `@nestjs/throttler`
- Apply globally: 100 requests per minute per IP
- Apply stricter limits on the events ingestion endpoint: 1000 events per minute per API key

**Complexity this adds:** Rate limiting as a security and reliability control, differentiating limits by auth context

---

### Phase H — Backend: Google OAuth + Account Linking (Phase 2 Auth)

**What to build:**
- Install `passport-google-oauth20`, `@nestjs/passport`
- `GoogleStrategy` — handles OAuth callback, creates or finds `dashboard_users` record
- `DashboardUsersModule`:
  - `GET /auth/google` — redirect to Google
  - `GET /auth/google/callback` — handle callback, issue session JWT
  - `POST /auth/link-account` — link a tenant account to current Google user
  - `DELETE /auth/link-account/:id` — unlink
  - `GET /auth/me` — get current user + linked accounts
- New tables: `dashboard_users`, `linked_accounts`

**Complexity this adds:** OAuth 2.0 (industry-standard identity protocol), cross-tenant identity aggregation, settings-driven account management, separate auth context from tenant operations

---

### Phase I — Frontend: Login Page (Phase 1 — Simple)

**What to build:**
- `/login` route
- Tenant dropdown (HealthTrack / ConnectSocial)
- User ID / email input
- On submit: hits `POST /dashboard/session` with `{tenantId, tenantUserId}`, gets back a short-lived session token
- Stores token, redirects to `/dashboard`
- Dashboard uses the token to call real `GET /events`

---

### Phase J — Frontend: Connect to Real Backend

**What to build:**
- `src/api/client.ts` — Axios instance with base URL + auth header
- Replace `SEED_EVENTS` import in `Dashboard.tsx` with real `GET /events` API call
- Loading and error states
- Empty state when no events exist

---

### Phase K — Frontend: Export + Deletion UI

**What to build:**
- Settings or Privacy Actions section on the dashboard
- "Request my data export" button → calls `POST /exports` → shows status tracking ("Your export is being prepared…")
- "Request account deletion" button → confirmation modal → calls `POST /deletions`
- Status polling or page refresh for completed exports with download link

---

### Phase L — Frontend: Google OAuth + Account Linking UI (Phase 2)

**What to build:**
- Updated `/login` page with "Sign in with Google" button
- `/settings` page:
  - "Connected apps" section showing linked tenant accounts
  - "Link an app account" — tenant dropdown + email field
  - "Unlink" button per account
- Dashboard shows which tenant each event came from, unified across all linked accounts

---

### Phase M — Frontend: Opt-Out Controls

**What to build:**
- "Your data preferences" section on the dashboard
- Toggle per reason category (e.g. opt out of AD_TARGETING, DATA_BROKERING)
- Sends `PUT /preferences` to backend which stores `user_opted_out` flag
- Events where `user_opted_out = true` are highlighted differently in the feed

**Complexity this adds:** User consent management, per-category opt-out, GDPR Article 7 consent withdrawal

---

### Phase N — SDKs (Go, Python, JS/TS)

Three separate SDK packages, each supporting all three connection modes.

**Go SDK (`privacy-audit-sdk/go/`):**
- Package: `github.com/VirtualBeetle/privacy-audit-sdk/go`
- `Client` struct with `APIKey`, `ServiceURL`, `Mode`
- `Track(event Event) error` — Mode 1 (direct REST call)
- `TrackAsync(event Event) error` — Mode 2 (REST + local retry queue)
- Integration: used by `privacy-health-tenant` Go backend

**Python SDK (`privacy-audit-sdk/python/`):**
- Package: `privacy-audit-sdk` (pip)
- `PrivacyAuditClient(api_key, service_url, mode)`
- `track(event: dict)` — Mode 1
- `track_async(event: dict)` — Mode 2
- Integration: used by `privacy-social-media-tenant` FastAPI backend

**JS/TS SDK (`privacy-audit-sdk/js/`):**
- Package: `@virtualbeetle/privacy-audit-sdk` (npm)
- `new PrivacyAuditClient({ apiKey, serviceUrl, mode })`
- `client.track(event)` — Mode 1
- Integration: available for any future tenant

---

### Phase O — Demo App Integration (Wire SDK calls)

**Health Tenant — 6 SDK call points:**
| Where in code | event | actor |
|---|---|---|
| Doctor views patient profile | READ | EMPLOYEE |
| Doctor views medical records | READ | EMPLOYEE |
| System generates appointment reminder | READ | SYSTEM |
| Insurance details accessed | READ | THIRD_PARTY |
| Patient requests data export | EXPORT | SYSTEM |
| Patient requests deletion | DELETE | SYSTEM |

**Social Media Tenant — 7 SDK call points:**
| Where in code | event | actor |
|---|---|---|
| Feed algorithm reads profile | READ | SYSTEM |
| Ad system reads location | READ | SYSTEM |
| Another user searches for this user | READ | OTHER_USER |
| Third-party analytics reads post data | READ | THIRD_PARTY |
| Check-in data shared with location partner | SHARE | DATA_BROKER |
| User requests data export | EXPORT | SYSTEM |
| User requests deletion | DELETE | SYSTEM |

---

### Phase P — Docker Compose (Full Stack)

**What to build in `privacy-audit-infra`:**
```
services:
  postgres        — shared DB for audit service
  redis           — Bull queue backing store
  audit-backend   — NestJS service (port 8080)
  audit-frontend  — React dashboard (port 3000)
  health-backend  — Go backend (port 8081)
  health-frontend — React health app (port 3001)
  social-backend  — FastAPI backend (port 8082)
  social-frontend — React social app (port 3002)
```
All services on a shared Docker network. Health checks on postgres and redis. Volumes for DB persistence.

---

### Phase Q — AI Risk Agent

**What to build:**
- `AiRiskModule` in the backend
- Cron job runs every 6 hours
- Reads recent `audit_events` grouped by tenant
- Calls Claude API with a system prompt: "You are a privacy risk analyst. Review these data access events and identify any that are suspicious or high risk."
- Flags: after-hours access, unusual export volumes, consent_obtained=false on high-sensitivity events, DATA_BROKER actor without opt-in
- Stores results in `risk_alerts` table: `tenant_id`, `event_id`, `risk_score`, `explanation`, `created_at`
- Frontend: new "Risk Alerts" section on dashboard showing flagged events with AI explanation

**Complexity this adds:** AI integration, automated compliance monitoring, LLM-driven anomaly detection, GDPR Article 30 supervisory accountability

---

## 10. Tech Stack Summary

| Component | Technology |
|---|---|
| Privacy Audit Service backend | NestJS + TypeScript |
| Privacy Audit Service frontend | React + TypeScript + MUI + Tailwind + Recharts |
| Database | PostgreSQL (TypeORM) |
| Queue | Bull + Redis |
| Scheduler | @nestjs/schedule |
| Auth | JWT + API Key + Google OAuth (Passport.js) |
| AI Agent | Claude API (Anthropic) |
| Health App backend | Go + Gin + GORM |
| Health App frontend | Vite + React |
| Social Media App backend | FastAPI (Python) |
| Social Media App frontend | Vite + React |
| Containerisation | Docker + Docker Compose |

---

## 11. Complexity Features — Dissertation Value

This table summarises the technically complex features and what each one demonstrates for academic evaluation.

| Feature | Academic Relevance |
|---|---|
| Multi-tenant data isolation (tenant_id on every query) | Software architecture, security design |
| API key authentication (bcrypt-hashed secrets) | Security, credential management patterns |
| JWT with embedded tenant context | Stateless auth, claims-based identity |
| Google OAuth 2.0 + account linking | Industry-standard identity protocol, cross-service identity |
| SHA-256 hash chaining on audit log | Cryptographic tamper-evidence, GDPR Article 30 |
| Async event processing via Bull queue | Distributed systems, non-blocking architecture |
| GDPR Article 20 export workflow (async, expiring URL) | Legal compliance, state machine design |
| GDPR Article 17 deletion workflow (evidence stored) | Legal compliance, soft delete, regulatory proof |
| Per-tenant configurable data retention + cron cleanup | GDPR Article 5(1)(e), policy-driven automation |
| Rate limiting per API key | Security, abuse prevention |
| Opt-out controls per data category | Consent management, GDPR Article 7 |
| SDK in 3 languages (Go, Python, JS/TS) | SDK design, cross-language API integration |
| 3 SDK connection modes (REST, Hybrid, Queue) | Distributed integration patterns |
| AI risk agent (LLM anomaly detection) | AI/ML integration, automated compliance monitoring |
| Full Docker Compose (8 services) | DevOps, containerisation, microservice orchestration |
| Two real demo tenant apps (Health + Social) | End-to-end integration, real-world simulation |

---

## 12. Port Map

| Service | Port |
|---|---|
| Privacy Audit Backend | 8080 |
| Privacy Audit Frontend | 3000 |
| Health Tenant Backend | 8081 |
| Health Tenant Frontend | 3001 |
| Social Tenant Backend | 8082 |
| Social Tenant Frontend | 3002 |
| PostgreSQL (audit service) | 5432 |
| PostgreSQL (health tenant) | 5433 |
| PostgreSQL (social tenant) | 5434 |
| Redis (Bull queue) | 6379 |
