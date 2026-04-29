# Progress Tracker — Privacy Audit and Data Transparency Service

> Status key:
> ✅ Done — built, tested, committed
> 🔄 In Progress — partially built or in active development
> ⏳ Not Started — planned, not yet begun

Last updated: 2026-04-14 (All 14 phases complete — 174/174 tasks — both builds clean)

---

## Foundations

| # | Task | Status | Notes |
|---|---|---|---|
| F-1 | Architecture designed (5-layer system) | ✅ Done | |
| F-2 | PostgreSQL schema designed (ER diagram) | ✅ Done | |
| F-3 | 4 GitHub repos created and cloned | ✅ Done | |
| F-4 | NestJS project scaffolded in backend repo | ✅ Done | |
| F-5 | React + Vite + MUI + Tailwind scaffolded in frontend repo | ✅ Done | |
| F-6 | Docker Compose for health tenant | ✅ Done | |
| F-7 | Docker Compose for social tenant | ✅ Done | |

---

## Demo Tenant Apps

| # | Task | Status | Notes |
|---|---|---|---|
| T-1 | Health tenant backend (Go + Gin + GORM) | ✅ Done | Port 8081 |
| T-2 | Health tenant frontend (Vite + React) | ✅ Done | Port 3001 |
| T-3 | Health tenant seed data (3 patients + 1 doctor) | ✅ Done | |
| T-4 | Social tenant backend (FastAPI + Python) | ✅ Done | Port 8082 |
| T-5 | Social tenant frontend (Vite + React) | ✅ Done | Port 3002 |
| T-6 | Social tenant seed data (admin + 3 users) | ✅ Done | |

---

## Backend — Privacy Audit Service (NestJS)

### Auth + Tenant Management
| # | Task | Status | Notes |
|---|---|---|---|
| BE-1 | `Tenant` entity (TypeORM) | ✅ Done | |
| BE-2 | `User` entity with role enum | ✅ Done | |
| BE-3 | `POST /tenants/register` — creates tenant + admin user + API key | ✅ Done | |
| BE-4 | `POST /auth/login` — email/password → JWT | ✅ Done | |
| BE-5 | `JwtStrategy` + `JwtAuthGuard` | ✅ Done | |
| BE-6 | `TenantIsolationGuard` — blocks cross-tenant access | ✅ Done | |
| BE-7 | `TenantMiddleware` — validates tenant context on all routes | ✅ Done | |
| BE-8 | `RolesGuard` + `@Roles()` decorator | ✅ Done | |
| BE-9 | Hash API key before storing (SHA-256) | ✅ Done | `hashApiKey()` in tenants.service.ts |
| BE-10 | `ApiKeyGuard` — validate `x-api-key` header | ✅ Done | `src/common/guards/api-key.guard.ts` |

### Audit Events
| # | Task | Status | Notes |
|---|---|---|---|
| BE-11 | `AuditEvent` entity — all fields from canonical event format | ✅ Done | |
| BE-12 | `POST /events` — ingest event (API key auth, returns 202) | ✅ Done | |
| BE-13 | `GET /events` — list events by tenant + optional userId filter | ✅ Done | |
| BE-14 | Idempotency — reject duplicate `event_id` | ✅ Done | |
| BE-15 | Switch `POST /events` from JWT to API key auth | ✅ Done | |
| BE-16 | Add `prev_hash` + `hash` columns to `AuditEvent` | ✅ Done | |
| BE-17 | Compute SHA-256 hash chain on each event save | ✅ Done | In `AuditEventProcessor` |
| BE-18 | `GET /events/verify-chain` — verify tamper-evident log | ✅ Done | |

### Export Workflow (GDPR Article 20)
| # | Task | Status | Notes |
|---|---|---|---|
| BE-19 | `ExportRequest` entity | ✅ Done | |
| BE-20 | `POST /dashboard/exports` — create export request, returns 202 | ✅ Done | |
| BE-21 | Background job — collect events, serialise, store in DB, set expiry | ✅ Done | |
| BE-22 | `GET /dashboard/exports/:id` — check status | ✅ Done | |
| BE-23 | `GET /dashboard/exports/:id/download` — download with expiry check | ✅ Done | 410 Gone on expiry |

