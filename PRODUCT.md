# DataGuard — Product Decisions & Roadmap

> Last updated: 2026-05-08
> This document captures product decisions, the feature set, and the forward roadmap.
> For technical implementation details, see ARCHITECTURE.md. For task status, see PROGRESS_TRACKER.md.

---

## 1. What DataGuard Is

DataGuard is a **reusable, SaaS-ready Privacy Audit and Data Transparency Service** for multi-tenant web applications.

**Core problem it solves:**
Users of apps like Instagram or LinkedIn can see when *other people* view their profile, but they have zero visibility into how the app itself uses their data internally — for ad targeting, profiling, selling to data brokers, or powering recommendation engines. DataGuard brings that internal data usage into the light and lets users understand, challenge, and control it.

**Who uses DataGuard:**
1. **Tenant businesses** — integrate DataGuard to demonstrate GDPR compliance and build user trust
2. **Tenant admins** — monitor data access patterns, review risk alerts, manage webhooks
3. **Google-authenticated users** — link multiple app accounts, see their data footprint across services
4. **End users (tenant session)** — see exactly how their data has been used, exercise GDPR rights

**Dissertation context:**
Rakesh Velavaluri, MSc at Griffith College Dublin, dissertation title:
_"Building a Reusable Privacy Audit and Data Transparency Service for Multi-Tenant Web Applications"_

---

## 2. Current Feature Set (Live)

### Core Platform
- **Audit event ingestion** — API key auth, 202 async acceptance, BullMQ queue processing
- **SHA-256 hash chaining** — every event cryptographically linked; tamper-evident log per GDPR Art.30
- **Multi-tenant isolation** — all PostgreSQL queries scoped by `tenant_id`; impossible for tenants to see each other's data

### Privacy Dashboard
- **Overview** — stats bar, sensitivity donut chart, data fields bar chart, recent events feed
- **Audit Events page** — full event log with SHA-256 hash + prevHash visible in expanded view; link to Queue Monitor
- **Risk Alerts** — AI-generated findings with severity (LOW/MEDIUM/HIGH/CRITICAL), GDPR article cited, suggested action

### GDPR Rights Portal
- **Export (Art.20)** — one-click JSON export of all events; async background job; expiring download URL (24h)
- **Deletion (Art.17)** — confirmed hard-delete of all events; evidence hash stored for regulatory proof
- **Consent management (Art.7)** — per-data-type toggles (analytics, ad_targeting, third_party_sharing, profiling, location_data, biometric_data, health_data); consent history recorded

### AI Intelligence
- **DataGuard AI (chat)** — real SSE token streaming; slash commands; structured response cards; thinking steps animation; chat history sidebar; role-aware suggested prompts; all authenticated users
- **AI Risk Agent** — automated analysis every 6 hours; LLM reads recent events, flags anomalies, cites GDPR articles
- **Multi-provider** — Claude / Gemini / OpenAI switchable from UI; keys AES-256 encrypted at rest

### Security Features
- **Webhook system** — HMAC-SHA256 signed delivery on risk alerts; recipients can verify payload integrity
- **Breach simulation** — GDPR Art.33 72-hour countdown from breach report to regulator notification
- **Privacy health score** — 0-100 composite score from consent rate, third-party share rate, high-sensitivity rate, data variety, opt-out rate
- **PDF compliance report** — downloadable A4 PDF with event summary, retention policy, hash chain, GDPR rights

### Developer & Admin Tools
- **Dev/Demo page** — seed events, trigger analysis, trigger weekly digest, check queue health, manage AI providers
- **Queue Monitor** — BullMQ status (waiting/active/completed/failed/delayed)
- **Tenant Onboarding wizard** — 3-step: register → copy API key → watch first event arrive live
- **Swagger/OpenAPI** — interactive docs at `/api/docs`

### Infrastructure
- **3 SDKs** — Go, Python, JS/TS (synchronous + async send + user token issuance)
- **2 demo tenants** — HealthTrack (Go + Gin), ConnectSocial (FastAPI)
- **Full Docker Compose** — 9 services: audit-backend, audit-frontend, postgres (×3), redis, mongo, health (×2), social (×2)
- **Render deployment** — live at audit-backend-ddew.onrender.com

---

## 3. AI Chat — Design Decisions

These decisions were made before implementing the Phase 18 AI Chat redesign:

| Question | Decision | Why |
|---|---|---|
| How to access chat? | Sidebar nav item + FAB expand button | Nav item = first-class feature; FAB = quick access from any page |
| Response format? | Hybrid: slash commands → structured cards; free-form → streaming markdown | Matches the design spec; slash commands need deterministic output |
| Streaming? | Real SSE via `fetch` ReadableStream (POST + Bearer) | `EventSource` doesn't support POST or auth headers |
| History? | History button → sidebar with session list, click to load | Non-disruptive; sidebar slides over the panel |
| Who sees chat? | All authenticated users; role-aware suggested prompts | Inclusivity; prompts surface relevant features per role |

### AI Chat Slash Commands

| Command | Output | What makes it complex |
|---|---|---|
| `/verify` | `chain-verify` card | Recomputes SHA-256 chain inline in the service |
| `/compare` | `comparison` card | Week-over-week event metrics; works for all user types |
| `/explain <topic>` | Streaming markdown | Thinking steps + role context + live tokens |
| `/draft <request>` | `draft` card | LLM generates structured GDPR letter; JSON parsed |
| `/report` | Streaming markdown | Alias for /explain with analysis framing |

### Structured Response Cards

| Card | Triggered by | Key data shown |
|---|---|---|
| `ChainVerifyCard` | `/verify` | Valid/invalid, checked count, latest hash (truncated), chain length |
| `ComparisonCard` | `/compare` | Last 7d vs prev 7d — consent rate, third-party shares, critical events, trust grade |
| `DraftCard` | `/draft` | To/CC/Subject/Body in monospace; Copy/Edit/Send buttons |

Future cards (not yet implemented):
- `EventListCard` — filtered list of events with severity badges
- `RiskSummaryCard` — structured findings from last AI analysis

---

## 4. Product Decisions Log

### Why BullMQ instead of direct PostgreSQL insert?
Event ingestion is latency-sensitive — tenant apps need an immediate `202 Accepted`. Hash chain computation requires a lock-free sequential write (must read last event before saving). The queue serialises writes and gives us retry/backoff for free.

### Why MongoDB for chat sessions and analysis records?
Chat messages are schema-fluid (variable number of messages, different card types, provider metadata). PostgreSQL JSONB would work but Mongoose gives a cleaner document model. Risk analysis records are append-only analytical data with no relational joins needed.

### Why not store AI provider keys in env vars?
Switching AI providers requires a code change + redeployment if keys are in env. Storing in MongoDB with AES-256-GCM encryption lets admins switch providers from the UI without touching infrastructure. The encryption key itself is in env (`ENCRYPTION_KEY`).

### Why HMAC-SHA256 for webhooks instead of mTLS?
HMAC is the industry standard (Stripe, GitHub, Shopify all use it). It's stateless, doesn't require certificate management, and can be verified with a single line of code in any language. mTLS would be architecturally more complex without adding meaningful security for this use case.

### Why SHA-256 for API key hashing instead of bcrypt?
API keys are high-entropy random strings (not user-chosen passwords), so the dictionary attack protection of bcrypt is unnecessary. SHA-256 is deterministic and fast — validation doesn't need bcrypt's intentional slowness.

### Why role-aware AI prompts instead of one universal prompt?
Super admins need tenant comparison context. Tenant users need personal event context. Google users need cross-tenant aggregation. One universal prompt would be either too vague (low quality) or expose inappropriate context (security risk).

---

## 5. Remaining Roadmap — Priority Order

### P0 — Next Up (AI Chat completion)

| Item | What | Effort |
|---|---|---|
| P18-7 | AI Chat inline citations — regex-detect event counts, linkify to `/events?filter=...` | S |
| P18-8 | Toast system — install `sonner`, replace all silent failures and `alert()` calls | M |
| P18-9 | Action toasts — "Chain verified ✓ 247 events", "Webhook delivered ✓ [View]" | S |
| P18-10 | Critical risk toast — SSE push on CRITICAL event, slide-in with View + Mute 1h | M |

### P0 — Empty States

| Item | What | Design? |
|---|---|---|
| P18-11 | Events page — hash-chain illustration + "Connect your first app" CTA | 🎨 |
| P18-12 | Filtered no results — "No CRITICAL events in last 7 days — that's good news. [Clear filters]" | No |
| P18-13 | Risk Alerts waiting state — while AI analysis is running | 🎨 |

### P1 — Big Humanisation Wins

