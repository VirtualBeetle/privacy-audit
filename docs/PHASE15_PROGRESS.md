# Phase 15 — Progress Tracker
# UX, Polish & Integration Improvements

> Update this file as work progresses. Status values: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`
> Spec details: see `PHASE15_UX_SPEC.md`

---

## Summary

| # | Item | Status | Priority |
|---|---|---|---|
| 1 | Embedded privacy portal (no separate tab) | DONE ✅ | HIGH |
| 2 | Nicer local dev URLs | DONE ✅ | MEDIUM |
| 3 | Browser tab title & favicon | DONE ✅ | LOW |
| 4 | Meaningful names (remove "Demo") | DONE ✅ | MEDIUM |
| 5 | HealthTrack full-page modern UI | TODO | HIGH |
| 6 | ConnectSocial better colour scheme | TODO | HIGH |
| 7 | DataGuard login page redesign | TODO | HIGH |
| 8 | Google OAuth fix | DONE ✅ | HIGH |
| 9 | "View my privacy" → auto-login fix | DONE ✅ | HIGH |
| 10 | Multi-tenant user linking plan | TODO | MEDIUM |
| 11 | Token paste: UUID confusion + bad error messages | DONE | HIGH |
| 12 | Render cloud deployment | TODO | HIGH |
| 13 | SDK usage wired to user-named events in DataGuard | TODO | HIGH |
| 14 | DataGuard "Live" indicator — real tenant health + event stream | TODO | HIGH |
| 15 | Browser tab title & favicon (moved up) | TODO | LOW |
| 16 | Nginx graceful "service down" page (no raw 502) | TODO | MEDIUM |

**Done: 6 / 16** (Items 1, 2, 3, 4, 9 complete; 11 complete as part of Item 1)

---

## Item 1 — Embedded Privacy Portal

**Status:** `TODO`
**Priority:** HIGH — core UX gap, currently requires separate tab + second login

### Tasks
- [ ] 1a. Health backend: add `GET /api/privacy/dashboard-token` (calls audit `/api/dashboard/token`)
- [ ] 1b. Social backend: add `GET /api/privacy/dashboard-token` (calls audit `/api/dashboard/token`)
- [ ] 1c. Health frontend: add `/settings/privacy` page with token fetch + redirect
- [ ] 1d. Social frontend: add `/privacy` page with token fetch + redirect
- [ ] 1e. DataGuard login: auto-consume `?token=` query param on mount

**Depends on:** Item 9 (same token flow)
**Blocks:** Item 9

---

## Item 2 — Nicer Local Dev URLs

**Status:** `TODO`
**Priority:** MEDIUM — quality of life, not needed for core functionality

### Tasks
- [ ] 2a. Add `nginx-proxy` service to `docker-compose.yml`
- [ ] 2b. Create `privacy-audit-infra/nginx-proxy.conf` with Host-based routing
- [ ] 2c. Add `make setup-hosts` target to `Makefile`
- [ ] 2d. Add hosts setup check to `start.sh`
- [ ] 2e. Update all `VITE_API_URL` / `DASHBOARD_BASE_URL` defaults to use new names
- [ ] 2f. Update `PORTS.md` with new URLs

**Notes:** Requires `sudo` to edit `/etc/hosts` — user must approve once

---

## Item 3 — Browser Tab Title & Favicon

**Status:** `DONE` ✅
**Priority:** LOW — polish item

### Tasks
- [x] 3a. Update `privacy-health-tenant/frontend/index.html` — title "HealthTrack — Patient Portal" + green medical cross favicon
- [x] 3b. Update `privacy-social-media-tenant/frontend/index.html` — title "ConnectSocial — Your Network" + indigo network favicon
- [x] 3c. `privacy-audit-frontend/index.html` — title already correct; favicon already custom

---

## Item 4 — Meaningful Names

**Status:** `DONE` ✅
**Priority:** MEDIUM — needed before dissertation demo

### Tasks
- [x] 4a. Health frontend — Login heading, Navbar brand: "HealthDemo" → "HealthTrack"; `.env` VITE_APP_NAME updated
- [x] 4b. Social frontend — Login/Register headings, Navbar brand: "SocialDemo" → "ConnectSocial"; `.env` updated
- [x] 4c. Social backend FastAPI title: "SocialDemo API" → "ConnectSocial API"
- [x] 4d. Seed emails (sarah.mitchell@healthdemo.com, admin@socialdemo.com) left as internal demo credentials — not visible to end users

---

## Item 5 — HealthTrack Full-Page Modern UI

**Status:** `TODO`
**Priority:** HIGH — first impression for dissertation demo

### Tasks
- [ ] 5a. Create `Layout` component with sticky sidebar + main content
- [ ] 5b. Redesign Login page (split panel: medical hero + form)
- [ ] 5c. Redesign Patient Dashboard (card grid: appointments, records, quick actions)
- [ ] 5d. Update Tailwind config with clinical color palette (white + teal)
- [ ] 5e. Make Doctor view full-page (patient list + record details)
- [ ] 5f. Add Privacy Settings page (Item 1c)
- [ ] 5g. Rebuild + smoke test

---

## Item 6 — ConnectSocial Better Colours

**Status:** `TODO`
**Priority:** HIGH

### Tasks
- [ ] 6a. Define new palette (deep indigo primary + amber accent)
- [ ] 6b. Update global CSS / Tailwind config
- [ ] 6c. Update Feed, Post, Nav, Auth page components
- [ ] 6d. Verify WCAG AA contrast on all text
- [ ] 6e. Rebuild + smoke test

---

## Item 7 — DataGuard Login Page Redesign

**Status:** `TODO`
**Priority:** HIGH — shown in screenshot, currently poor

### Tasks
- [ ] 7a. Redesign `Login.tsx` — split panel layout
- [ ] 7b. Left panel: DataGuard brand story (headline, feature bullets, footer)
- [ ] 7c. Right panel: Google button + collapsible token section
- [ ] 7d. Remove dark gradient, use light/warm background
- [ ] 7e. Update header/app bar theme to match
- [ ] 7f. Test both login paths (Google + token)

---

## Item 8 — Google OAuth Fix

**Status:** `DONE` ✅
**Priority:** HIGH

### Tasks
- [x] 8a. User: Create OAuth 2.0 credentials in Google Cloud Console
- [x] 8b. User: Add `http://localhost:8080/api/auth/google/callback` as authorised redirect URI
- [x] 8c. User: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `privacy-audit-infra/.env`
- [x] 8d. Dev: Verified passport-google strategy → issues JWT → redirects to `DASHBOARD_BASE_URL/auth/google/callback?token=`
- [x] 8e. Dev: Added Google OAuth local setup section to `DEPLOY.md`
- [x] 8f. Dev: Fixed `start.sh` placeholder check pattern (`your-google.*` → `your-client-id.*`)