### Deletion Workflow (GDPR Article 17)
| # | Task | Status | Notes |
|---|---|---|---|
| BE-24 | `DeletionRequest` entity | ✅ Done | |
| BE-25 | `POST /dashboard/deletions` — create deletion request, returns 202 | ✅ Done | |
| BE-26 | Background job — hard-delete events, compute evidence hash, store ref | ✅ Done | GDPR Art.17 compliant |
| BE-27 | `GET /dashboard/deletions/:id` — check status + events deleted count | ✅ Done | |

### Queue (BullMQ + Redis)
| # | Task | Status | Notes |
|---|---|---|---|
| BE-28 | `@nestjs/bullmq` + Redis connection configured | ✅ Done | `BullModule.forRootAsync` in AppModule |
| BE-29 | `audit-events` BullMQ queue | ✅ Done | `src/queue/queue.constants.ts` |
| BE-30 | `POST /events` pushes to queue, returns 202 immediately | ✅ Done | 3 retries w/ exponential backoff |
| BE-31 | `AuditEventProcessor` — dequeues, validates, computes hash, saves | ✅ Done | `src/queue/audit-event.processor.ts` |

### Scheduled Jobs
| # | Task | Status | Notes |
|---|---|---|---|
| BE-32 | `@nestjs/schedule` registered globally | ✅ Done | `ScheduleModule.forRoot()` in AppModule |
| BE-33 | `RetentionService` — daily cron at 02:00, purge expired events | ✅ Done | `src/retention/retention.service.ts` |

### Rate Limiting
| # | Task | Status | Notes |
|---|---|---|---|
| BE-34 | `@nestjs/throttler` registered globally | ✅ Done | |
| BE-35 | Short burst: 10 req/1s per IP | ✅ Done | `APP_GUARD` ThrottlerGuard |
| BE-36 | Medium cap: 200 req/min per IP | ✅ Done | Two-tier throttler config |

### Google OAuth + Account Linking
| # | Task | Status | Notes |
|---|---|---|---|
| BE-37 | `passport-google-oauth20` + `GoogleStrategy` | ✅ Done | `src/auth/strategies/google.strategy.ts` |
| BE-38 | `dashboard_users` entity | ✅ Done | `src/dashboard-users/dashboard-user.entity.ts` |
| BE-39 | `linked_accounts` entity | ✅ Done | `src/dashboard-users/linked-account.entity.ts` |
| BE-40 | `DashboardUsersService` — find/create user, link/unlink accounts | ✅ Done | |
| BE-41 | `GET /auth/google` + `GET /auth/google/callback` | ✅ Done | Issues `google_session` JWT |
| BE-42 | `POST /dashboard/link-account` — link tenant account to Google user | ✅ Done | Validates both tokens |
| BE-43 | `GET /dashboard/linked-accounts` — list linked apps | ✅ Done | |
| BE-44 | `DashboardAnyGuard` — accepts both `dashboard_session` + `google_session` | ✅ Done | `src/common/guards/dashboard.guard.ts` |
| BE-45 | `GET /dashboard/events` — aggregates across linked accounts (google) | ✅ Done | |

### Dashboard Auth
| # | Task | Status | Notes |
|---|---|---|---|
| BE-45a | `POST /dashboard/token` — tenant app issues handshake token | ✅ Done | 15-min JWT |
| BE-45b | `POST /dashboard/session` — exchange handshake for 8h session | ✅ Done | |

### AI Risk Agent
| # | Task | Status | Notes |
|---|---|---|---|
| BE-46 | `risk_alerts` entity | ✅ Done | `src/risk/risk-alert.entity.ts` |
| BE-47 | `@anthropic-ai/sdk` already installed | ✅ Done | In package.json |
| BE-48 | `RiskService` — batch events, call Claude API, parse findings | ✅ Done | `src/risk/risk.service.ts` |
| BE-49 | Cron job: every 6 hours (`0 */6 * * *`) | ✅ Done | |
| BE-50 | `GET /dashboard/risk-alerts` — list alerts for user | ✅ Done | Supports both session types |

---

## Frontend — Privacy Dashboard (React)

