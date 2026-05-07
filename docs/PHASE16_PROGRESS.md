# Phase 16 — Master's Level Features & Demo Readiness
# Target: Mentor demo — live, local, docker-compose

> Status values: `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`
> Goal: Make all 5 master's-level features visible, working, and live-updating in a single demo session.

---

## Summary

| # | Feature | GDPR Article | Status | Priority |
|---|---|---|---|---|
| 16-1 | Data Minimisation Enforcement | Art. 5(1)(c) | IN PROGRESS | CRITICAL |
| 16-2 | Real-Time Live Updates (SSE) | — | IN PROGRESS | CRITICAL |
| 16-3 | Hash Chain Integrity visible to users | Art. 30 | IN PROGRESS | HIGH |
| 16-4 | Queue Processing visibility in UI | — | IN PROGRESS | HIGH |
| 16-5 | Phase 15 Item 10 completion check | — | DONE ✅ | HIGH |
| 16-6 | Seed data with violations for demo | — | TODO | HIGH |

---

## Feature Audit: What's Already Built vs. What's Missing

| Master's Feature | Backend | User-Visible in UI | Action |
|---|---|---|---|
| Hash Chaining (SHA-256) | ✅ Full | ❌ Admin-only endpoint | Add dashboard endpoint + UI card |
| BullMQ Event Queue | ✅ Full | ❌ Invisible | Add queue badge in event feed |
| AI Risk Scoring (6h cron) | ✅ Full | ✅ Risk alerts panel | No action needed |
| GDPR Workflow (export+delete) | ✅ Full | ✅ GDPR rights panel | No action needed |
| Data Minimisation (Art. 5(1)(c)) | ❌ NOT BUILT | ❌ NOT BUILT | Build backend + frontend |
| Real-time Live Updates | ❌ NOT BUILT | ❌ NOT BUILT | Build SSE backend + frontend |

---

## Item 16-1 — Data Minimisation Enforcement (GDPR Article 5(1)(c))

**Status:** `IN PROGRESS`
**Priority:** CRITICAL — only missing master's feature

### What it does
When HealthTrack or ConnectSocial access a data field (e.g. `biometric_data`) that was never
declared in their allowed fields list, the system flags it as a violation. The user's dashboard
shows it in red: "HealthTrack accessed biometric_data — not in their declared allowed fields."

### Backend tasks
- [x] 16-1a. Add `allowedDataFields: string[] | null` (jsonb) to `Tenant` entity
- [x] 16-1b. Create `DataMinimisationViolation` entity (id, tenantId, eventId, tenantUserId, violatingFields, allowedFields, detectedAt)
- [x] 16-1c. Update `AuditEventProcessor.process()` — check each data_field against tenant's allowedDataFields; save violation if any field is not declared
- [x] 16-1d. Create `DataMinimisationModule` (service + no separate controller — uses DashboardController)
- [x] 16-1e. Add `GET /api/dashboard/violations` to `DashboardController` — returns violations for authenticated user
- [x] 16-1f. Update `SeedService` — set allowedDataFields for HealthTrack and ConnectSocial
- [x] 16-1g. Register entity + module in `app.module.ts`

### Frontend tasks
- [x] 16-1h. Add `getViolations()` to `api/client.ts`
- [x] 16-1i. Add violations state + API call in `Dashboard.tsx`
- [x] 16-1j. Add violations panel in `Dashboard.tsx` (red cards, GDPR Art. 5(1)(c) label, field names highlighted)

### Seed data
- HealthTrack allowed: `['email', 'name', 'date_of_birth', 'appointment_date', 'medical_record', 'insurance_details', 'phone_number', 'diagnosis']`
- ConnectSocial allowed: `['email', 'username', 'posts', 'location', 'friends_list', 'profile_picture', 'bio']`
- Demo violations triggered by SDK sending `biometric_data`, `financial_data`, `browsing_history`

---

## Item 16-2 — Real-Time Live Updates (SSE)

**Status:** `IN PROGRESS`
**Priority:** CRITICAL — required for live demo ("watch it update when I access data in HealthTrack")

### What it does
When a tenant app sends an audit event (HealthTrack doctor views patient records), the user's
DataGuard dashboard updates in real-time — new event appears at the top of the feed, stats update,
violations panel updates if a new violation was just detected. No page refresh.

