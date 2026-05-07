# DataGuard — System Architecture

> Last updated: 2026-05-08
> This document is the authoritative technical architecture reference. Start here to understand how any part of the system works.

---

## 1. Repository Layout (Mono-Repo)

```
privacy-audit/
├── privacy-audit-backend/     NestJS API (port 8080)
├── privacy-audit-frontend/    React dashboard (port 3000)
├── privacy-audit-sdk/
│   ├── go/                    Go SDK
│   ├── python/                Python SDK
│   └── js/                    JS/TS SDK
├── privacy-health-tenant/     Demo health app (Go backend 8081, React frontend 3001)
├── privacy-social-media-tenant/ Demo social app (FastAPI 8082, React frontend 3002)
├── privacy-audit-infra/       Docker Compose (all 9 services)
├── MASTER_PLAN.md
├── ARCHITECTURE.md            (this file)
├── PRODUCT.md
├── PROGRESS_TRACKER.md
└── DEPLOY.md
```

---

## 2. Five-Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 5 — CLIENTS                                                │
│  Tenant Apps: HealthTrack (Go), ConnectSocial (FastAPI)           │
│  Privacy Dashboard: React (Vite + MUI + Recharts)                 │
│  SDK consumers: Go / Python / JS/TS                               │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────────┐
│  LAYER 4 — API GATEWAY (NestJS, port 8080)                        │
│  Auth: API Key (events) + JWT (admin/tenant) + Google OAuth       │
│  Guards: ApiKeyGuard, JwtAuthGuard, DashboardAnyGuard             │
│  Rate limiting: @nestjs/throttler (10/1s, 200/min per IP)         │
│  Swagger: /api/docs                                               │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│  LAYER 3 — CORE SERVICES                                          │
│  Event Ingestor → BullMQ queue → AuditEventProcessor             │
│  AiOrchestrationService (Claude / Gemini / OpenAI, switchable)    │
│  AiChatService (streaming SSE, slash commands, session storage)   │
│  RiskService (6h cron, LLM anomaly detection)                     │
│  ExportService (GDPR Art.20, async, expiring URL)                 │
│  DeletionService (GDPR Art.17, hard delete, evidence hash)        │
│  RetentionService (daily cron, per-tenant purge)                  │
│  WebhookService (HMAC-SHA256 signed delivery)                     │
│  BreachService (GDPR Art.33 72h countdown)                        │
│  NotificationsService (MongoDB push + bell badge)                 │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│  LAYER 2 — DATA LAYER                                             │
│  PostgreSQL — audit_events, tenants, users, exports, deletions,   │
│               risk_alerts, webhooks, consents, linked_accounts    │
│  MongoDB Atlas — ai_chat_sessions, ai_analysis_records,           │
│                  ai_provider_settings, notifications              │
│  Redis (BullMQ) — audit-events queue                              │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│  LAYER 1 — INTELLIGENCE                                           │
│  Multi-provider AI (Claude 3.5 / Gemini Flash / GPT-4o)           │
│  Role-aware context injection, SSE token streaming                │
│  SHA-256 hash chain verification in AI chat                       │
│  LLM-generated GDPR letters, risk analysis, privacy summaries     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication — Three Tiers

### Tier 1: Tenant App → Audit Service (Machine-to-Machine)
- Header: `x-api-key: pak_xxxxx`
- `ApiKeyGuard` validates against SHA-256 hash in tenants table
- Resolves tenant context, attaches to `req.tenant`
- Used for: `POST /events` (event ingestion)

### Tier 2: Tenant Admin → Audit Service
- `POST /auth/login` → JWT (`tenant_admin` or `super_admin` role)
- `JwtAuthGuard` + `RolesGuard` on admin-only endpoints

### Tier 3: End User → Privacy Dashboard (two sub-types)

#### 3a. Tenant Session (demo login)
```
User selects tenant + enters userId
→ Tenant app calls POST /dashboard/token (API key auth) → 15-min handshake JWT
→ Frontend receives token via /auth/redirect
→ POST /dashboard/session → 8h session JWT (type: dashboard_session)
→ All dashboard API calls: Authorization: Bearer <session_token>
```

