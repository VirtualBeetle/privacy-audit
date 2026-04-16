# Phase 15 — UX, Polish & Integration Improvements
# Privacy Audit & Data Transparency Service
> Spec document for issues raised after first local run. Each item has a problem statement, acceptance criteria, and implementation notes.

---

## Item 1 — Embedded Privacy Portal (No Separate Tab UX)

### Problem
The "View my privacy" link opens `localhost:3000` in a new tab. This forces the user to context-switch and requires a separate login. It should feel like a native feature of the tenant app — not an external redirect.

### Acceptance Criteria
- Tenant app has a **Privacy Settings** page (e.g. `/settings/privacy` in HealthTrack, `/privacy` in ConnectSocial)
- The page embeds DataGuard in an `<iframe>` OR uses a seamless handshake token to open a pre-authenticated session
- No second login required — tenant session auto-converts to a DataGuard session via the existing handshake token flow (`POST /api/dashboard/token → POST /api/dashboard/session`)
- The token must be generated server-side by the tenant backend and embedded in the redirect URL

### Implementation Plan
1. **Tenant backend** — Add `GET /api/privacy/dashboard-token` endpoint:
   - Calls `POST http://audit-backend:8080/api/dashboard/token` with `x-api-key` and `{ tenantUserId }`
   - Returns the 15-min handshake token to the frontend
2. **Tenant frontend** — Privacy Settings page:
   - Fetches the handshake token from its own backend
   - Redirects (or opens iframe) to `http://localhost:3000/login?token=<handshake_token>`
3. **DataGuard login page** — Already handles `?token=` param → auto-exchanges for session JWT → redirects to `/dashboard`
4. Replaces the raw `dashboard-link` endpoint with the token-based flow

### Files to Change
- `privacy-health-tenant/backend/handlers/privacy.go` — add dashboard-token endpoint
- `privacy-health-tenant/frontend/src/` — add PrivacySettings page + route
- `privacy-social-media-tenant/backend/app/routers/privacy.py` — add dashboard-token endpoint  
- `privacy-social-media-tenant/frontend/src/` — add Privacy page + route
- `privacy-audit-frontend/src/pages/Login.tsx` — auto-consume `?token=` query param on load

---

## Item 2 — Nicer Local Dev URLs (No More Port Numbers)

### Problem
`localhost:3000`, `localhost:3001`, `localhost:3002`, `localhost:8080` are hard to remember and look unprofessional in demos.

### Acceptance Criteria
- All services accessible via named subdomains: `dataguard.local`, `health.local`, `social.local`, `api.local`
- A single setup command adds the `/etc/hosts` entries
- Works without buying a domain or configuring DNS

### Implementation Plan
Add to `/etc/hosts`:
```
127.0.0.1  dataguard.local
127.0.0.1  health.local
127.0.0.1  social.local
127.0.0.1  api.local
```
Add an `nginx-proxy` service to `docker-compose.yml` (port 80) that routes by `Host` header:
- `dataguard.local` → `audit-frontend:80`
- `health.local` → `health-frontend:80`
- `social.local` → `social-frontend:80`
- `api.local` → `audit-backend:8080`

Update all `VITE_API_URL` and `DASHBOARD_BASE_URL` env vars to use these names.
Add a `make setup-hosts` target and a check in `start.sh`.

### Files to Change
- `privacy-audit-infra/docker-compose.yml` — add nginx-proxy service
- `privacy-audit-infra/nginx-proxy.conf` — new proxy config
- `start.sh` — add hosts setup check/prompt
- `Makefile` — add `setup-hosts` target
- All `VITE_API_URL` and `DASHBOARD_BASE_URL` defaults

---

## Item 3 — Browser Tab Title & Favicon for All Sites

### Problem
All tabs show generic titles and no favicon. Hard to tell apart when multiple tabs are open.

