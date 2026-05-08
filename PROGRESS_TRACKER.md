# Progress Tracker — Privacy Audit and Data Transparency Service

> Status key:
> ✅ Done — built, tested, committed
> 🔄 In Progress — partially built or in active development
> ⏳ Not Started — planned, not yet begun

Last updated: 2026-05-08 (Phase 17 complete; Phase 18 — UX Polish & Production Credibility — planned)

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
| MONO-2 | Archive / deprecate the 6 separate GitHub repos (or leave as mirrors) | ⏸ Deferred | Not required for dissertation demo |

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
| DEPLOY-1 | Collect all actual Render service URLs | ✅ Done | Backend: `audit-backend-ddew.onrender.com` |
| DEPLOY-2 | Update `render.yaml` + Render dashboard env vars with correct service URLs | ✅ Done | VITE_API_URL, GOOGLE_CALLBACK_URL all set |
| DEPLOY-3 | Redeploy all 3 frontends after VITE_API_URL is corrected | ✅ Done | All frontends live |

### Step 2 — Core Auth (Unblocks login)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-4 | Set `JWT_SECRET` in Render dashboard for audit-backend | ✅ Done | Login working |
| DEPLOY-5 | Set `ENCRYPTION_KEY` in Render dashboard for audit-backend | ✅ Done | AI provider keys encrypted |
| DEPLOY-6 | Add `ENCRYPTION_KEY` to render.yaml | ✅ Done | `sync: false` — set manually |

### Step 3 — Dev Tools (Unblocks demo seeding)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-7 | Set `DEV_TOKEN` in Render dashboard for audit-backend | ✅ Done | `/ai-settings` page working |

### Step 4 — Register Tenants + Fix API Keys (Unblocks event flow)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-8 | Register health-tenant on live audit-backend | ✅ Done | HealthTrack tenant seeded |
| DEPLOY-9 | Register social-tenant on live audit-backend | ✅ Done | ConnectSocial tenant seeded |
| DEPLOY-10 | Update `AUDIT_API_KEY` for health-backend and social-backend | ✅ Done | Events flowing |

### Step 5 — Google OAuth (Unlocks Google login)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-11 | Create Google Cloud project + OAuth 2.0 credentials | ⏸ Deferred | Admin login sufficient for dissertation demo |
| DEPLOY-12 | Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in Render | ⏸ Deferred | Deferred with DEPLOY-11 |

### Step 6 — AI Features (Unlocks AI risk analysis + AI Chat)
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-13 | Get Gemini API key (Google AI Studio — free tier) | ✅ Done | Using `gemini-flash-latest` via DB provider |
| DEPLOY-14 | Set active AI provider via `/ai-settings` UI | ✅ Done | `gemini / gemini-flash-latest` active in MongoDB |
| DEPLOY-15 | Create MongoDB Atlas free cluster (M0) | ✅ Done | Connected, AI chat sessions and analysis records saving |
| DEPLOY-16 | Set `MONGODB_URI` in Render dashboard | ✅ Done | Chat history + analysis history working |

### Step 7 — Email Notifications
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-17 | Create Mailtrap account (free) | ⏳ Skipped | Skipped for demo — SMTP env vars not set |
| DEPLOY-18 | Set SMTP env vars in Render dashboard | ⏳ Skipped | Email notifications gracefully no-op without SMTP |

### Step 8 — DB Dump & Restore Script
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-19 | Write `scripts/db-dump.sh` | ⏸ Deferred | Nice-to-have; not needed for demo |
| DEPLOY-20 | Write `scripts/db-restore.sh` | ⏸ Deferred | |
| DEPLOY-21 | Test dump + restore cycle | ⏸ Deferred | |

### Step 9 — Seed Demo Data + Smoke Test
| # | Task | Status | Notes |
|---|---|---|---|
| DEPLOY-22 | Seed 20 demo events via `POST /dev/seed-events` | ✅ Done | Both tenants have events |
| DEPLOY-23 | Trigger manual AI risk analysis via `POST /dev/trigger-risk-analysis` | ✅ Done | Analysis records in MongoDB |
| DEPLOY-24 | Smoke test full demo flow | ✅ Done | Login → events → AI chat → breach report all working |

---

---

## Phase 16 — AI Quality + Admin UX + Production Polish

> Started: 2026-05-06. Goal: sharpen the AI experience, fix admin-specific UX gaps, and stabilise the live deployment.