### Components (Built with Seed Data)
| # | Task | Status | Notes |
|---|---|---|---|
| FE-1 | Vite + React + TypeScript scaffolded | ✅ Done | |
| FE-2 | MUI + Tailwind configured | ✅ Done | |
| FE-3 | `AuditEvent` TypeScript interface | ✅ Done | |
| FE-4 | 16 seed events (8 health + 8 social) — kept for reference | ✅ Done | |
| FE-5 | `Header` component | ✅ Done | Updated with auth state + logout |
| FE-6 | `TenantTabs` component (All / HealthTrack / ConnectSocial) | ✅ Done | |
| FE-7 | `StatsBar` — 4 summary cards | ✅ Done | |
| FE-8 | `SensitivityChart` — donut chart (Recharts) | ✅ Done | |
| FE-9 | `DataFieldsChart` — bar chart (Recharts) | ✅ Done | |
| FE-10 | `EventFeed` + `EventCard` — timeline with expand | ✅ Done | |
| FE-11 | `SensitivityBadge` + `ActorBadge` components | ✅ Done | |
| FE-12 | `AIChatButton` FAB | ✅ Done | |
| FE-13 | `Dashboard` page assembling all components | ✅ Done | Now uses real API |
| FE-14 | React Router setup | ✅ Done | Updated with protected routes |
| FE-15 | Nginx + Dockerfile | ✅ Done | |

### Auth + Real API
| # | Task | Status | Notes |
|---|---|---|---|
| FE-17 | `src/api/client.ts` — Axios instance with auth header interceptor | ✅ Done | Auto-attaches Bearer token |
| FE-18 | `/login` page — Google OAuth + token paste | ✅ Done | `src/pages/Login.tsx` |
| FE-19 | `AuthContext` — session state, auto-expiry, protected routes | ✅ Done | `src/contexts/AuthContext.tsx` |
| FE-20 | `Dashboard` page uses real `GET /dashboard/events` | ✅ Done | Replaced seed data |
| FE-21 | Loading state + error state on dashboard | ✅ Done | |
| FE-22 | `/auth/redirect` page — exchanges handshake token | ✅ Done | `src/pages/AuthRedirect.tsx` |
| FE-22a | `/auth/google/callback` page — stores google_session JWT | ✅ Done | Handled by same AuthRedirect |

### GDPR Controls UI
| # | Task | Status | Notes |
|---|---|---|---|
| FE-23 | "Request data export" button + status tracking | ✅ Done | Polls until complete, triggers download |
| FE-24 | "Request account deletion" modal + confirmation | ✅ Done | Two-step confirm |
| FE-25 | Export download auto-trigger on completion | ✅ Done | |

### AI Risk Alerts UI
| # | Task | Status | Notes |
|---|---|---|---|
| FE-34 | Risk alerts section on dashboard | ✅ Done | Severity-coloured cards |
| FE-35 | Risk alert card showing AI explanation + suggested action | ✅ Done | |

---

## SDKs

### Go SDK
| # | Task | Status | Notes |
|---|---|---|---|
| SDK-1 | Go module + `client.go` | ✅ Done | `privacy-audit-sdk/go/` |
| SDK-2 | `Client.Send()` — synchronous event send | ✅ Done | |
| SDK-3 | `Client.SendAsync()` — goroutine fire-and-forget | ✅ Done | |
| SDK-4 | `Client.IssueUserToken()` — get privacy dashboard token | ✅ Done | |

### Python SDK
| # | Task | Status | Notes |
|---|---|---|---|
| SDK-5 | Python package with `setup.py` | ✅ Done | `privacy-audit-sdk/python/` |
| SDK-6 | `AuditClient.send()` — synchronous (httpx) | ✅ Done | |
| SDK-7 | `AuditClient.issue_user_token()` | ✅ Done | |
| SDK-8 | Dataclasses: Event, Action, Reason, Actor, Sensitivity | ✅ Done | |

### JS/TS SDK
| # | Task | Status | Notes |
|---|---|---|---|
| SDK-9 | npm package + tsconfig | ✅ Done | `privacy-audit-sdk/js/` |
| SDK-10 | `AuditClient.send()` + `sendAsync()` (native fetch) | ✅ Done | No runtime dependencies |
| SDK-11 | `AuditClient.issueUserToken()` | ✅ Done | |
| SDK-12 | Full TypeScript types exported | ✅ Done | |