---

## Item 9 — "View My Privacy" Auto-Login Fix

**Status:** `IN PROGRESS`
**Priority:** HIGH

### What was wrong (found 2026-04-20)
Both tenant backends were calling `POST /api/dashboard/token` on the audit service and reading the response field `"handshakeToken"` — but the audit service returns the field as `"token"`. This caused a 502 on every "View my privacy" click.

**Fixed:** Both backends corrected to read `result["token"]` / `resp.json().get("token")`.

### Remaining tasks
- [x] 9a. Health backend: `DashboardToken` endpoint exists and calls `POST /api/dashboard/token`
- [x] 9b. Social backend: same — `_get_dashboard_url()` calls audit service correctly
- [x] 9c. Health frontend: "View my privacy" calls `GET /api/privacy/dashboard-token` → redirects to `dataguard.local/login?token=<tok>`
- [x] 9d. Social frontend: same
- [x] 9e. DataGuard `Login.tsx`: auto-consumes `?token=` on mount, exchanges for session JWT, redirects to `/dashboard`
- [ ] 9f. `AuthRedirect.tsx`: detect if user already has a `google_session` when a handshake token arrives → offer "Link this account?" instead of creating a new session (feeds into Item 10)

**Depends on:** Item 10 (9f is the bridge between the two items)

---

## Item 10 — Multi-Tenant User Linking + Session-Aware Dashboard

**Status:** `IN PROGRESS` — architecture finalised 2026-04-20
**Priority:** HIGH (upgraded from MEDIUM — needed for dissertation demo)

### Architecture Decisions (2026-04-20)

**Two session types exist — the dashboard must behave differently for each:**

| Session | How user got here | Dashboard behaviour |
|---|---|---|
| `dashboard_session` | Clicked "View my privacy" in a tenant app | Show ONLY that app's data. No tabs, no connected apps, no "+ Connect" button. |
| `google_session` | Logged in with Google OAuth | Show all linked apps with tab switcher. Show "+ Connect application" button. Show empty state if nothing linked yet. |

