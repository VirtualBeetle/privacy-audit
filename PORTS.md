# Master Ports & Endpoints Reference
# Privacy Audit and Data Transparency Service — Final State (All 14 Phases)

> Single source of truth for all ports, URLs, credentials, and key endpoints.

---

## Port Map — One-Command Startup

Run everything from the **repo root**:

```bash
./start.sh        # auto-copies .env, starts all services, prints health table
# OR
make start
```

| Service | URL | Port |
|---|---|---|
| **Privacy Dashboard** (React) | http://localhost:3000 | 3000 |
| **Audit REST API** (NestJS) | http://localhost:8080/api | 8080 |
| **Swagger / API Docs** | http://localhost:8080/api/docs | 8080 |
| **HealthTrack App** (Go + React) | http://localhost:3001 | 3001 |
| **HealthTrack API** | http://localhost:8081/api | 8081 |
| **ConnectSocial App** (FastAPI + React) | http://localhost:3002 | 3002 |
| **ConnectSocial API** | http://localhost:8082/api | 8082 |
| PostgreSQL — Audit | localhost:5432 | 5432 |
| PostgreSQL — Health | localhost:5433 | 5433 |
| PostgreSQL — Social | localhost:5435 | 5435 |
| Redis (BullMQ) | localhost:6379 | 6379 |
| MongoDB (AI Chat) | localhost:27017 | 27017 |

---

## Privacy Dashboard — Key Pages

| Page | URL | Auth Required |
|---|---|---|
| Login (email or Google) | http://localhost:3000/login | No |
| Onboarding Wizard | http://localhost:3000/onboard | No |
| Main Dashboard | http://localhost:3000/dashboard | Yes |
| Webhook Management | http://localhost:3000/webhooks | Yes |

---

## Audit API — Full Endpoint Reference

### Tenant & Auth
```
POST   /api/tenants/register          → create tenant + admin user + API key
GET    /api/tenants/:id/onboarding-status   → hasEvents, eventCount, dashboardReady
POST   /api/auth/login                → email/password → JWT
GET    /api/auth/google               → OAuth redirect
GET    /api/auth/google/callback      → OAuth callback
GET    /api/health                    → DB + Redis health check
```

### Event Ingestion (x-api-key)
```
POST   /api/events                    → ingest event (202 Accepted, queued)
GET    /api/events                    → list events for tenant
GET    /api/events/verify-chain       → verify SHA-256 hash chain integrity
```

### Dashboard (Bearer JWT)
```
POST   /api/dashboard/token           → issue 15-min handshake token (API key auth)
POST   /api/dashboard/session         → exchange handshake → 8h session JWT
GET    /api/dashboard/events          → audit events for authenticated user
GET    /api/dashboard/risk-alerts     → AI-generated privacy risk alerts
GET    /api/dashboard/privacy-score   → 0-100 health score + grade + breakdown
POST   /api/dashboard/exports         → request GDPR Art.20 data export (202)
GET    /api/dashboard/exports/:id     → poll export status
GET    /api/dashboard/exports/:id/download  → download JSON export
POST   /api/dashboard/deletions       → request GDPR Art.17 erasure (202)
GET    /api/dashboard/deletions/:id   → poll deletion status
GET    /api/dashboard/compliance-report/download → PDF Art.30 compliance report
POST   /api/dashboard/ai-chat         → send AI chat message (context-aware)
GET    /api/dashboard/ai-chat/history → paginated chat session history
GET    /api/dashboard/ai-analysis     → AI risk analysis history (MongoDB)
POST   /api/dashboard/breach-report   → report breach, starts 72h GDPR Art.33 countdown
GET    /api/dashboard/breach-report   → list breach reports
POST   /api/dashboard/breach-report/:id/notify → simulate regulator notification
POST   /api/dashboard/link-account    → link Google identity to tenant account
GET    /api/dashboard/linked-accounts → list linked tenant apps (google_session)
```

### Consents (GDPR Art.7)
```
POST   /api/consents                  → set/revoke consent for a data type
GET    /api/consents/:userId          → get all consent records (with defaults)
```

### Webhooks
```
POST   /api/webhooks                  → register endpoint (returns signing secret)
GET    /api/webhooks                  → list active webhooks (secrets hidden)
DELETE /api/webhooks/:id              → deactivate webhook
```