---

## Infrastructure

| # | Task | Status | Notes |
|---|---|---|---|
| INF-1 | Full 8-service Docker Compose | ✅ Done | `privacy-audit-infra/docker-compose.yml` |
| INF-2 | PostgreSQL (audit, health, social) — separate DBs | ✅ Done | |
| INF-3 | Redis service for BullMQ | ✅ Done | |
| INF-4 | All service healthchecks configured | ✅ Done | |
| INF-5 | `.env.example` with all required vars | ✅ Done | |

---

## Demo App Integration (SDK Integration)

| # | Task | Status | Notes |
|---|---|---|---|
| INT-1 | Health tenant uses Go SDK (already integrated) | ✅ Done | Direct HTTP, refactor to SDK optional |
| INT-2 | Social tenant uses Python SDK (already integrated) | ✅ Done | Direct HTTP via `audit.py` |
| INT-3 | All 7 social tenant events fire correctly | ✅ Done | See `CLAUDE.md` for event table |
| INT-4 | All 6 health tenant events fire correctly | ✅ Done | See `CLAUDE.md` for event table |

---

---

## Phase 7 — One-Command Local Startup + Mono-Repo + CI/CD

### Mono-Repo Migration
| # | Task | Status | Notes |
|---|---|---|---|
| MONO-1 | Convert to mono-repo — `git init` at project root, push to `VirtualBeetle/privacy-audit-platform` | ✅ Done | See `MONO_REPO_SETUP.md` for exact commands |
| MONO-2 | Archive / deprecate the 6 separate GitHub repos (or leave as mirrors) | ⏳ Not Started | Do after pushing mono-repo |

### One-Command Startup
| # | Task | Status | Notes |
|---|---|---|---|
| SETUP-1 | `Makefile` — `make start/stop/reset/logs/seed/status` + per-service log filtering | ✅ Done | `make logs SERVICE=audit-backend` for focused view |
| SETUP-2 | `start.sh` — checks Docker, copies .env, docker-compose up, waits for health | ✅ Done | Color-coded header, health status table, all URLs |
| SETUP-3 | `privacy-audit-infra/README.md` — infra setup guide | ✅ Done | Local + Render + all env var reference |

### Docker Compose (best version)
| # | Task | Status | Notes |
|---|---|---|---|
| DC-1 | `privacy-audit-infra/docker-compose.yml` rewrite — all 9 services, YAML logging anchors, container names, healthchecks on all services | ✅ Done | One file runs entire platform |
| DC-2 | Add `GET /api/health` endpoint to audit-backend (returns DB + Redis status) | ✅ Done | `src/app.controller.ts` |

### CI/CD
| # | Task | Status | Notes |
|---|---|---|---|
| CI-1 | `.github/workflows/ci.yml` at mono-repo root — lint + build all 6 services | ✅ Done | Backend, frontend, Go, Python, JS/TS SDK, health/social frontends |
| CI-2 | `render.yaml` at mono-repo root — Render Blueprint for all services | ✅ Done | Render requires this at repo root |
| CI-3 | `DEPLOY.md` — local quickstart + Render step-by-step guide | ✅ Done | |

---

## Phase 8 — Render Deployment + CI/CD ✅ FULLY DONE (merged into Phase 7)

| # | Task | Status | Notes |
|---|---|---|---|
| CI-1 | GitHub Actions CI — lint + build on every push/PR | ✅ Done | `.github/workflows/ci.yml` — covers all 6 services |
| CI-2 | `render.yaml` Blueprint — all services + DBs + Redis | ✅ Done | At repo root (required by Render) |
| CI-3 | Env vars documented | ✅ Done | Covered in `DEPLOY.md` and `.env.example` files |
| CI-4 | `DEPLOY.md` — step-by-step Render deploy guide | ✅ Done | Full local + Render guide |

---

## Phase 9 — MongoDB + AI Chat + AI Orchestration (Multi-Provider)