### 16A — AI Persona & Prompt Quality (Session 2026-05-06)
| # | Task | Status | Notes |
|---|---|---|---|
| AI-Q1 | Restrict DataGuard AI to privacy/GDPR topics only — refuse off-topic questions | ✅ Done | `ai-chat.service.ts` — strong system prompt with STRICT RULES block |
| AI-Q2 | AI never reveals it is Gemini/Claude/OpenAI — always identifies as "DataGuard AI" | ✅ Done | Rule added to system prompt |
| AI-Q3 | Defined response format: 1-sentence answer → bullet points → 150-word cap | ✅ Done | FORMAT rules in system prompt |
| AI-Q4 | Hide provider/model label from chat UI header — was leaking "gemini / gemini-flash-latest" | ✅ Done | `AIChatButton.tsx` — always shows "Online" |
| AI-Q5 | Fix Gemini model name: `gemini-flash-latest` (resolves to `gemini-3-flash-preview`) | ✅ Done | AISettings.tsx + ai-orchestration.service.ts fallback updated |
| AI-Q6 | **Improve Risk Analysis prompt** — add structured output enforcement, severity definitions | ✅ Done | `risk.service.ts` — GDPR article citations, severity thresholds, strict JSON-only output |

### 16B — Admin UX Fixes (Session 2026-05-06)
| # | Task | Status | Notes |
|---|---|---|---|
| ADMIN-1 | Header badge shows "Admin" instead of "Tenant session" for admin logins | ✅ Done | `Header.tsx` — detects `!tenantUserId && email` |
| ADMIN-2 | Hide Consent Management (Art.7) section for admin — it's end-user only | ✅ Done | `Dashboard.tsx` — wrapped with `{user?.tenantUserId && ...}` |
| ADMIN-3 | Hide GDPR Rights section (export/erasure) for admin | ✅ Done | Same wrapper as ADMIN-2 |
| ADMIN-4 | Skip `getConsents()` API call for admin (no tenantUserId) | ✅ Done | `Dashboard.tsx` — only calls when `user?.tenantUserId` exists |
| ADMIN-5 | Breach report NOT NULL crash when admin submits (tenantUserId = null) | ✅ Done | `breach-report.entity.ts` nullable, `breach.service.ts` where-clause fixed |

### 16C — AI Scheduler & Analysis Visibility
| # | Task | Status | Notes |
|---|---|---|---|
| SCHED-1 | Risk analysis cron runs every 6h — already implemented | ✅ Done | `risk.service.ts` `@Cron('0 */6 * * *')` |
| SCHED-2 | Analysis results saved to MongoDB (`ai_analysis_records`) — already implemented | ✅ Done | `AiChatService.saveAnalysisRecord()` |
| SCHED-3 | AI Analysis History accordion shown in Dashboard — already implemented | ✅ Done | `Dashboard.tsx` expandable cards with provider/model/findings |
| SCHED-4 | **"Last AI Analysis" summary banner** — show time of last run + finding count at top of Analysis section | ✅ Done | `Dashboard.tsx` — "Last analysis: X ago · N findings" caption below section heading |
| SCHED-5 | **"Run Analysis Now" button** in Dashboard for admin — calls `POST /dev/trigger-risk-analysis` | ✅ Done | `Dashboard.tsx` — reads `VITE_DEV_TOKEN` env or localStorage `dev_token`; admin-only |

### 16D — Infrastructure / Reliability
| # | Task | Status | Notes |
|---|---|---|---|
| INFRA-1 | **Redis eviction policy must be `noeviction`** (currently `allkeys-lru`) | ✅ Done | Changed to `noeviction` in Render dashboard — 2026-05-06 |
| INFRA-2 | Verify BullMQ queue health after Redis eviction policy fix | ✅ Manual | Call `GET /dev/queue-status` with `x-dev-token` header to confirm before demo |

### 16E — Remaining Nice-to-Haves (Pre-Dissertation)
| # | Task | Status | Notes |
|---|---|---|---|
| NICE-1 | Google OAuth on Render (DEPLOY-11/12) | ⏸ Deferred | Admin login sufficient for demo |
| NICE-2 | DB backup scripts (`db-dump.sh` / `db-restore.sh`) | ⏸ Deferred | Deferred |
| NICE-3 | Demo run-sheet for dissertation presentation | ✅ Done | `DEMO_GUIDE.md` at project root — 30-min flow, prepared Q&A answers, pre-demo checklist, break-glass recovery table |
| NICE-4 | Update Phase 9 tracker: mark MONGO-11 note — chat no longer shows provider label | ✅ Done | Provider label now always "Online" — `AIChatButton.tsx` line 47 |