#### 3b. Google OAuth Session
```
User clicks "Sign in with Google"
→ GET /auth/google → redirect to Google
→ GET /auth/google/callback → creates/finds dashboard_users record
→ Issues JWT (type: google_session)
→ User links tenant apps via POST /dashboard/link-account
```

`DashboardAnyGuard` accepts both `dashboard_session` and `google_session` JWTs.

---

## 4. Four User Types

| Type | Auth | Role in JWT | What they see |
|---|---|---|---|
| Super Admin | email/password JWT | `super_admin` | Everything — all tenants, dev controls, queue, onboarding |
| Tenant Admin | email/password JWT | `tenant_admin` | Their tenant's events, risk alerts, webhooks, queue |
| Google User | Google OAuth JWT | `google_session` | Their linked apps' events, connected apps management |
| Tenant User | Tenant handshake JWT | `dashboard_session` | Their own events, GDPR rights (export/delete/consent) |

Frontend role helpers in `AuthContext.tsx`:
```typescript
isSuperAdmin(user)   // role === 'super_admin'
isTenantAdmin(user)  // role === 'tenant_admin'
isGoogleUser(user)   // type === 'google_session'
isEndUser(user)      // type === 'dashboard_session'
```

---

## 5. Sidebar Navigation Matrix

| Nav Item | Super Admin | Tenant Admin | Google User | Tenant User |
|---|---|---|---|---|
| Overview | ✅ | ✅ | ✅ | ✅ |
| Audit Events | ✅ | ✅ | ✅ | ✅ |
| Risk Alerts | ✅ | ✅ | ❌ | ❌ |
| GDPR Rights | ✅ | ✅ | ✅ | ✅ |
| Webhooks | ✅ | ✅ | ❌ | ❌ |
| Connected Apps | ✅ | ❌ | ✅ | ❌ |
| Onboard Tenant | ✅ | ❌ | ❌ | ❌ |
| Queue Monitor | ✅ | ✅ | ❌ | ❌ |
| Dev / Demo | ✅ | ❌ | ❌ | ❌ |
| AI Chat | ✅ | ✅ | ✅ | ✅ |
| User Guide | ✅ | ✅ | ✅ | ✅ |

---

## 6. SHA-256 Hash Chain

Every audit event is cryptographically linked to the previous one:

```
Event N:
  hash = SHA256(
    eventId + action + dataFields + sensitivity +
    consentObtained + occurredAt + tenantId + prevHash
  )
  prevHash = hash of event N-1 (null for first event)
```

Verification (`GET /events/verify-chain`):
1. Fetch all events for tenant ordered by `occurredAt`
2. Walk the chain: recompute each hash, compare against stored value
3. Check each `prevHash` points to the previous event's `hash`
4. Return: `{ valid: boolean, checkedCount: number, firstInvalidAt?: string }`

The AI chat `/verify` slash command replicates this logic inline in `AiChatService.streamMessage()`.

---

## 7. AI Orchestration — Multi-Provider

All AI calls route through `AiOrchestrationService`:

```typescript
// One interface, three providers
aiService.chat(messages)      // sync response
aiService.streamChat(messages) // async generator → token stream
aiService.analyse(prompt)     // alias for chat, used by risk agent
```

Active provider is stored in MongoDB (`ai_provider_settings` collection):
```json
{ "provider": "gemini", "model": "gemini-flash-latest", "isActive": true, "encryptedApiKey": "..." }
```

API keys are encrypted at rest with AES-256-GCM. `ENCRYPTION_KEY` env var must be 32 chars.

Fallback chain if no DB provider:
1. Check MongoDB for active provider
2. Fall back to `ANTHROPIC_API_KEY` env var + Claude

Provider-specific adapters:
- **Claude**: `client.messages.stream()` from `@anthropic-ai/sdk`
- **Gemini**: `chat.sendMessageStream()` from `@google/generative-ai`
- **OpenAI**: `openai.chat.completions.create({ stream: true })`

---

## 8. AI Chat — SSE Streaming Architecture

### Protocol