### Acceptance Criteria
- HealthTrack tab: title `HealthTrack — Patient Portal`, distinct favicon (green cross)
- ConnectSocial tab: title `ConnectSocial — Your Network`, distinct favicon (blue network icon)
- DataGuard tab: title `DataGuard — Privacy Dashboard`, existing shield favicon

### Implementation Plan
- Update `index.html` `<title>` and `<link rel="icon">` in all three frontend projects
- Generate simple inline SVG favicons (no external assets needed)

### Files to Change
- `privacy-health-tenant/frontend/index.html`
- `privacy-social-media-tenant/frontend/index.html`
- `privacy-audit-frontend/index.html`

---

## Item 4 — Meaningful Names Throughout

### Problem
App names say "HealthDemo", "SocialDemo". Seed user names are generic. Tenant admin emails are `admin@healthdemo.internal` (not shown to users, but still).

### Acceptance Criteria
- Health app branding: **HealthTrack** (already partially done, remove "Demo" suffix)
- Social app branding: **ConnectSocial** (remove "Demo" suffix)
- Privacy dashboard: **DataGuard Privacy Dashboard** (consistent across all text)
- Seed users have realistic full names and look like real people
- All in-app text avoids placeholder language ("demo", "test", "mock")

### Files to Change
- `privacy-health-tenant/frontend/src/` — replace "HealthDemo" → "HealthTrack"
- `privacy-social-media-tenant/frontend/src/` — replace "SocialDemo" → "ConnectSocial"
- `privacy-audit-backend/src/seed/seed.service.ts` — update tenant display names

---

## Item 5 — Health Tenant App: Full-Page Modern UI

### Problem
The HealthTrack frontend is not full-page and looks dated. It does not feel like a real healthcare portal a patient would use.

### Acceptance Criteria
- Full-viewport layout with sticky sidebar navigation
- Dashboard page: appointment cards, recent records, quick actions
- Modern color palette: clinical white + teal/blue accents
- Responsive (works at 1280px+)
- All existing pages (Login, Patient Dashboard, Doctor View, Privacy Settings) retain their data

### Implementation Plan
- Add a `Layout` component with sidebar + main content area
- Redesign the Patient Dashboard to use card-based layout
- Redesign Login page with a medical-themed hero panel
- Update Tailwind config with new color tokens

### Files to Change
- `privacy-health-tenant/frontend/src/` — Layout, all pages, global CSS

---

## Item 6 — ConnectSocial: Better Colour Scheme

### Problem
The current color combination is not visually coherent. Contrast ratios are poor. Doesn't feel like a social platform.

### Acceptance Criteria
- Consistent brand color: deep indigo primary + amber accent
- All text meets WCAG AA contrast (4.5:1 minimum)
- Feed cards, post composer, and nav use the new palette
- Dark mode optional but light mode must look polished

### Files to Change
- `privacy-social-media-tenant/frontend/src/` — global CSS, component styles

---

## Item 7 — DataGuard Login Page: Human-Centred Design

### Problem
The current login page (screenshot provided) feels overly dark and "AI-generated" — generic gradient, unclear hierarchy, the token input area is confusing.

### Acceptance Criteria
- Split-panel layout: left panel = brand story, right panel = login form
- Clear visual hierarchy: headline → subline → CTA → secondary option
- The handshake token input moved to a collapsible section ("Came from an app? Click here")
- Soft background instead of dark gradient — feels approachable, not like a hacker tool
- Consistent with the rest of the DataGuard design system (after Item 7 palette update)

### Files to Change
- `privacy-audit-frontend/src/pages/Login.tsx`
- `privacy-audit-frontend/src/` — global theme / CSS

---

## Item 8 — Google OAuth: "Continue with Google" Not Working

### Problem
Clicking "Continue with Google" stalls — no redirect happens or it loops back.

### Root Cause (likely)
Google OAuth requires:
1. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in `.env`
2. `http://localhost:8080/api/auth/google/callback` registered as an authorised redirect URI in Google Cloud Console
3. `DASHBOARD_BASE_URL` set so the callback knows where to redirect after success