---

---

## Phase 17 — Multi-User Roles + New Features

_Last updated: 2026-05-06_

### 17A — Architecture: 4 User Types
| # | Task | Status | Notes |
|---|---|---|---|
| P17-1 | `SUPER_ADMIN` role added to `UserRole` enum | ✅ Done | `user.entity.ts` |
| P17-2 | Super admin seed via env vars `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | ✅ Done | `seed.service.ts` |
| P17-3 | Frontend: `role` added to `SessionUser` + 5 helper functions exported | ✅ Done | `AuthContext.tsx` |
| P17-4 | `MANUAL` — Add `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD` to Render | ✅ Manual | Set in Render dashboard env vars |

### 17B — Navigation & UX Cleanup
| # | Task | Status | Notes |
|---|---|---|---|
| P17-5 | Topbar dropdown: stripped to profile + Settings + Sign out only | ✅ Done | `Topbar.tsx` |
| P17-6 | Sidebar: dynamic nav per user type (admin/tenant-admin/user/google) | ✅ Done | `Sidebar.tsx` |
| P17-7 | New icons: `QueueIcon`, `DevIcon`, `AppsIcon` | ✅ Done | `Icons.tsx` |

### 17C — New Pages
| # | Task | Status | Notes |
|---|---|---|---|
| P17-8 | Settings page (`/settings`) — Profile, Notifications, Security, AI Settings | ✅ Done | `SettingsPage.tsx` |
| P17-9 | Dev/Demo page (`/dev`) — all dev controls, admin only, tenant selector | ✅ Done | `DevPage.tsx` |
| P17-10 | Queue Monitor page (`/queue`) — BullMQ stats + pipeline explainer | ✅ Done | `QueuePage.tsx` |
| P17-11 | `/ai-settings` redirects to `/settings` | ✅ Done | `App.tsx` |

### 17D — Notifications (MongoDB)
| # | Task | Status | Notes |
|---|---|---|---|
| P17-12 | Backend: Notification schema (`notifications` collection) | ✅ | `notifications/notification.schema.ts` |
| P17-13 | Backend: Notifications service (create, get, mark read, unread count) | ✅ | `notifications/notifications.service.ts` |
| P17-14 | Backend: Notifications controller (`GET/PUT /notifications`) | ✅ | `notifications/notifications.controller.ts` |
| P17-15 | Backend: Trigger notification on HIGH/CRITICAL risk alert | ✅ | `risk.service.ts` |
| P17-16 | Backend: Trigger notification on breach report | ✅ Done | `breach.service.ts` — fires `NotificationsService.create()` on `reportBreach()` |
| P17-17 | Frontend: Bell icon with unread count badge | ✅ | `Topbar.tsx` — 60s polling, graceful 0 on failure |
| P17-18 | Frontend: Notifications drawer (list, mark read, empty state) | ✅ | `NotificationsDrawer.tsx` — MongoDB unavailable handled |

### 17E — Connected Apps Page
| # | Task | Status | Notes |
|---|---|---|---|
| P17-19 | Backend: `GET /tenants/available` + `GET /tenants/all` + `DELETE /dashboard/linked-accounts/:id` | ✅ | `tenants.controller.ts`, `dashboard.controller.ts` |
| P17-20 | Frontend: Connected Apps page — Google user view (link apps, unlink) | ✅ | `ConnectedAppsPage.tsx` |
| P17-21 | Frontend: Connected Apps page — Admin view (manage tenants, stats) | ✅ | `ConnectedAppsPage.tsx` |

### 17F — GDPR Management View
| # | Task | Status | Notes |
|---|---|---|---|
| P17-22 | Dedicated GDPR page for all user types | ✅ | `GDPRPage.tsx` — admin and user views |
| P17-23 | Backend: Admin endpoint for all GDPR requests | ✅ | `GET /dashboard/gdpr/requests` + listAll/listForAdmin |
| P17-24 | GDPR personal rights (tenant user / google user) — extracted from Dashboard | ✅ | `GDPRPage.tsx` — UserRightsView with export + delete |

### 17G — Hash Chain in Events Row
| # | Task | Status | Notes |
|---|---|---|---|
| P17-25 | Show `hash` + `prevHash` inline in each event card in EventsPage | ✅ | `EventsPage.tsx` — green block in expanded view |
| P17-26 | Replace static "BullMQ / SHA-256 chained" chips with nav button to `/queue` | ✅ | `EventsPage.tsx` — clickable → `/queue` |

### 17H — AI Context Enrichment
| # | Task | Status | Notes |
|---|---|---|---|
| P17-27 | Richer system prompt with DataGuard product description + GDPR articles | ✅ | `ai-chat.service.ts` — full Art.5–35 references, product feature map |
| P17-28 | User-type-aware prompt (admin / tenant user / google user different context) | ✅ | `ai-chat.service.ts` — `buildRoleContext()` with 4 user type variants |

---

---

## Phase 18 — UX Polish & Production Credibility

> Goal: eliminate every "AI-generated template" tell and make DataGuard look like a real production privacy product.
> Priority order: P0 (must fix) → P1 (big wins) → P2 (polish) → P3 (stretch / dissertation hero shots)
> Items marked 🎨 require a design mockup from Claude before implementation begins.

### 18-AI Chat Revamp Completion (2026-05-08)

| # | Task | Status | Notes |
|---|---|---|---|
| P18-RC-1 | `/report` slash command — backend handler (30-day stats, grade, top fields) | ✅ Done | `ai-chat.service.ts` — `risk-summary` card |
| P18-RC-2 | `/report` ResponseCard — `ReportCard` component with score bar + field breakdown | ✅ Done | `ResponseCard.tsx` |
| P18-RC-3 | AI context enrichment — SUMMARY stats block + third-party + data fields in prompt | ✅ Done | `buildEventContext()` |
| P18-RC-4 | Expand-to-page button — already wired via `navigate('/ai-chat')` in panel header | ✅ Done | `AIChatPanel.tsx` line ~571 |
| P18-RC-5 | `/report` slash launcher — remove "(coming soon)" label | ✅ Done | `SlashLauncher.tsx` |

### 18-AI Chat Redesign (Phase 18 sub-phase — completed 2026-05-08)

#### Backend — Streaming Infrastructure
| # | Task | Status | Notes |
|---|---|---|---|
| P18-BE-1 | `streamChat()` async generator in `AiOrchestrationService` — Claude/Gemini/OpenAI adapters | ✅ Done | `ai-orchestration.service.ts` — yields raw tokens |
| P18-BE-2 | `streamMessage()` async generator in `AiChatService` — slash command routing + SSE event emission | ✅ Done | `ai-chat.service.ts` — yields `{type, data}` events |
| P18-BE-3 | `/verify` slash command — recomputes SHA-256 hash chain inline, emits `chain-verify` card | ✅ Done | |
| P18-BE-4 | `/compare` slash command — week-over-week event comparison, emits `comparison` card | ✅ Done | `Between(d14, d7)` TypeORM |
| P18-BE-5 | `/explain` slash command — AI streaming with thinking step animations | ✅ Done | |
| P18-BE-6 | `/draft` slash command — AI-generated GDPR letter as structured `draft` card | ✅ Done | |
| P18-BE-7 | `POST /dashboard/ai-chat/stream` SSE endpoint — `Content-Type: text/event-stream`, Bearer auth via fetch | ✅ Done | `dashboard.controller.ts` |
| P18-BE-8 | `GET /dashboard/ai-chat/sessions/:id` — load full past session messages | ✅ Done | `dashboard.controller.ts` |
| P18-BE-9 | `getSession(userId, sessionId)` in `AiChatService` | ✅ Done | |
| P18-BE-10 | `buildRoleContext()` + `buildSystemPrompt()` — role-aware AI context (4 user types) | ✅ Done | |
| P18-BE-11 | Session persistence — user + assistant messages saved to MongoDB `AiChatSession` after stream completes | ✅ Done | |

#### Frontend — AI Chat Components
| # | Task | Status | Notes |
|---|---|---|---|
| P18-FE-1 | `useAIChat.ts` — custom hook: messages, streaming, sessionId (localStorage), history sidebar, AbortController | ✅ Done | `src/components/AIChat/useAIChat.ts` |
| P18-FE-2 | `AIChatPanel.tsx` — floating FAB + 440×720 slide-over panel with full chat UI | ✅ Done | Hides itself on `/ai-chat` route |
| P18-FE-3 | `AIChatPage.tsx` — full-page `/ai-chat` route wrapper | ✅ Done | |
| P18-FE-4 | `ResponseCard.tsx` — `ChainVerifyCard`, `ComparisonCard`, `DraftCard` structured cards | ✅ Done | Design-matched: `#0a0a0c` bg, `#a78bfa` accent |
| P18-FE-5 | `SlashLauncher.tsx` — keyboard-navigable `/` command picker (no cmdk dep) | ✅ Done | /explain /draft /compare /verify /report |
| P18-FE-6 | `ThinkingSteps` sub-component — active spinning loader → done checkmark animation | ✅ Done | CSS keyframe injected via `document.createElement('style')` |
| P18-FE-7 | `EmptyState` sub-component — personalised greeting + 4 contextual prompt cards per user role | ✅ Done | |
| P18-FE-8 | `HistorySidebar` sub-component — slides over panel, lists past sessions, loads on click | ✅ Done | |
| P18-FE-9 | `MessageBubble` — user (right) + AI (left) bubbles with steps, markdown, card, chips, sources | ✅ Done | react-markdown + remark-gfm |
| P18-FE-10 | `streamChat()` in `api/client.ts` — fetch ReadableStream SSE consumer (POST + Bearer auth) | ✅ Done | Parses `event:` + `data:` SSE lines from chunked buffer |
| P18-FE-11 | `getChatSession()` in `api/client.ts` — GET past session detail | ✅ Done | |
| P18-FE-12 | Sidebar nav item "AI Chat" with BrainIcon → `/ai-chat` | ✅ Done | `Sidebar.tsx` |
| P18-FE-13 | Topbar page meta for `/ai-chat` | ✅ Done | `Topbar.tsx` |
| P18-FE-14 | `AIChatPanel` mounted at `AppShell` level (all pages, not just Dashboard) | ✅ Done | `App.tsx` |
| P18-FE-15 | `AIChatPage` route `/ai-chat` added | ✅ Done | `App.tsx` |
| P18-FE-16 | Old `AIChatButton` FAB removed from Dashboard | ✅ Done | `Dashboard.tsx` |