```
POST /api/dashboard/ai-chat/stream
Authorization: Bearer <session_token>
Content-Type: application/json

Body: { message: string, sessionId?: string }

Response stream (text/event-stream):
  event: step\ndata: {"label":"Fetching audit context","status":"active"}\n\n
  event: step\ndata: {"label":"Fetching audit context","status":"done"}\n\n
  event: token\ndata: {"text":"Based on your "}\n\n
  event: token\ndata: {"text":"recent events..."}\n\n
  event: card\ndata: {"type":"chain-verify","valid":true,"checkedCount":247,...}\n\n
  event: followups\ndata: {"suggestions":["What does this mean?","Show all events"]}\n\n
  event: done\ndata: {"sessionId":"abc123"}\n\n
```

### Why POST + fetch (not native EventSource)

`EventSource` is browser-native SSE but only supports GET and no custom headers.
Auth requires `Authorization: Bearer ...` which is a custom header.
Solution: use `fetch()` with `ReadableStream` consumer — supports POST, custom headers, abort signal.

```typescript
// Frontend: api/client.ts
streamChat: async function* (message, sessionId, signal) {
  const res = await fetch(`${BASE}/api/dashboard/ai-chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, sessionId }),
    signal,
  });
  // Buffer-based SSE parser — handles chunked delivery
  const reader = res.body.getReader();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n'); buf = parts.pop() ?? '';
    for (const block of parts) {
      // parse event: and data: lines, yield { type, data }
    }
  }
}
```

### Slash Commands

```
/verify  → recomputes SHA-256 hash chain → chain-verify card
/compare → last 7d vs prev 7d metrics   → comparison card
/explain → AI streaming with steps      → markdown stream
/draft   → AI GDPR letter (JSON)        → draft card
/report  → alias for /explain
```

### Session Persistence

- `sessionId` stored in `localStorage` as `dg_chat_session`
- Session messages saved to MongoDB `ai_chat_sessions` after stream completes
- History loads via `GET /dashboard/ai-chat/sessions/:id`
- `GET /dashboard/ai-chat/history?page=1&limit=20` for sessions list

---

## 9. Event Queue — BullMQ + Redis

```
POST /events (API key auth)
    │
    └→ EventsController.ingest()
         │
         └→ auditEventsQueue.add('audit-event', payload, { attempts: 3, backoff: 'exponential' })
              │
              └→ AuditEventProcessor.process()
                   ├── Deduplication: reject if event_id already in DB
                   ├── Hash chain: fetch last event, compute SHA-256
                   └── Save to PostgreSQL
```

Queue health: `GET /dev/queue-status` → waiting/active/completed/failed/delayed counts.

Redis must be configured with `maxmemory-policy noeviction` (not lru) to prevent BullMQ data loss.

---

## 10. AI Risk Agent — Automated Compliance Monitoring

Cron: every 6 hours (`0 */6 * * *`)

```
RiskService.runAnalysis()
  ├── Fetch all tenants
  ├── Per tenant: fetch last 100 events
  ├── Build prompt: events JSON + GDPR article references + severity thresholds
  ├── Call aiService.analyse(prompt) → JSON output enforced
  ├── Parse findings (severity: LOW/MEDIUM/HIGH/CRITICAL, gdprArticle, explanation, suggestedAction)
  ├── Save to risk_alerts (PostgreSQL)
  ├── Save full analysis to ai_analysis_records (MongoDB)
  ├── Trigger notifications for HIGH/CRITICAL
  └── Send email to tenant admin (if SMTP configured)
```

Risk prompt enforces structured JSON output:
```json
{
  "findings": [
    {
      "severity": "HIGH",
      "gdprArticle": "Art.6(1)(f) — legitimate interest",
      "explanation": "...",
      "suggestedAction": "...",
      "eventIds": ["uuid1", "uuid2"]
    }
  ]
}
```

---

## 11. GDPR Workflows

### Export (Article 20 — Right to Portability)
```
POST /dashboard/exports
  └→ ExportRequest created (status: requested)
  └→ Background job:
       ├── Collect all events for tenantUserId
       ├── Serialise to JSON
       ├── Base64 encode and store in export_requests.data
       ├── Set expiry (24h)
       └→ Status: completed + download_url set

GET /dashboard/exports/:id          check status
GET /dashboard/exports/:id/download returns file (410 Gone if expired)
```

### Deletion (Article 17 — Right to Erasure)
```
POST /dashboard/deletions
  └→ DeletionRequest created (status: requested)
  └→ Background job:
       ├── Hard-delete all audit_events for tenantUserId
       ├── Compute evidence hash: SHA256(deletedCount + tenantUserId + timestamp)
       ├── Store evidence_ref
       └→ Status: completed