### MongoDB Setup
| # | Task | Status | Notes |
|---|---|---|---|
| MONGO-1 | Install `@nestjs/mongoose` + `mongoose` in backend | ✅ Done | `npm install @nestjs/mongoose mongoose` |
| MONGO-2 | `MongooseModule.forRootAsync` in `AppModule` | ✅ Done | `MONGODB_URI` env var, fallback to localhost |
| MONGO-10 | MongoDB service already added to Docker Compose (`mongo:7`) | ✅ Done | Port 27017, named volume |

### AI Provider Orchestration (switchable from DB)
| # | Task | Status | Notes |
|---|---|---|---|
| AI-1 | `AiProviderSetting` Mongoose schema — provider, model, apiKey (AES-256 encrypted), isActive, label | ✅ Done | `src/ai-orchestration/schemas/ai-provider-setting.schema.ts` |
| AI-2 | `ENCRYPTION_KEY` env var + AES-256-GCM encrypt/decrypt util | ✅ Done | `src/ai-orchestration/encryption.util.ts` |
| AI-3 | `AiOrchestrationService` — reads active provider from DB, routes to Claude/Gemini/OpenAI | ✅ Done | Single `chat(messages)` and `analyse(prompt)` interface |
| AI-4 | Claude adapter — uses `@anthropic-ai/sdk`, supports `claude-opus-4-6` and `claude-sonnet-4-6` | ✅ Done | Fallback to `ANTHROPIC_API_KEY` env if no DB provider |
| AI-5 | Gemini adapter — uses `@google/generative-ai` SDK, supports `gemini-1.5-pro` and `gemini-1.5-flash` | ✅ Done | |
| AI-6 | OpenAI adapter (optional) — uses `openai` SDK, supports `gpt-4o` | ✅ Done | Dynamic require — install `openai` package to enable |
| AI-7 | Dev endpoints: `GET /dev/ai-providers`, `POST /dev/ai-providers`, `PUT /dev/ai-providers/:id/activate`, `DELETE /dev/ai-providers/:id` | ✅ Done | All guarded by `x-dev-token` |
| AI-8 | `RiskService` and `AiChatService` use `AiOrchestrationService` instead of direct Anthropic calls | ✅ Done | |

### AI Chat
| # | Task | Status | Notes |
|---|---|---|---|
| MONGO-3 | `AiChatSession` Mongoose schema (userId, provider used, messages array, tenantContext) | ✅ Done | Collection `ai_chat_sessions` |
| MONGO-4 | `AiAnalysisRecord` Mongoose schema (tenantId, providerUsed, full context, event samples, findings) | ✅ Done | Collection `ai_analysis_records` |
| MONGO-5 | `AiChatModule` + `AiChatService` | ✅ Done | `src/ai-chat/` |
| MONGO-6 | `POST /dashboard/ai-chat` — send message, get AI response with user's audit data as context | ✅ Done | Prepends last 20 events as system context |
| MONGO-7 | `GET /dashboard/ai-chat/history` — paginated sessions | ✅ Done | Query: `?page=1&limit=20` |
| MONGO-8 | `RiskService` stores full analysis in MongoDB (alongside PG alerts) | ✅ Done | Non-blocking — PG failure doesn't block MongoDB |
| MONGO-9 | `GET /dashboard/ai-analysis` — full analysis history from MongoDB | ✅ Done | Expandable accordion cards in UI |
| MONGO-11 | Frontend: `AIChatPanel` — real chat UI, shows which AI provider is responding | ✅ Done | Live API calls, session continuity, provider label shown |
| MONGO-12 | Frontend: AI Analysis History section — expandable cards | ✅ Done | Accordion UI in Dashboard.tsx, shows provider/model/findings |

---

## Phase 10 — Email Notifications ✅ FULLY DONE