**Connect-app flow (google_session):**
1. User has `google_session` in DataGuard
2. Clicks "+ Connect application" in the top bar → modal opens
3. Modal shows HealthTrack / ConnectSocial cards
4. User clicks one → sees instructions: "Go to health.local → log in → click View My Privacy"
5. Tenant app redirects user to `dataguard.local/auth/redirect?token=<handshake>`
6. `AuthRedirect.tsx` detects existing `google_session` → shows "Link to your Google account?" confirmation
7. User confirms → exchange handshake for `dashboard_session` → call `POST /api/dashboard/link-account` → link stored in DB
8. User stays on `google_session`, tabs update to show the newly linked app

**Backend is already fully built for this:**
- `POST /api/dashboard/link-account` (requires `dashboard_session` auth + `{ googleSessionToken }` body) ✅
- `GET /api/dashboard/linked-accounts` (requires `google_session`) ✅
- `getEvents()` already aggregates across linked accounts for `google_session` ✅
- `computePrivacyScore()` already aggregates across linked accounts ✅
- `LinkedAccount` entity with `(dashboardUserId, tenantId, tenantUserId)` ✅

**Tenant ID → App name mapping (fixed constants in demo):**
| tenantId | App | Colour |
|---|---|---|
| `11111111-1111-1111-1111-111111111111` | HealthTrack | `#ef4444` (red) |
| `22222222-2222-2222-2222-222222222222` | ConnectSocial | `#0ea5e9` (blue) |