```

### Consent (Article 7 — Withdrawal)
```
POST /api/consents   { tenantId, userId, dataType, granted: bool }
GET  /api/consents/:userId

7 consent categories: analytics, ad_targeting, third_party_sharing,
                      profiling, location_data, biometric_data, health_data
```

---

## 12. Webhook System

```
POST /webhooks   { url, secret, events: ['risk.alert.critical'] }

On HIGH/CRITICAL risk alert:
  WebhookService.deliver()
    ├── Build payload: { event: 'risk.alert', severity, tenantId, findings, timestamp }
    ├── Compute HMAC-SHA256(secret, payload) → X-Signature-256 header
    └── fetch(url, { signal: AbortSignal.timeout(8000) })
```

Recipients can verify: `HMAC-SHA256(known_secret, raw_body) === X-Signature-256`

---

## 13. Notifications System

```
Trigger sources:
  HIGH/CRITICAL risk alert → create notification (risk_alert type)
  Breach report submitted  → (planned) create notification

Storage: MongoDB notifications collection
Fields: userId, type, title, message, read, createdAt

Frontend:
  Bell icon in Topbar polls GET /dashboard/notifications/unread-count every 60s
  NotificationsDrawer: slides in, lists all, marks read via PUT /dashboard/notifications/:id/read
```

---

## 14. PostgreSQL Schema — Key Tables

### audit_events
| Column | Type | Key |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants | isolation key |
| tenant_user_id | VARCHAR | which end-user |
| event_id | UUID UNIQUE | idempotency |
| action_code | VARCHAR | READ/WRITE/SHARE/DELETE/EXPORT/ANALYSE |
| data_fields | JSONB | ["email", "location"] |
| sensitivity_code | VARCHAR | LOW/MEDIUM/HIGH/CRITICAL |
| third_party_involved | BOOLEAN | |
| consent_obtained | BOOLEAN | |
| prev_hash | VARCHAR | SHA-256 of previous event |
| hash | VARCHAR | SHA-256 of this event |
| occurred_at | TIMESTAMP | |

### risk_alerts
| Column | Type |
|---|---|
| id | UUID PK |
| tenant_id | UUID FK |
| event_id | UUID FK nullable |
| severity | VARCHAR |
| explanation | TEXT |
| suggested_action | TEXT |
| gdpr_article | VARCHAR |
| created_at | TIMESTAMP |

### tenants
| Column | Type |
|---|---|
| id | UUID PK |
| name | VARCHAR |
| email | VARCHAR UNIQUE |
| api_key_hash | VARCHAR (SHA-256) |
| retention_days | INT (default 90) |
| is_active | BOOLEAN |

---

## 15. MongoDB Collections

### ai_chat_sessions
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "provider": "gemini",
  "model": "gemini-flash-latest",
  "messages": [
    { "role": "user", "content": "...", "timestamp": "ISODate" },
    { "role": "assistant", "content": "...", "timestamp": "ISODate" }
  ],
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### ai_analysis_records
```json
{
  "_id": "ObjectId",
  "tenantId": "string",
  "providerUsed": "gemini",
  "model": "gemini-flash-latest",
  "eventSamples": [...],
  "findings": [...],
  "createdAt": "ISODate"
}
```

### ai_provider_settings
```json
{
  "_id": "ObjectId",
  "provider": "gemini|claude|openai",
  "model": "gemini-flash-latest",
  "encryptedApiKey": "hex:iv:ciphertext",
  "isActive": true,
  "label": "Gemini Flash"
}
```

### notifications
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "type": "risk_alert|breach",
  "title": "string",
  "message": "string",
  "read": false,
  "createdAt": "ISODate"
}
```

---

## 16. Frontend — Page Routes