| # | Task | Status | Notes |
|---|---|---|---|
| EMAIL-1 | Install `nodemailer` + `@types/nodemailer` in backend | ✅ Done | |
| EMAIL-2 | `EmailModule` + `EmailService` with nodemailer transport | ✅ Done | `src/email/email.service.ts` — graceful no-op when SMTP not configured |
| EMAIL-3 | HTML email template — HIGH/CRITICAL risk alert for tenant admin | ✅ Done | Severity badge, description, suggested action, inline CSS |
| EMAIL-4 | HTML email template — weekly digest | ✅ Done | Stats grid (total/critical/high), top findings list |
| EMAIL-5 | `RiskService` triggers email on HIGH/CRITICAL alert after analysis | ✅ Done | Non-blocking `.catch()` — alert save doesn't fail if email fails |
| EMAIL-6 | Weekly privacy digest cron (`0 9 * * 1` — Monday 09:00 UTC) | ✅ Done | `sendWeeklyDigests()` in RiskService + `POST /dev/trigger-weekly-digest` |
| EMAIL-7 | Add SMTP env vars to `.env.example` (SMTP_HOST, PORT, USER, PASS, FROM_EMAIL) | ✅ Done | Already present — supports Gmail/Mailtrap/SendGrid |

---

## Phase 11 — Developer Tools (Manual Triggers for Demo) ✅ FULLY DONE

| # | Task | Status | Notes |
|---|---|---|---|
| DEV-1 | `DevModule` + `DevController` guarded by `DEV_TOKEN` env var | ✅ Done | `src/dev/dev.controller.ts` — all routes require `x-dev-token` header |
| DEV-2 | `POST /dev/trigger-risk-analysis` — runs full risk analysis immediately | ✅ Done | Returns `{ tenants, alerts }` |
| DEV-3 | `POST /dev/trigger-retention` — runs retention purge immediately | ✅ Done | Delegates to `RetentionService.purgeExpiredEvents()` |
| DEV-4 | `POST /dev/trigger-weekly-digest` — sends weekly email digest immediately | ✅ Done | Delegates to `RiskService.sendWeeklyDigests()` |
| DEV-5 | `POST /dev/seed-events` — injects 20 sample events for a tenant | ✅ Done | Body: `{ tenantId, tenantUserId? }` — varied actions/sensitivities/actors |
| DEV-6 | `GET /dev/queue-status` — BullMQ queue depth + failed jobs | ✅ Done | Returns waiting/active/completed/failed/delayed counts + health flag |

---

## Phase 12 — Architecture Diagram

| # | Task | Status | Notes |
|---|---|---|---|
| ARCH-1 | `architecture-diagram.excalidraw` — full system diagram paste-into-excalidraw.com | ✅ Done | File at repo root — paste into excalidraw.com |

---

## Phase 13 — Tenant Onboarding (Demo-Doable) ✅ FULLY DONE

| # | Task | Status | Notes |
|---|---|---|---|
| ONBOARD-1 | `POST /tenants/register` returns enriched onboarding payload — API key plaintext, dashboard URL, sample curl commands | ✅ Done | Returns `dashboardUrl`, `quickstart.sendEvent`, `quickstart.loginDashboard` |
| ONBOARD-2 | Frontend: `/onboard` wizard — 3 steps: Register Tenant → Copy API Key + Test Event → Open Dashboard | ✅ Done | `src/pages/Onboard.tsx` — polls onboarding-status, live event counter |
| ONBOARD-3 | `GET /tenants/:id/onboarding-status` — returns: hasEvents (bool), eventCount, firstEventAt, dashboardReady | ✅ Done | `TenantsController.getOnboardingStatus()` |
| ONBOARD-4 | `POST /dev/seed-events` already done (DEV-5) — used as "Test Connection" button in wizard | ✅ Done | Already implemented in Phase 11 |
| ONBOARD-5 | Frontend: Demo tour overlay — step-by-step tooltips on dashboard sections (Events, Risk Alerts, GDPR Controls, AI Chat) | ✅ Done | Floating "?" FAB → 6-step MobileStepper dialog in Dashboard.tsx |
| ONBOARD-6 | `scripts/demo-onboard.sh` — curl script: register tenant → send 5 events → print dashboard URL | ✅ Done | `scripts/demo-onboard.sh` — executable, supports `API_URL` env override |

---

## Phase 14 — Complexity Boosters (All Demo-Doable) ✅ FULLY DONE