### 18-P0 — Critical Fixes (Screams "AI-Generated")

| # | Task | Priority | Status | Design needed? | Notes |
|---|---|---|---|---|---|
| P18-1 | **AI Chat — render markdown properly** (bold, lists, code, tables — no raw asterisks/backticks) | P0 | ✅ Done | No | `react-markdown` + `remark-gfm` in `MessageBubble` |
| P18-2 | **AI Chat — structured response cards** (chain-verify, comparison, draft) | P0 | ✅ Done | 🎨 Yes | `ResponseCard.tsx` — 3 card types, design-matched dark scheme |
| P18-3 | **AI Chat — suggested follow-up chips** below each answer | P0 | ✅ Done | 🎨 Yes | `inferFollowUps()` backend + chips in `MessageBubble` |
| P18-4 | **AI Chat — slash-command launcher** (`/explain`, `/draft`, `/compare`, `/verify`, `/report`) | P0 | ✅ Done | 🎨 Yes | `SlashLauncher.tsx` — keyboard-navigable picker |
| P18-5 | **AI Chat — sources strip** at bottom of each answer | P0 | ✅ Done | No | Sources strip rendered in `MessageBubble` |
| P18-6 | **AI Chat — empty state + suggested prompts** on first open | P0 | ✅ Done | 🎨 Yes | `EmptyState` component with 4 role-aware prompt cards |
| P18-7 | **AI Chat — inline citations** linking into dashboard | P0 | ✅ Done | No | `addInlineCitations()` preprocessor + custom `a` renderer in `AIChatPanel.tsx` MessageBubble — links CRITICAL/HIGH/consent/third-party counts to `/events?filter=...` |
| P18-8 | **Toast notification system** — custom event-driven stacked toasts (success / error / warning / info + action button) | P0 | ✅ Done | No | `src/utils/toast.ts` + `ToastContainer.tsx` — no extra package, global `window` event bus |
| P18-9 | **Action toasts** — "Chain verified ✓ N events", "Export ready", "Consent granted/withdrawn", "Breach reported" | P0 | ✅ Done | No | Wired in `Dashboard.tsx` handlers |
| P18-10 | **Critical risk alert toast** — SSE pushes CRITICAL event → slide-in toast in EventsPage | P0 | ✅ Done | No | `EventsPage.tsx` SSE handler fires `toast.error()` for CRITICAL severity |
| P18-11 | **Empty states — Events page** (hash-chain illustration + "Connect your first app" CTA) | P0 | ✅ Done | No | `EventsPage.tsx` — zero-events state with SHA-256 chain visual |
| P18-12 | **Empty states — filtered no results** (contextual message + Clear filters button) | P0 | ✅ Done | No | `EventsPage.tsx` — filtered empty state with clear action |
| P18-13 | **Empty states — Risk Alerts** (waiting state while analysis runs, not just blank) | P0 | ✅ Done | No | `RiskPage.tsx` already had this; improved messaging |