### Acceptance Criteria
- Clicking "Continue with Google" opens Google's consent screen
- After consent, user is redirected back to DataGuard dashboard logged in

### Implementation Plan
1. Verify the `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars are set
2. Add a clear warning in `start.sh` if they are missing (already partially done)
3. Document exact Google Cloud Console setup steps in `DEPLOY.md`
4. Ensure the NestJS passport-google strategy reads `DASHBOARD_BASE_URL` for the post-auth redirect

### Files to Change
- `privacy-audit-backend/src/auth/` — verify Google strategy callback redirect
- `privacy-audit-infra/.env.example` — add clear comment for Google setup
- `DEPLOY.md` — add Google Cloud Console step-by-step

---

## Item 9 — "View My Privacy" Opens Login Page, Not Dashboard

### Problem
The link `http://localhost:3000/dashboard?tenant_id=...&user_id=...` redirects to `/login` because the user is not authenticated in DataGuard.

### Root Cause
The current `dashboard-link` endpoint returns a raw URL with query params. DataGuard's `PrivateRoute` redirects unauthenticated users to `/login` with no context, losing the tenant/user params.

### Acceptance Criteria
- Clicking "View my privacy" from a tenant app opens DataGuard already authenticated as that user
- No manual token paste required
- The flow must work for both HealthTrack and ConnectSocial users

### Implementation Plan
This is the **full implementation of Item 1**. The handshake token flow already exists in the backend:
1. Tenant backend calls `POST /api/dashboard/token` (x-api-key auth) with `{ tenantUserId }` → gets 15-min `handshakeToken`
2. Tenant frontend redirects to `http://localhost:3000/login?token=<handshakeToken>`
3. DataGuard `/login` detects `?token=` on mount → auto-calls `POST /api/dashboard/session` → gets session JWT → stores it → redirects to `/dashboard`

Status: backend endpoints exist, frontend auto-consume is not implemented yet.

### Files to Change
- `privacy-health-tenant/backend/handlers/privacy.go` — use dashboard/token endpoint
- `privacy-social-media-tenant/backend/app/routers/privacy.py` — use dashboard/token endpoint
- `privacy-audit-frontend/src/pages/Login.tsx` — auto-consume `?token=` on mount

---

## Item 10 — Multi-Tenant User Linking: Plan

### Problem
A user might have accounts in both HealthTrack and ConnectSocial. Right now these are two entirely separate privacy profiles. There is no way to see all your data across apps in one DataGuard view.

### Vision
A single DataGuard account that shows events from **all your linked apps** — HealthTrack, ConnectSocial, any future tenant — in a unified privacy timeline.

### Proposed Flow

**Step 1 — First app link (e.g. HealthTrack)**
1. User clicks "View my privacy" in HealthTrack
2. Handshake token generated (tenant_id=HealthTrack, user_id=patient-uuid)
3. DataGuard opens, creates a `google_session` OR `dashboard_session` for this user
4. This session is bound to `{ tenantId: HealthTrack, tenantUserId: patient-uuid }`

**Step 2 — Link second app (ConnectSocial)**
1. User is already logged into DataGuard from HealthTrack
2. User opens ConnectSocial, clicks "View my privacy"
3. New handshake token generated (tenant_id=ConnectSocial, user_id=social-uuid)
4. DataGuard detects active session → shows "Link this app to your existing account?" dialog
5. User confirms → `linked_accounts` table: `{ dashboardUserId, tenantId: ConnectSocial, tenantUserId: social-uuid }`

**Step 3 — Unified View**
1. DataGuard dashboard queries events for ALL linked `(tenantId, tenantUserId)` pairs
2. Timeline shows a merged, chronological view with app badges (HealthTrack / ConnectSocial)
3. Privacy score aggregates across all linked apps
4. Consent management per app

### Backend Changes Needed
- `dashboard.service.ts` — `getEvents()` queries all linked accounts, not just current session
- `dashboard.service.ts` — `computePrivacyScore()` aggregates across all accounts
- `dashboard-users/linked-account.entity.ts` — already exists
- `POST /api/dashboard/link-account` — already exists, needs UX trigger