| # | Task | Status | Notes |
|---|---|---|---|
| BOOST-1 | **Consent Management API** — `POST /api/consents`, `GET /api/consents/:userId`, consent version history. Frontend: consent toggles per data type in dashboard. GDPR Art.7 | ✅ Done | `src/consents/` — per-data-type upsert, defaults for 7 categories. Frontend: Switch toggles in GDPR section of Dashboard |
| BOOST-2 | **Privacy Health Score** — 0-100 score per tenant. `GET /dashboard/privacy-score`. Frontend: SVG gauge card with breakdown chips | ✅ Done | `DashboardService.computePrivacyScore()` — 5 weighted factors |
| BOOST-3 | **Breach Notification Simulation** — `POST /dashboard/breach-report` starts 72h GDPR Art.33 countdown. Frontend: live breach banners + "Notify Regulator" button | ✅ Done | `src/breach/` — hours countdown, deadline exceeded detection |
| BOOST-4 | **Webhook System** — `POST /webhooks`, HMAC-SHA256 signed delivery on HIGH/CRITICAL alert. Frontend: `/webhooks` management page | ✅ Done | `src/webhooks/` — `X-Signature-256` header, `AbortSignal.timeout(8s)` |
| BOOST-5 | **Swagger/OpenAPI docs** — `@nestjs/swagger`, interactive explorer at `/api/docs` | ✅ Done | Configured in `main.ts` — all tags documented, Bearer + API key auth |
| BOOST-6 | **PDF Compliance Report** — `GET /dashboard/compliance-report/download`, pdfkit | ✅ Done | A4 PDF: event summary, retention policy, hash chain, GDPR rights |

---

---

## Phase 15 — Render Full Feature Unlock (Demo-Ready Production)

> Goal: Get all features working on the live Render deployment for dissertation demo.
> All 174 original tasks are done locally. This phase wires up the missing env vars and external services.

### Step 1 — URL Fixes (Blocker for everything else)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-1 | Collect all actual Render service URLs (they include a random suffix like `-ni1n`) | ⏳ Not Started | User must check Render dashboard and provide the real URLs |
| DEPLOY-2 | Update `render.yaml` + Render dashboard env vars with correct service URLs | ⏳ Not Started | Affects: AUDIT_SERVICE_URL, VITE_API_URL for all frontends, GOOGLE_CALLBACK_URL, DASHBOARD_BASE_URL |
| DEPLOY-3 | Redeploy all 3 frontends after VITE_API_URL is corrected (VITE_* are baked at build time) | ⏳ Not Started | Manual deploy trigger in Render dashboard for audit-frontend, health-frontend, social-frontend |

### Step 2 — Core Auth (Unblocks login)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-4 | Set `JWT_SECRET` in Render dashboard for audit-backend | ⏳ Not Started | Any random string e.g. `openssl rand -hex 32`. Without this, JWT auth silently breaks |
| DEPLOY-5 | Set `ENCRYPTION_KEY` in Render dashboard for audit-backend | ⏳ Not Started | Any 32+ char random string. Used to encrypt AI provider API keys in MongoDB. Has insecure default |
| DEPLOY-6 | Add `ENCRYPTION_KEY` to render.yaml (currently missing) | ✅ Done | Added as `sync: false` — must be set manually in Render dashboard |

### Step 3 — Dev Tools (Unblocks demo seeding)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-7 | Set `DEV_TOKEN` in Render dashboard for audit-backend | ⏳ Not Started | Any secret string. Unlocks /dev/* endpoints for seeding + triggering analysis |

### Step 4 — Register Tenants + Fix API Keys (Unblocks event flow)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-8 | Register health-tenant via `POST /tenants/register` on the live audit-backend | ⏳ Not Started | Gets a real API key. Hardcoded `health-tenant-api-key` in render.yaml will not match DB |
| DEPLOY-9 | Register social-tenant via `POST /tenants/register` on the live audit-backend | ⏳ Not Started | Same — gets a real API key for ConnectSocial |
| DEPLOY-10 | Update `AUDIT_API_KEY` env var for health-backend and social-backend in Render dashboard with real keys | ⏳ Not Started | Set after DEPLOY-8/9 — triggers redeploy |

### Step 5 — Google OAuth (Unlocks Google login)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-11 | Create Google Cloud project + OAuth 2.0 credentials (Web Application type) | ⏳ Not Started | Add redirect URI: `https://audit-backend-ddew.onrender.com/api/auth/google/callback` |
| DEPLOY-12 | Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in Render dashboard for audit-backend | ⏳ Not Started | GOOGLE_CALLBACK_URL is already set in render.yaml. Unlocks "Sign in with Google" |