### 18-P1 — Big Humanisation Wins

| # | Task | Priority | Status | Design needed? | Notes |
|---|---|---|---|---|---|
| P18-14 | **Onboarding first-run wizard** — 3-step: Connect app → Verify webhook → Watch first event arrive live | P1 | ⏸ Deferred | 🎨 Yes | Requires design; deferred post-dissertation |
| P18-15 | **Command palette (⌘K)** — search events, jump to pages, run actions (Verify chain, Run analysis, Generate report, Compare) | P1 | ✅ Done | No | `CommandPalette.tsx` — cmdk (already installed); mounted in `AppShell` |
| P18-16 | **Privacy timeline heatmap** — event density × hour-of-day × tenant (GitHub contribution graph style) | P1 | ⏸ Deferred | 🎨 Yes | Requires design; deferred |
| P18-17 | **Sankey diagram** — Tenants → Actions → Data Fields → Third Parties | P1 | ⏸ Deferred | 🎨 Yes | Requires design; deferred |
| P18-18 | **Field-level trust scores** — each data field (medical_record, location…) mini-card: how many parties touched it + delta vs last week | P1 | ⏸ Deferred | 🎨 Yes | Requires design; deferred |
| P18-19 | **Risk Alert investigation view** — full evidence panel, action stack, status pipeline | P1 | ⏸ Deferred | 🎨 Yes | Requires design; deferred |
| P18-20 | **GDPR Rights portal — active requests timeline** (Submitted → Processing → Completed with stage pipeline) | P1 | ✅ Done | No | `GDPRPage.tsx` AdminView — replaced table with visual timeline + stage pills |
| P18-21 | **GDPR consent receipts** — every toggle change generates a hash-chained receipt the user can share/download | P1 | ✅ Done | No | `Dashboard.tsx` — toast `action` button downloads `.txt` receipt with GDPR Art.7 reference |
| P18-22 | **Pre-drafted DPC complaint letters** (Art.15, Art.17, Art.20, Art.21) — download as .txt | P1 | ✅ Done | No | `GDPRPage.tsx` UserRightsView — 4 templates with download button |