| Item | What | Dissertation Value | Design? |
|---|---|---|---|
| P18-14 | First-run onboarding wizard — connect app → webhook → watch event arrive live | High | 🎨 |
| P18-15 | Command palette (⌘K) — search events, jump pages, run actions | Medium | No |
| P18-16 | Privacy timeline heatmap — event density × hour-of-day × tenant | High | 🎨 |
| P18-17 | Sankey diagram — Tenants → Actions → Data Fields → Third Parties | Very High | 🎨 |
| P18-18 | Field-level trust scores — per data field mini-card with week-over-week delta | High | 🎨 |
| P18-19 | Risk Alert investigation view — evidence + AI reasoning + action stack + status pipeline | Very High | 🎨 |
| P18-20 | GDPR Rights timeline — export/deletion requests in a visual timeline | Medium | No |
| P18-21 | Consent receipts — hash-chained receipt per consent toggle change | High | No |
| P18-22 | DPC complaint letter templates — pre-drafted for each GDPR article | Medium | No |

### P2 — Polish

| Item | What |
|---|---|
| P18-23 | Live event slide-in — gradient sweep animation, sidebar counter increments |
| P18-24 | Density toggle — Comfortable / Compact / Spacious |
| P18-25 | Mobile responsive layout — collapsible sidebar, stacked cards |
| P18-26 | Trust-building micro-copy — "247 times apps touched your data" not "Total: 247" |
| P18-27 | Export preview card — shows event count + size estimate before download |
| P18-28 | Settings — sessions list + "Sign out everywhere" |
| P18-29 | Settings — notification preferences |
| P18-30 | Print-friendly PDF — extend existing PDF with gauge + alert cards |

### P3 — Dissertation Hero Shots

| Item | What | Why It Matters |
|---|---|---|
| P18-31 | Privacy Timeline page — vertical scrubbable timeline, Apple Health style | Memorable screenshot |
| P18-32 | Tenant comparison page — HealthTrack vs ConnectSocial side-by-side | Shows multi-tenancy |
| P18-33 | Verifiable GDPR receipt — public URL, verify hash chain without seeing data | Academically novel |
| P18-34 | AI agent mode — AI drafts deletion/consent/DPC actions, queued for 1-click approval | Unique in privacy space |

---

## 6. Features That Were Deliberately Scoped Out

| Feature | Why Excluded |
|---|---|
| Email notifications (Mailtrap) | SMTP not configured on Render; graceful no-op; not needed for demo |
| Google OAuth on Render | Requires Google Cloud project setup; admin login covers demo needs |
| DB backup scripts | Nice-to-have safety net; not a dissertation requirement |
| Real-time WebSocket events | SSE covers the live badge use case; WebSockets add complexity without narrative benefit |
| Multi-region compliance | Single Render region; GDPR regional routing is a real-world production concern beyond dissertation scope |

---

## 7. Demo Narrative (Dissertation Presentation)

**Recommended 30-minute flow:**

1. **Login as tenant user** (HealthTrack patient) → show personal data timeline
2. **Walk the event feed** — SHA-256 hash visible in expanded view; "This is tamper-evident proof your data wasn't altered"
3. **Open AI Chat** → free-form question → watch streaming tokens + thinking steps
4. **Run `/verify`** → chain-verify card → "Every event cryptographically linked"
5. **Run `/compare`** → week-over-week card → "Trust score changed from B to A"
6. **Open Risk Alerts** → AI-generated findings citing GDPR articles
7. **GDPR Rights** → show export request → async processing → download
8. **Switch to super admin** → Dev page → trigger analysis → show queue monitor
9. **Show Onboard wizard** → register new tenant → paste API key → send test event → live event arrives
10. **Show Swagger** → professional API documentation

---

## 8. Forward Research Questions (Post-Dissertation)

These are open questions that could become follow-on research or a production MVP:

1. **Privacy calculus** — can the trust score be formally derived from a GDPR compliance framework rather than hand-tuned weights?
2. **Cross-organisation benchmarking** — what does "good" look like for a consent rate? Need an anonymised industry baseline.
3. **AI agent delegation** — what's the right UX for a user approving AI-drafted privacy actions? (P18-34)
4. **Verifiable receipts at scale** — the public receipt URL concept (P18-33) could become a W3C Verifiable Credential
5. **SDK adoption friction** — what prevents real tenants from integrating? Two-line install vs full instrumentation guides
6. **GDPR Art.22 automated decisions** — should the AI risk agent trigger automated opt-outs when it detects a violation?