| Route | Component | Auth | User Types |
|---|---|---|---|
| `/login` | Login.tsx | Public | All |
| `/auth/redirect` | AuthRedirect.tsx | Public | All |
| `/auth/google/callback` | AuthRedirect.tsx | Public | All |
| `/dashboard` | Dashboard.tsx | Private | All |
| `/events` | EventsPage.tsx | Private | All |
| `/risk` | RiskPage.tsx | Private | Admin + TenantAdmin |
| `/gdpr` | GDPRPage.tsx | Private | All |
| `/webhooks` | Webhooks.tsx | Private | Admin + TenantAdmin |
| `/settings` | SettingsPage.tsx | Private | All |
| `/ai-settings` | SettingsPage.tsx | Private | All (alias) |
| `/dev` | DevPage.tsx | Private | SuperAdmin only |
| `/queue` | QueuePage.tsx | Private | Admin + TenantAdmin |
| `/connected-apps` | ConnectedAppsPage.tsx | Private | SuperAdmin + GoogleUser |
| `/onboard` | Onboard.tsx | Private | SuperAdmin |
| `/guide` | GuidePage.tsx | Private | All |
| `/ai-chat` | AIChatPage.tsx | Private | All |

---

## 17. Frontend — State Architecture

```
AuthContext (React Context)
  ├── user: SessionUser | null
  ├── isAuthenticated: boolean
  ├── login(token) / logout()
  └── Auto-expiry check on mount

ThemeContext (React Context)
  ├── isDark: boolean
  └── toggle()

useAIChat (custom hook, per-component)
  ├── messages: ChatMessage[]
  ├── streaming: boolean
  ├── sessionId: string (localStorage: dg_chat_session)
  ├── historyOpen: boolean
  ├── sessions: ChatSession[]
  ├── send(message) — consumes SSE
  ├── loadSession(id) — restores past session
  └── newChat() — clears state + localStorage
```

---

## 18. API Client — `src/api/client.ts`