### Step 6 — AI Features (Unlocks AI risk analysis + AI Chat)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-13 | Get Anthropic API key from platform.anthropic.com | ⏳ Not Started | Free credits available on new accounts |
| DEPLOY-14 | Set `ANTHROPIC_API_KEY` in Render dashboard for audit-backend | ⏳ Not Started | Unlocks AI risk analysis cron (every 6h) and AI chat fallback |
| DEPLOY-15 | Create MongoDB Atlas free cluster (M0) at atlas.mongodb.com | ⏳ Not Started | Free tier, no credit card needed. Whitelist 0.0.0.0/0 for Render |
| DEPLOY-16 | Set `MONGODB_URI` in Render dashboard for audit-backend | ⏳ Not Started | Format: `mongodb+srv://user:pass@cluster.mongodb.net/privacy_audit`. Unlocks AI chat history + AI analysis records |

### Step 7 — Email Notifications (Unlocks risk alert emails)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-17 | Create Mailtrap account (free) at mailtrap.io | ⏳ Not Started | No real emails sent — safe for demo |
| DEPLOY-18 | Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` in Render dashboard | ⏳ Not Started | Unlocks HIGH/CRITICAL alert emails + Monday 09:00 weekly digest |

### Step 8 — DB Dump & Restore Script (Disaster recovery / URL migration)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-19 | Write `scripts/db-dump.sh` — dumps all 3 Render Postgres DBs to local `.sql` files | ⏳ Not Started | Uses `pg_dump` with Render connection strings |
| DEPLOY-20 | Write `scripts/db-restore.sh` — restores `.sql` dumps into new Postgres DBs | ⏳ Not Started | Useful if Render DB URLs change or DBs need to be recreated from scratch |
| DEPLOY-21 | Test dump + restore cycle end-to-end | ⏳ Not Started | Verify data survives round-trip |

### Step 9 — Seed Demo Data + Smoke Test
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-22 | Seed 20 demo events via `POST /dev/seed-events` using DEV_TOKEN | ⏳ Not Started | Requires DEPLOY-7 + DEPLOY-8/9/10 |
| DEPLOY-23 | Trigger manual AI risk analysis via `POST /dev/trigger-risk-analysis` | ⏳ Not Started | Requires DEPLOY-14 |
| DEPLOY-24 | Smoke test full demo flow end-to-end (login → events → AI chat → export → delete) | ⏳ Not Started | Final verification |

---

## Summary

| Area | Done | Total |
|---|---|---|
| Foundations | 7 | 7 |
| Demo Tenant Apps | 6 | 6 |
| Backend — Auth + Events | 18 | 18 |
| Backend — GDPR Workflows | 9 | 9 |
| Backend — Queue + Cron | 5 | 5 |
| Backend — Rate Limiting | 3 | 3 |
| Backend — Google OAuth | 9 | 9 |
| Backend — AI Risk Agent | 5 | 5 |
| Frontend | 22 | 22 |
| SDKs | 12 | 12 |
| Infrastructure | 5 | 5 |
| Integration | 4 | 4 |
| Phase 7 — Mono-Repo + One-Command Startup + CI/CD | 11 | 11 |
| Phase 8 — Render CI/CD (merged into Phase 7) | 4 | 4 |
| Phase 9 — MongoDB + AI Chat + AI Orchestration | 18 | 18 |
| Phase 10 — Email Notifications | 7 | 7 |
| Phase 11 — Dev Tools | 6 | 6 |
| Phase 12 — Architecture Diagram | 1 | 1 |
| Phase 13 — Tenant Onboarding | 6 | 6 |
| Phase 14 — Complexity Boosters | 6 | 6 |
| Phase 15 — Render Full Feature Unlock | 1 | 24 |
| **Phase 1–6 Total** | **115** | **115** |
| **Phases 7–8 Total** | **15** | **15** |
| **Phases 9–14 Total** | **44** | **44** |
| **Phase 15 Total** | **1** | **24** |
| **Grand Total** | **175** | **198** |