### Frontend Changes Needed
- Login page: detect active session + incoming token → show "Link app?" modal
- Dashboard: "Connected Apps" section showing all linked tenants
- Events timeline: app badge (color-coded) per event row
- Settings: manage/unlink apps

---

---

## Item 11 — Token Paste Flow: "Invalid or expired token" on Valid-Looking Input

### Problem
Screenshot shows: user pasted `3544721a-6334-4bd8-8abd-96b43449739f` (a UUID) into the handshake token field and received "Invalid or expired token. Please request a new link from the app."

**Root causes — two compounding bugs:**

1. **The `dashboard-link` endpoint returns raw UUIDs in query params** (`?tenant_id=...&user_id=...`), not a handshake token. Users who copy the UUID from the URL and paste it into the token field will always get "invalid".

2. **The error message is misleading.** It says "request a new link from the app" — but the user doesn't understand that a "link token" is a short-lived JWT issued by `POST /api/dashboard/token`, not the tenant/user IDs from the URL.

3. **The token input field has no format hint.** A valid handshake token is a JWT (`eyJ...`). The UI does nothing to signal this — leaving users to guess.

### Acceptance Criteria
- The token paste field shows a placeholder hint: `eyJ... (JWT from the app)`
- If the user pastes something that is clearly not a JWT (no dots, looks like a UUID), show a specific error: *"This looks like a user ID, not a token. Please use the 'View my privacy' button inside the app to get a valid token."*
- After Item 9 is implemented, the token paste path is a fallback only — most users will never need it
- The error message when a token is genuinely expired should say: *"This token has expired (tokens last 15 minutes). Go back to the app and click 'View my privacy' again."*

### Implementation Plan
1. **DataGuard `Login.tsx`** — add token format pre-validation before calling the API:
   ```ts
   const isLikelyJwt = (t: string) => t.split('.').length === 3;
   const isUuid = (t: string) => /^[0-9a-f-]{36}$/i.test(t.trim());
   ```
   - If UUID → show "This looks like a user ID, not a token" inline (no API call)
   - If not JWT format → show "Invalid format" inline
2. **DataGuard `Login.tsx`** — improve the expired/invalid error message to be context-aware
3. **DataGuard `Login.tsx`** — update placeholder text on the textarea

### Files to Change
- `privacy-audit-frontend/src/pages/Login.tsx` — format validation + better error messages + placeholder hint

---

---

## Item 12 — Render Cloud Deployment

### Problem
The project runs locally but has not been deployed to Render. The existing `render.yaml` was written early in development and has not been validated against the current 14-phase codebase. A working cloud URL is required to share with the dissertation supervisor and assessors without requiring them to run Docker locally.

### Acceptance Criteria
- All 6 services (audit-backend, audit-frontend, health-backend, health-frontend, social-backend, social-frontend) deployed and healthy on Render
- `SeedService` auto-runs on first boot — no manual tenant registration on Render
- DataGuard accessible at `https://audit-frontend.onrender.com`
- HealthTrack accessible at `https://health-frontend.onrender.com`
- ConnectSocial accessible at `https://social-frontend.onrender.com`
- "View my privacy" link works end-to-end on Render (depends on Item 9)
- Google OAuth callback registered for Render domain

### Constraints
- Render free tier: 3 PostgreSQL instances max, each deleted after 90 days
- MongoDB must use Atlas M0 (free) — Render does not host MongoDB
- Free web services sleep after 15 min; wake them before demo
- Build args (`VITE_API_URL`) must be set in Render's build environment, not just runtime env vars

### Implementation Plan
1. Audit and update `render.yaml` to match current `docker-compose.yml`
2. Create MongoDB Atlas M0 cluster, get URI
3. Deploy via Render Blueprint, set all env vars in dashboard
4. Update Google Cloud Console with Render callback URL
5. Smoke test all flows end-to-end on Render