### Backend tasks
- [x] 16-2a. Create `EventStreamService` — RxJS Subject, `emit()` and `stream()` methods
- [x] 16-2b. Update `AuditEventProcessor.process()` — call `eventStreamService.emit()` after DB save
- [x] 16-2c. Add `GET /api/dashboard/events/stream` SSE endpoint — `@Sse()` with token query param, filters by user's (tenantId, tenantUserId) or linked accounts
- [x] 16-2d. Register `EventStreamService` as a provider accessible by the processor and controller

### Frontend tasks
- [x] 16-2e. Add SSE subscription in `Dashboard.tsx` using `EventSource` API
- [x] 16-2f. On new event message: prepend to events state (animated), update stats, check for violations

---

## Item 16-3 — Hash Chain Integrity Visible to Users

**Status:** `IN PROGRESS`
**Priority:** HIGH — tamper-evidence is a key master's feature, currently hidden behind admin endpoint

### What it does
A "Chain Integrity" card on the user dashboard shows: "47 events verified — chain intact. No
tampering detected." With a Verify button they can trigger it live. This demonstrates GDPR Art.30
accountability with cryptographic proof, visibly.

### Backend tasks
- [x] 16-3a. Add `verifyUserChain(user)` to `DashboardService` — calls events repo, walks chain for user's tenantId
- [x] 16-3b. Add `GET /api/dashboard/chain-integrity` to `DashboardController` — uses `DashboardAnyGuard`

### Frontend tasks
- [x] 16-3c. Add `verifyChainIntegrity()` to `api/client.ts`
- [x] 16-3d. Add Chain Integrity card in `Dashboard.tsx` — shows event count, hash of latest event (first 16 chars), verify button, GDPR Art.30 label

---

## Item 16-4 — Queue Processing Visibility

**Status:** `IN PROGRESS`
**Priority:** HIGH — BullMQ queue is a major architectural feature but currently invisible

### What it does
The event feed header shows: "Processed via BullMQ async queue — 202 Accepted per event".
When a new event arrives via SSE, a brief "Queued → Processing → Stored" animation plays.

### Frontend tasks
- [x] 16-4a. Add a `QueueBadge` component showing queue architecture info
- [x] 16-4b. Wire into EventFeed header

---

## Item 16-5 — Phase 15 Item 10 Verification

**Status:** `DONE ✅`
**Checked:** TenantTabs.tsx, AuthRedirect.tsx, ConnectAppModal.tsx, Dashboard.tsx all complete.
Backend already has link-account, linked-accounts, events endpoints.

---

## Item 16-6 — Demo Seed Events Script

**Status:** `TODO`
**Priority:** HIGH — demo needs visible events with violations to show

### What to build
- `scripts/demo-seed-events.sh` — sends 10-15 events via SDK including intentional violations
- Events span HealthTrack and ConnectSocial with various sensitivity levels
- Includes at least 3 events with fields outside allowed list (triggers violations panel)
- Includes after-hours access events (triggers AI risk alerts)

---

## Implementation Order (Today)

1. [x] Backend: Data Minimisation entity + processor + endpoint
2. [x] Backend: EventStreamService + SSE endpoint
3. [x] Backend: Chain integrity dashboard endpoint
4. [x] Backend: SeedService update
5. [x] Frontend: api/client.ts additions
6. [x] Frontend: Dashboard.tsx — violations panel + SSE + chain card + queue badge
7. [ ] Demo: seed events with violations
8. [ ] Test: full end-to-end demo flow

---

## Demo Flow (for mentor)

```
1. Open DataGuard → Login with Google (or token from HealthTrack)
2. Connect HealthTrack → see events populate in real-time
3. Connect ConnectSocial → tabs appear, events from both apps
4. SHOW: Violations panel → "HealthTrack accessed biometric_data — not allowed"
         (GDPR Article 5(1)(c) — Data Minimisation enforcement)
5. SHOW: Chain Integrity card → click Verify → "47 events — chain intact"
         (GDPR Article 30 — tamper-evident log with SHA-256 chaining)
6. SHOW: AI Risk Alerts panel → AI detected after-hours access, no-consent events
         (AI risk scoring agent running every 6 hours)
7. SHOW: Event feed — click on doctor accessing patient record in HealthTrack
         Watch it appear live without refresh (SSE real-time updates)
8. SHOW: Queue badge in event feed header → "Processed via BullMQ async queue"
         (distributed systems pattern)
9. SHOW: GDPR Rights panel → export, delete, consent toggles, breach notification
         (GDPR Article 20, 17, 7, 33)
```

---

*Phase 16 started: 2026-04-27*