### Dev Tools (x-dev-token header required)
```
POST   /api/dev/trigger-risk-analysis → run AI risk analysis now
POST   /api/dev/trigger-retention     → run data retention purge now
POST   /api/dev/trigger-weekly-digest → send weekly email digest now
POST   /api/dev/seed-events           → inject 20 demo events { tenantId }
GET    /api/dev/queue-status          → BullMQ queue depth + health
GET    /api/dev/ai-providers          → list configured AI providers
POST   /api/dev/ai-providers          → add AI provider (Claude/Gemini/OpenAI)
PUT    /api/dev/ai-providers/:id/activate → switch active AI provider
DELETE /api/dev/ai-providers/:id      → remove provider
GET    /api/dev/ai-providers/active   → show currently active provider
```

---

## Demo Credentials

### HealthTrack Tenant
| Role | Email | Password |
|---|---|---|
| Doctor | sarah.mitchell@healthdemo.com | doctor123 |
| Patient | james.obrien@demo.com | patient123 |
| Patient | aoife.byrne@demo.com | patient123 |
| Patient | conor.walsh@demo.com | patient123 |

### ConnectSocial Tenant
| Role | Email | Username | Password |
|---|---|---|---|
| Admin | admin@socialdemo.com | admin | admin123 |
| User | emma.thornton@demo.com | emma_writes | user123 |
| User | luca.marino@demo.com | luca_dev | user123 |
| User | priya.k@demo.com | priya_k | user123 |

---

## Required Environment Variables (.env)

Copy `privacy-audit-infra/.env.example` → `privacy-audit-infra/.env`:

```bash
cp privacy-audit-infra/.env.example privacy-audit-infra/.env
```

| Variable | Notes |
|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` — AES-256 for AI keys in MongoDB |
| `MONGODB_URI` | `mongodb://mongo:27017/privacy_audit_ai` (Docker default) |
| `ANTHROPIC_API_KEY` | From console.anthropic.com — fallback AI provider |
| `GOOGLE_CLIENT_ID/SECRET` | From Google Cloud Console (OAuth only) |
| `SMTP_HOST/PORT/USER/PASS` | Mailtrap recommended for local dev |
| `FROM_EMAIL` | Sender address for email notifications |
| `DEV_TOKEN` | Any secret — required for `/api/dev/*` endpoints |
| `HEALTH_AUDIT_API_KEY` | Must match what health tenant sends in `x-api-key` |
| `SOCIAL_AUDIT_API_KEY` | Must match what social tenant sends in `x-api-key` |

---

## Demo Day Quick Triggers

```bash
export DEV_TOKEN=dev-secret-change-me   # matches your .env

# Seed 20 realistic events for a tenant (get tenantId from register response)
curl -X POST http://localhost:8080/api/dev/seed-events \
  -H "Content-Type: application/json" \
  -H "x-dev-token: $DEV_TOKEN" \
  -d '{"tenantId": "<paste-tenant-id-here>"}'

# Run AI risk analysis immediately
curl -X POST http://localhost:8080/api/dev/trigger-risk-analysis \
  -H "x-dev-token: $DEV_TOKEN"

# Send weekly email digest now
curl -X POST http://localhost:8080/api/dev/trigger-weekly-digest \
  -H "x-dev-token: $DEV_TOKEN"

# Or use the Makefile shortcuts:
make dev-seed-events TENANT_ID=<uuid>
make dev-analysis
make dev-digest
```

Or run the full demo in one shot:
```bash
./scripts/demo-onboard.sh              # registers tenant → 5 events → prints URLs
```

---

## Events Fired by Demo Tenants

### HealthTrack (Go SDK)
| Action | Sensitivity | Trigger |
|---|---|---|
| READ | HIGH | Doctor views patient profile |
| READ | CRITICAL | Doctor views medical records |
| READ | MEDIUM | Insurance details accessed |
| EXPORT | HIGH | Patient requests data export |
| DELETE | HIGH | Patient requests account deletion |

### ConnectSocial (Python SDK)
| Action | Actor | Sensitivity | Trigger |
|---|---|---|---|
| READ | system | MEDIUM | Feed loads |
| READ | system | HIGH | Ad targeting data access |
| READ | other_user | LOW | User searched |
| READ | third_party | MEDIUM | Post detail viewed |
| SHARE | data_broker | HIGH | Check-in created |
| EXPORT | system | HIGH | Data export requested |
| DELETE | system | HIGH | Account deletion requested |