All API calls go through the Axios instance with auth interceptor:
```typescript
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('session_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

`streamChat()` bypasses Axios (uses native fetch) because Axios doesn't support streaming response bodies.

Key API groups:
- `dashboardApi` — events, risk, GDPR, AI chat, exports, deletions
- `notificationsApi` — bell badge, notifications drawer
- `devApi` — dev controls (seed, trigger analysis, queue status)
- `aiSettingsApi` — provider management
- `tenantsApi` — tenant registration, onboarding status

---

## 19. Live Deployment (Render)

| Service | URL | Platform |
|---|---|---|
| Backend | `audit-backend-ddew.onrender.com` | Render Web Service |
| Frontend | Render Static Site | Render |
| PostgreSQL | Render Postgres (free) | Render |
| Redis | Render Redis (free) | Render |
| MongoDB | Atlas M0 (free) | MongoDB Atlas |

Key env vars:
- `JWT_SECRET` — signs all JWTs
- `ENCRYPTION_KEY` — AES-256-GCM for API key encryption (32 chars)
- `DEV_TOKEN` — protects `/dev/*` endpoints
- `MONGODB_URI` — Atlas connection string
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — seeded on startup
- `VITE_API_URL` — set in frontend build (Render static site)

---

## 20. Full API Endpoint Reference

### Tenant & Auth
```
POST   /api/tenants/register                       create tenant + admin user, returns API key
GET    /api/tenants/:id/onboarding-status           hasEvents, eventCount, dashboardReady
POST   /api/auth/login                             email/password → JWT
GET    /api/auth/google                            OAuth redirect
GET    /api/auth/google/callback                   OAuth callback, issues google_session JWT
GET    /api/health                                 DB + Redis health check
```

### Event Ingestion (`x-api-key` header)
```
POST   /api/events                                 ingest event (202 Accepted, queued)
GET    /api/events                                 list events for tenant
GET    /api/events/verify-chain                    verify SHA-256 hash chain integrity
```

### Dashboard (Bearer JWT — DashboardAnyGuard)
```
POST   /api/dashboard/token                        tenant app issues 15-min handshake token
POST   /api/dashboard/session                      exchange handshake → 8h session JWT
GET    /api/dashboard/events                       audit events for authenticated user
GET    /api/dashboard/risk-alerts                  AI-generated privacy risk alerts
GET    /api/dashboard/privacy-score                0-100 health score + grade + breakdown
POST   /api/dashboard/exports                      request GDPR Art.20 data export (202)
GET    /api/dashboard/exports/:id                  poll export status
GET    /api/dashboard/exports/:id/download         download JSON (410 Gone if expired)
POST   /api/dashboard/deletions                    request GDPR Art.17 erasure (202)
GET    /api/dashboard/deletions/:id                poll deletion status + deleted count
GET    /api/dashboard/compliance-report/download   PDF Art.30 compliance report
POST   /api/dashboard/ai-chat                      send AI chat message (sync, legacy)
POST   /api/dashboard/ai-chat/stream               send message, stream SSE response
GET    /api/dashboard/ai-chat/history              paginated chat session list
GET    /api/dashboard/ai-chat/sessions/:id         load past session messages
GET    /api/dashboard/ai-analysis                  AI risk analysis history (MongoDB)
POST   /api/dashboard/breach-report                start 72h GDPR Art.33 countdown
GET    /api/dashboard/breach-report                list breach reports
POST   /api/dashboard/breach-report/:id/notify     simulate regulator notification
POST   /api/dashboard/link-account                 link Google identity to tenant account
GET    /api/dashboard/linked-accounts              list linked tenant apps
DELETE /api/dashboard/linked-accounts/:id          unlink a tenant account
GET    /api/dashboard/gdpr/requests                all GDPR requests (admin view)
GET    /api/dashboard/notifications                list user notifications
GET    /api/dashboard/notifications/unread-count   unread count (bell badge, polled 60s)
PUT    /api/dashboard/notifications/:id/read       mark notification as read
GET    /api/dashboard/tenants/available            tenants available for linking
GET    /api/dashboard/tenants/all                  all tenants (super admin)
```

### Consents (GDPR Art.7)
```
POST   /api/consents                               set/revoke consent for a data type
GET    /api/consents/:userId                       all consent records (with defaults)
```

### Webhooks
```
POST   /api/webhooks                               register endpoint, returns signing secret
GET    /api/webhooks                               list active webhooks (secrets hidden)
DELETE /api/webhooks/:id                           deactivate webhook
```

### Dev Tools (`x-dev-token` header required)
```
POST   /api/dev/trigger-risk-analysis              run AI risk analysis now
POST   /api/dev/trigger-retention                  run data retention purge now
POST   /api/dev/trigger-weekly-digest              send weekly email digest now
POST   /api/dev/seed-events                        inject 20 demo events { tenantId }
GET    /api/dev/queue-status                       BullMQ queue depth + health flag
GET    /api/dev/ai-providers                       list configured AI providers
POST   /api/dev/ai-providers                       add provider (Claude/Gemini/OpenAI)
PUT    /api/dev/ai-providers/:id/activate          switch active AI provider
DELETE /api/dev/ai-providers/:id                   remove provider
GET    /api/dev/ai-providers/active                show currently active provider
```

---

## 21. Complexity Feature Matrix (Dissertation Value)

| Feature | Files | Academic Relevance |
|---|---|---|
| Multi-tenant isolation | Every service/query | Architecture, security |
| SHA-256 hash chaining | `audit-event.processor.ts`, `ai-chat.service.ts` | Cryptography, tamper-evidence |
| Async BullMQ queue | `queue/`, `events.controller.ts` | Distributed systems |
| GDPR export workflow | `exports/` | Legal compliance, state machine |
| GDPR deletion workflow | `deletions/` | Legal compliance, soft delete |
| Google OAuth + linking | `auth/strategies/`, `dashboard-users/` | OAuth 2.0, cross-service identity |
| Multi-provider AI streaming | `ai-orchestration/`, `ai-chat/` | AI integration, SSE protocol |
| HMAC-signed webhooks | `webhooks/` | Security, event-driven architecture |
| LLM risk agent (6h cron) | `risk/` | AI/ML, automated compliance |
| PDF compliance reports | `dashboard.controller.ts` | Document generation |
| Per-tenant retention cron | `retention/` | GDPR Art.5(1)(e), policy automation |
| Consent management | `consents/` | GDPR Art.7 |
| Breach simulation | `breach/` | GDPR Art.33, incident response |
| SDK in 3 languages | `privacy-audit-sdk/` | Cross-language API design |
| Full Docker Compose | `privacy-audit-infra/` | DevOps, microservice orchestration |
| Real SSE streaming chat | `ai-chat/`, `AIChat/` | Real-time protocols, frontend streaming |