### Files to Change
- `render.yaml` — update/complete all service definitions
- `DEPLOY.md` — add final Render URLs and deployment gotchas

---

---

## Item 13 — SDK Usage Wired to Named User Events in DataGuard

### Problem
The audit SDK sends `tenantUserId` (a UUID). DataGuard events list shows raw UUIDs — e.g. `5cb428f6-b0fe-4031-a154-cc518dd35542` — instead of the user's actual name. This is useless for demo and for real users trying to understand their own data trail.

### Acceptance Criteria
- Events in DataGuard show `James O'Brien (HealthTrack)` not `5cb428f6...`
- Each event row has a coloured tenant badge: **HealthTrack** (teal) or **ConnectSocial** (indigo)
- Backwards compatible: existing events without a name display a short UUID fragment

### Implementation Plan
1. **SDK** — add optional `tenantUserName: string` field to the event payload type in both TypeScript and Python SDKs
2. **Health backend Go** — pass patient/doctor full name in all `audit.Send()` calls
3. **Social backend Python** — pass user display name in all `audit.send()` calls
4. **Audit backend** — add `tenant_user_name` column (nullable) to `audit_events` table via TypeORM migration
5. **DataGuard events list** — render `tenantUserName ?? userId.slice(0, 8)` and tenant badge

### Files to Change
- `privacy-audit-sdk/src/` — add `tenantUserName` field
- `privacy-audit-sdk/python/` — add `tenant_user_name` field
- `privacy-audit-backend/src/events/audit-event.entity.ts` — add nullable column
- `privacy-audit-backend/src/events/events.service.ts` — persist name
- `privacy-health-tenant/backend/audit/client.go` — include user name
- `privacy-social-media-tenant/backend/app/audit.py` — include user name
- `privacy-audit-frontend/src/pages/Dashboard.tsx` — render name + badge

---

## Item 14 — DataGuard "Live" Indicator: Real Tenant Health + Event Stream

### Problem
The "Live" green pulsing dot in the DataGuard header is static and meaningless. It should communicate the actual health of connected tenant apps and whether events are flowing in real time.

### Acceptance Criteria
Four distinct states displayed:

| State | Visual | Meaning |
|---|---|---|
| **Live** | 🟢 pulsing | Health check passing + event in last 5 min |
| **Connected** | 🟡 steady | Health check passing, no recent events |
| **Unreachable** | 🔴 steady | Health endpoint not responding |
| **Scheduled** | 🔵 clock | Events come in batches (no real-time stream) |

- A "Connected Apps" panel on the dashboard shows each tenant: status, last event timestamp, total event count
- The header dot reflects the worst status across all connected tenants (green only if all live)

### Implementation Plan
1. **Backend** — add `GET /api/dashboard/connections` returning `[{ tenantId, name, status, lastEventAt, eventCount }]`
2. **Backend** — cron job every 30s: ping each tenant's `/api/health` endpoint, store result in Redis (TTL 90s)
3. **Audit backend docker env** — add `HEALTH_BACKEND_URL=http://health-backend:8081` and `SOCIAL_BACKEND_URL=http://social-backend:8082`
4. **DataGuard Header** — poll `/connections` every 30s, compute aggregate status, update dot
5. **DataGuard Dashboard** — "Connected Apps" section with per-tenant status cards

### Files to Change
- `privacy-audit-backend/src/dashboard/dashboard.controller.ts`
- `privacy-audit-backend/src/dashboard/dashboard.service.ts`
- `privacy-audit-backend` — new `TenantHealthCron` service
- `privacy-audit-infra/docker-compose.yml` — add backend health URLs to audit-backend env
- `privacy-audit-frontend/src/components/Header/Header.tsx`
- `privacy-audit-frontend/src/pages/Dashboard.tsx`

---

*Document created: 2026-04-16*
*Last updated: 2026-04-16 (added Items 13, 14)*
*Owner: Rakesh Velavaluri, Griffith College Dublin*