### 18-P2 — Polish (Prototype → Production)

| # | Task | Priority | Status | Design needed? | Notes |
|---|---|---|---|---|---|
| P18-23 | **Live event slide-in** — new event slides into top of feed with gradient sweep animation, CRITICAL events trigger error toast | P2 | ✅ Done | No | `EventsPage.tsx` — `dg-event-slide-in` keyframe + `liveIds` Set state |
| P18-24 | **Density toggle** — Comfortable / Compact for event feed | P2 | ✅ Done | No | `EventsPage.tsx` — `compact` state passed to `EventCard`; toolbar toggle button |
| P18-25 | **Mobile / tablet responsive layout** | P2 | ⏸ Deferred | No | Nice-to-have; deferred |
| P18-26 | **Trust-building micro-copy** — "Times apps touched your data", "% consented to processing", "Shared with 3rd parties" | P2 | ✅ Done | No | `Dashboard.tsx` StatCard labels updated |
| P18-27 | **Data export preview card** — before download: preview info + confirm step | P2 | ✅ Done | No | `GDPRPage.tsx` — `exportPreview` state shows inline preview card with confirm/cancel |
| P18-28 | **Settings — sessions list** with "Sign out everywhere" | P2 | ⏸ Deferred | No | Deferred |
| P18-29 | **Settings — notification preferences** (which events trigger toasts / emails) | P2 | ⏸ Deferred | No | Deferred |
| P18-30 | **Print-friendly compliance report** — one-click PDF button | P2 | ✅ Done | No | `Dashboard.tsx` line 732 — "PDF Compliance Report" button calls `downloadPdfReport()` |