### Frontend tasks remaining
- [ ] 10a. `TenantTabs.tsx` — rewrite to be data-driven (linked accounts from API, not hardcoded). For `dashboard_session`: render nothing. For `google_session`: "All Apps" + one tab per linked app + "+ Connect" button on the right.
- [ ] 10b. `Dashboard.tsx` — fetch `GET /api/dashboard/linked-accounts` for `google_session`. Pass to TenantTabs. Show empty state ("No apps connected") when list is empty.
- [ ] 10c. `Dashboard.tsx` — tab filter uses actual `tenantId` (not hardcoded slug). Fix broken slug detection (`tenantId?.includes('health')` doesn't work with UUID tenant IDs).
- [ ] 10d. `ConnectAppModal.tsx` (new) — step 1: choose app card. Step 2: instructions ("go to health.local → View my privacy") with open-in-new-tab button.
- [ ] 10e. `AuthRedirect.tsx` — detect existing `google_session` when handshake token arrives → show "Link this to your Google account?" page instead of auto-login. On confirm: exchange token → `POST /api/dashboard/link-account` → stay on `google_session`.
- [ ] 10f. `Dashboard.tsx` — for `dashboard_session`: remove TenantTabs, remove "+ Connect" button, show single-tenant title (e.g. "HealthTrack — Privacy View").
- [ ] 10g. `api/client.ts` — add `linkAccountWith(dashboardToken, googleToken)` that overrides Authorization header for the link call.
- [ ] 10h. End-to-end test: Google login → empty state → connect HealthTrack → tabs appear → connect ConnectSocial → "All Apps" shows unified timeline.

**Depends on:** Item 9 complete (502 fix already done ✅)

---

## Item 11 — Token Paste Flow: UUID Confusion + Bad Error Messages

**Status:** `DONE` ✅ (implemented as part of Item 1)
**Priority:** HIGH — breaks the only manual fallback path into DataGuard

### Root Cause
`dashboard-link` returns raw UUIDs in query params. Users paste the UUID into the token field and always get "invalid". Error message gives no actionable guidance.

### Tasks
- [ ] 11a. `Login.tsx` — add `isLikelyJwt()` and `isUuid()` pre-validation before any API call
- [ ] 11b. `Login.tsx` — show specific error for UUID input: *"This looks like a user ID, not a token..."*
- [ ] 11c. `Login.tsx` — update expired/invalid error: *"This token has expired (15 min)..."*
- [ ] 11d. `Login.tsx` — update textarea placeholder to `eyJ... (JWT issued by the app)`
- [ ] 11e. Smoke test: paste UUID → correct error; paste expired JWT → correct error; paste valid JWT → success

**Depends on:** Item 9 (once token flow works end-to-end, this is the fallback polish)

---

## Item 12 — Render Cloud Deployment

**Status:** `TODO`
**Priority:** HIGH — needed to share with dissertation supervisor / assessors

### Problem
The project runs locally but has never been deployed to Render. The `render.yaml` at repo root was written in an earlier phase but has not been validated against the current codebase (which has grown significantly since then).

### Tasks
- [ ] 12a. Audit existing `render.yaml` against current `docker-compose.yml` — check all 6 services are declared
- [ ] 12b. Verify Render free tier limits: PostgreSQL (3 databases), Redis, MongoDB (Atlas required)
- [ ] 12c. Set up MongoDB Atlas free M0 cluster, get connection string
- [ ] 12d. Set up Render PostgreSQL — 3 instances (audit, health, social) OR shared with separate DB names
- [ ] 12e. Configure all required env vars in Render dashboard (see `DEPLOY.md` list)
- [ ] 12f. Set `DASHBOARD_BASE_URL` to Render frontend URL (not localhost) in all services
- [ ] 12g. Update Google OAuth redirect URI in Google Cloud Console to Render callback URL
- [ ] 12h. Trigger first deploy, fix any build errors
- [ ] 12i. Verify health checks pass for all 6 services
- [ ] 12j. End-to-end smoke test on Render URLs
- [ ] 12k. Update `DEPLOY.md` with final Render URLs and any gotchas found

### Key Environment Variables for Render
| Variable | Service | Value |
|---|---|---|
| `DASHBOARD_BASE_URL` | audit-backend | `https://audit-frontend.onrender.com` |
| `GOOGLE_CALLBACK_URL` | audit-backend | `https://audit-backend.onrender.com/api/auth/google/callback` |
| `MONGODB_URI` | audit-backend | MongoDB Atlas connection string |
| `HEALTH_AUDIT_API_KEY` | health-backend | Must match seeded value |
| `SOCIAL_AUDIT_API_KEY` | social-backend | Must match seeded value |
| `HEALTH_TENANT_ID` | health-backend | `11111111-1111-1111-1111-111111111111` |
| `SOCIAL_TENANT_ID` | social-backend | `22222222-2222-2222-2222-222222222222` |
| `VITE_API_URL` (build arg) | health-frontend | `https://health-backend.onrender.com` |
| `VITE_API_URL` (build arg) | social-frontend | `https://social-backend.onrender.com` |

### Notes
- Render free PostgreSQL instances spin down after 90 days and are deleted — upgrade to $7/mo for persistent data
- Free web services sleep after 15 min of inactivity — wake them before demo
- `SeedService` will run on first boot on Render, same as local — no manual tenant registration needed

---

## Item 13 — SDK Usage Wired to Named User Events in DataGuard

**Status:** `TODO`
**Priority:** HIGH — currently events show tenant user IDs, not human names

### Problem
The privacy audit SDK sends `tenantUserId` (a UUID like `5cb428f6-...`). DataGuard shows these raw UUIDs in the events list. Users viewing their own privacy dashboard expect to see their name, the app name, and meaningful context — not opaque IDs.

### Tasks
- [ ] 13a. Audit SDK: ensure `tenantUserName` field is sent alongside `tenantUserId` in event payloads (SDK v2 field)
- [ ] 13b. Health backend Go SDK calls: add user's full name when firing audit events (doctor name for doctor actions, patient name for patient actions)
- [ ] 13c. Social backend Python SDK calls: add user's display name when firing events
- [ ] 13d. Audit event entity: add `tenantUserName` column (nullable, for backwards compat)
- [ ] 13e. DataGuard events list: show `tenantUserName` if present, fall back to short UUID
- [ ] 13f. DataGuard events list: show tenant app name (HealthTrack / ConnectSocial) as a badge per event
- [ ] 13g. Verify end-to-end: login as patient → "View my privacy" → events show patient's name + app badge

### Files to Change
- `privacy-audit-backend/src/events/audit-event.entity.ts` — add `tenantUserName` column
- `privacy-audit-backend/src/events/events.service.ts` — persist `tenantUserName`
- `privacy-audit-sdk/` — add `tenantUserName` to event type + TypeScript SDK
- `privacy-audit-sdk/python/` — add to Python SDK
- `privacy-health-tenant/backend/audit/client.go` — pass user name in all event calls
- `privacy-social-media-tenant/backend/app/audit.py` — pass user name in all event calls
- `privacy-audit-frontend/src/pages/Dashboard.tsx` — render name + tenant badge

---

## Item 14 — DataGuard "Live" Indicator: Real Tenant Health + Event Stream

**Status:** `TODO`
**Priority:** HIGH — currently "Live" is a meaningless static green dot

### Problem
The DataGuard header shows a pulsing green "Live" dot that never changes. It should reflect actual connectivity:
- Whether connected tenant apps are reachable and sending events
- Which tenants are live (real-time), which are connected but quiet, and which are batch/scheduled

### Proposed States

| State | Indicator | Meaning |
|---|---|---|
| **Live** | 🟢 pulsing | Tenant app is healthy AND sent an event in the last 5 minutes |
| **Connected** | 🟡 steady | Tenant app health check passes but no recent events |
| **Inactive** | 🔴 steady | Health check failing or no events in 24h |
| **Batch** | 🔵 clock icon | Tenant sends events on a schedule (e.g. nightly), not real-time |

### Implementation Plan
1. Add `GET /api/dashboard/connections` endpoint — returns health status of each linked tenant app
2. Audit backend polls each tenant's health endpoint (`/api/health`) every 30s via a background job
3. Store latest health state in Redis (TTL 60s) per tenant
4. DataGuard header: replace static dot with dynamic status from `/connections` polled every 30s
5. Add a "Connected Apps" page/modal showing: app name, status, last event time, event count

### Backend Changes
- `privacy-audit-backend` — add `GET /api/dashboard/connections` to dashboard controller
- `privacy-audit-backend` — add a cron job polling tenant health endpoints
- `privacy-audit-infra/docker-compose.yml` — add `HEALTH_BACKEND_URL` + `SOCIAL_BACKEND_URL` env vars to audit-backend

### Frontend Changes
- `privacy-audit-frontend/src/components/Header/Header.tsx` — dynamic Live indicator
- `privacy-audit-frontend/src/pages/Dashboard.tsx` — "Connected Apps" section with status cards

### Files to Change
- `privacy-audit-backend/src/dashboard/dashboard.controller.ts`
- `privacy-audit-backend/src/dashboard/dashboard.service.ts`
- `privacy-audit-frontend/src/components/Header/Header.tsx`
- `privacy-audit-frontend/src/pages/Dashboard.tsx`
- `privacy-audit-infra/docker-compose.yml`

---

## Item 16 — Nginx Graceful "Service Down" Page

**Status:** `TODO`
**Priority:** MEDIUM — bad first impression when backend is starting or down

### Problem
When `audit-backend` (or any tenant backend) is down or still starting, nginx returns a raw
**502 Bad Gateway** from nginx/1.x. This looks broken and gives no actionable message to the user.

### Goal
Replace the raw 502 with a branded HTML page that says something like:
> "DataGuard is starting up — please wait a moment and refresh."

### Tasks
- [ ] 16a. Create `privacy-audit-infra/nginx-error-pages/502.html` — branded "Service starting" page
- [ ] 16b. Mount the error pages directory into the nginx-proxy container
- [ ] 16c. Update `nginx-proxy.conf` — add `error_page 502 503 /502.html` and `location = /502.html` block
- [ ] 16d. Test: bring down `audit-backend`, visit `dataguard.local` — should see custom page
- [ ] 16e. (Optional) Add auto-refresh meta tag (`<meta http-equiv="refresh" content="10">`) so page retries automatically

### Files to Change
- `privacy-audit-infra/nginx-error-pages/502.html` (new)
- `privacy-audit-infra/docker-compose.yml` — add volume mount for error pages dir
- `privacy-audit-infra/nginx-proxy.conf` — add error_page directives

---

## Bugs Fixed This Session (Pre-Phase 15)

| Bug | Fix | Date |
|---|---|---|
| `audit-backend` Docker build failed (missing Dockerfile) | Created `Dockerfile` | 2026-04-16 |
| `health-frontend` / `social-frontend` crash loop | Fixed nginx `upstream "backend"` hostname | 2026-04-16 |
| `audit-frontend` unhealthy (wget missing) | Added `apk add wget` to Dockerfile | 2026-04-16 |
| Health/social frontends inaccessible (port mismatch) | Fixed `listen 3001/3002` → `listen 80` in nginx.conf | 2026-04-16 |
| Health frontend API calls to `localhost:8061` | Fixed fallback URL `8061` → `8081` | 2026-04-16 |
| `VITE_API_URL` not baked into Vite build | Moved from runtime `environment:` to build `args:` | 2026-04-16 |
| "View my privacy" link used internal Docker hostname | Fixed `AUDIT_SERVICE_URL` → `DASHBOARD_BASE_URL` | 2026-04-16 |
| Demo tenants not seeded → events rejected | Added `SeedService` auto-seeding HealthTrack + ConnectSocial | 2026-04-16 |

---

*Last updated: 2026-04-16*
*Phase 15 started: 2026-04-16*