### 18-P3 — Stretch / Dissertation Hero Shots

| # | Task | Priority | Status | Design needed? | Notes |
|---|---|---|---|---|---|
| P18-31 | **Privacy Timeline mode** — vertical scrubbable timeline, every data interaction by day (Apple Health "Today" style) | P3 | ⏸ Deferred | 🎨 Yes | Dissertation differentiator — future work |
| P18-32 | **Tenant comparison page** — HealthTrack vs ConnectSocial side-by-side: events, sensitivity mix, consent rate, risk score | P3 | ⏸ Deferred | 🎨 Yes | Future work |
| P18-33 | **Verifiable GDPR receipt sharing** — public URL for each consent/deletion receipt, anyone can verify against hash chain without seeing data | P3 | ⏸ Deferred | No | Academically novel — future work |
| P18-34 | **AI agent mode** — AI pre-drafts deletion requests / consent revocations / DPC complaints, queued for 1-click approval | P3 | ⏸ Deferred | 🎨 Yes | Future work |

---

### Items that need design mockups before implementation

The following items are marked 🎨 above. **Get design from Claude before starting these:**

| # | Item |
|---|---|
| P18-2 | AI Chat structured response cards |
| P18-3 | AI Chat suggested follow-up chips |
| P18-4 | AI Chat slash-command launcher |
| P18-6 | AI Chat empty state + suggested prompts |
| P18-11 | Empty state — Events page |
| P18-13 | Empty state — Risk Alerts |
| P18-14 | Onboarding first-run wizard |
| P18-16 | Privacy timeline heatmap |
| P18-17 | Sankey diagram |
| P18-18 | Field-level trust scores |
| P18-19 | Risk Alert investigation view |
| P18-31 | Privacy Timeline mode (full page) |
| P18-32 | Tenant comparison page |
| P18-34 | AI agent mode |

### Items that can be implemented immediately (no design needed)

| # | Item |
|---|---|
| P18-1 | AI Chat markdown rendering |
| P18-5 | AI Chat sources strip |
| P18-7 | AI Chat inline citations |
| P18-8 | Toast system (sonner) |
| P18-9 | Action toasts |
| P18-10 | Critical risk toast |
| P18-12 | Filtered empty state |
| P18-15 | Command palette (⌘K) |
| P18-20 | GDPR requests timeline view |
| P18-21 | Consent receipts |
| P18-22 | DPC complaint letters |
| P18-23 | Live event slide-in animation |
| P18-24 | Density toggle |
| P18-25 | Mobile responsive layout |
| P18-26 | Micro-copy trust language |
| P18-27 | Export preview card |
| P18-28 | Settings sessions list |
| P18-29 | Settings notification prefs |
| P18-30 | Print-friendly PDF |
| P18-33 | Verifiable receipt sharing |

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
| Phase 15 — Render Full Feature Unlock | 18 | 24 |
| Phase 16A — AI Persona & Prompt Quality | 6 | 6 |
| Phase 16B — Admin UX Fixes | 5 | 5 |
| Phase 16C — AI Scheduler & Analysis Visibility | 5 | 5 |
| Phase 16D — Infrastructure / Reliability | 2 | 2 |
| Phase 16E — Nice-to-Haves | 2 | 4 |
| Phase 17A — 4 User Types | 4 | 4 |
| Phase 17B — Nav & UX | 3 | 3 |
| Phase 17C — New Pages | 4 | 4 |
| Phase 17D — Notifications | 7 | 7 |
| Phase 17E — Connected Apps | 3 | 3 |
| Phase 17F — GDPR Management | 3 | 3 |
| Phase 17G — Hash in Events | 2 | 2 |
| Phase 17H — AI Context | 2 | 2 |
| Phase 18-AI Chat Revamp Completion | 5 | 5 |
| Phase 18-AI Chat Backend Streaming | 11 | 11 |
| Phase 18-AI Chat Frontend Components | 16 | 16 |
| Phase 18-P0 — Critical AI + Toast + Empty States | 13 | 13 |
| Phase 18-P1 — Humanisation Wins | 4 | 9 |
| Phase 18-P2 — Polish | 5 | 8 |
| Phase 18-P3 — Stretch / Hero Shots | 0 | 4 |
| **Grand Total** | **~284** | **~304** |
