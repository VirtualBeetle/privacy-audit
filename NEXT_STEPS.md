# DataGuard — Next Steps & Feature Backlog

_Last updated: 2026-05-06 — Phase 17 planning_

---

## PENDING: Commit & push Phase 16 changes first

```bash
git add PROGRESS_TRACKER.md DEMO_GUIDE.md \
  privacy-audit-backend/src/ai-chat/ai-chat.service.ts \
  privacy-audit-backend/src/risk/risk.service.ts \
  privacy-audit-frontend/src/api/client.ts \
  privacy-audit-frontend/src/components/AIChatButton/AIChatButton.tsx \
  privacy-audit-frontend/src/pages/Dashboard.tsx

git commit -m "feat: Phase 16 — AI persona, improved analysis prompt, Run Analysis Now button"
git push
```

---

## Phase 17 Architecture: 4 User Types

| Role | JWT `type` | JWT `role` | How |
|---|---|---|---|
| Super Admin (Rakesh) | `dashboard_session` | `super_admin` | Needs SUPER_ADMIN enum + seed via env var |
| Tenant Admin | `dashboard_session` | `tenant_admin` | Auto-created on tenant onboard (already works) |
| Tenant User | `dashboard_session` | `end_user` | Has `tenantUserId` in JWT |
| Google User | `google_session` | — | OAuth flow |

**Key**: `role` is already in the JWT (`auth.service.ts`). Frontend `AuthContext` just doesn't read it yet.

---

## Sidebar Nav Matrix (decided)

| Nav item | Super Admin | Tenant Admin | Tenant User | Google User |
|---|---|---|---|---|
| Overview | ✅ | ✅ | ✅ | ✅ |
| Audit Events | ✅ | ✅ | ✅ | ✅ |
| Risk Alerts | ✅ | ✅ | ❌ | ❌ |
| GDPR Rights | ✅ mgmt view | ✅ tenant mgmt | ✅ personal | ✅ personal |
| Webhooks | ✅ | ✅ | ❌ | ❌ |
| Connected Apps | ✅ all tenants | ❌ | ❌ | ✅ add apps |
| Onboard Tenant | ✅ | ❌ | ❌ | ❌ |
| Queue Monitor | ✅ | ✅ | ❌ | ❌ |
| Dev / Demo | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ |

**Dropdown (Topbar)** — ALL users: profile header + Settings → Sign out only. No nav duplication.

---

## Phase 17 Implementation Backlog

### TIER 1 — Foundation (unblocks everything else)

| ID | Task | Files | Status |
|---|---|---|---|
| T1-1 | Backend: Add `SUPER_ADMIN` to `UserRole` enum | `user.entity.ts` | ✅ |
| T1-2 | Backend: Seed super admin (env: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`) | `seed.service.ts` | ✅ |
| T1-3 | Frontend: Add `role` to `SessionUser` + `isSuperAdmin`/`isTenantAdmin`/etc helpers | `AuthContext.tsx` | ✅ |
| T1-4 | Frontend: Topbar dropdown = profile + Settings + Sign out only | `Topbar.tsx` | ✅ |
| T1-5 | Frontend: Sidebar dynamic nav per user type | `Sidebar.tsx` | ✅ |

### TIER 2 — New Pages (frontend only, use existing APIs)

| ID | Task | Route | Status |
|---|---|---|---|
| T2-1 | Settings page (Profile + AI Settings + Notifications + Security) | `/settings` | ✅ |
| T2-2 | Dev/Demo tab (all dev controls, admin only) | `/dev` | ✅ |
| T2-3 | Queue page (BullMQ stats for admin, tenant event stats for tenant admin) | `/queue` | ✅ |
| T2-4 | Hash in Events row — show `hash` truncated + `prevHash` inline in event card | `EventsPage.tsx` | ✅ |

### TIER 3 — New Backend Required

| ID | Task | Backend | Frontend | Status |
|---|---|---|---|---|
| T3-1 | Admin endpoints: `GET /admin/tenants`, `GET /admin/queue-status` | `admin.controller.ts` | Queue/ConnectedApps | ⏳ |
| T3-2 | Notifications: MongoDB schema + NestJS module | `notifications/` module | Bell drawer | ⏳ |
| T3-3 | Google connect: `GET /tenants/available` (list for picker) | `tenants.controller.ts` | ConnectedApps page | ⏳ |
| T3-4 | Connected Apps page — Google links apps; Admin manages tenants | `tenants.controller.ts` | `/connected-apps` | ⏳ |
| T3-5 | GDPR management view — admin/tenant-admin see pending requests | `dashboard.controller.ts` | `GDPRPage.tsx` | ⏳ |
| T3-6 | AI context enrichment — product context + per-user-type prompt behaviour | `ai-chat.service.ts` | — | ⏳ |

---

## Settings Page Sections

| Section | Super Admin | Tenant Admin | Tenant User | Google User |
|---|---|---|---|---|
| Profile | ✅ editable | ✅ editable | read-only | Google info |
| AI Settings | ✅ | ❌ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Security | ✅ dev token | ✅ API key info | ❌ | ✅ linked accs |

---

## Dev/Demo Page Controls

Admin only. All calls use `x-dev-token` from localStorage.

| Control | Endpoint | Options |
|---|---|---|
| Trigger Risk Analysis | POST /dev/trigger-risk-analysis | — |
| Seed Events | POST /dev/seed-events | tenant picker, user id, count |
| Trigger Breach | POST /dev/trigger-breach | tenant picker, severity picker |
| Trigger Retention Purge | POST /dev/trigger-retention | — |
| Trigger Weekly Digest | POST /dev/trigger-weekly-digest | — |
| Clear Events | POST /dev/clear-events | tenant picker |
| Reset API Key | POST /dev/tenants/:id/reset-key | tenant picker |
| Queue Status | GET /dev/queue-status | live stats |

---

## Notifications MongoDB Schema (to implement)

```
{
  recipientType: 'super_admin' | 'tenant_admin' | 'tenant_user' | 'google_user',
  tenantId: string | null,
  tenantUserId: string | null,
  type: 'risk_alert' | 'gdpr_request' | 'breach' | 'system',
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null,
  title: string,
  message: string,
  read: boolean,
  createdAt: Date
}
```

Triggers: HIGH/CRITICAL risk alert → super_admin + relevant tenant_admin. GDPR request → super_admin. Breach → super_admin.
Empty state: "Could not connect to notification service" if MongoDB unreachable.

---

## Connected Apps Page

**Google User**: List connected apps + "Connect new" button → tenant picker dropdown → enter API key → POST /dashboard/link-account
**Super Admin**: All onboarded tenants with event counts, status, last activity, quick actions

---

## Queue Page

**Super Admin**: Full BullMQ stats (waiting/active/completed/failed/delayed) + health badge
**Tenant Admin**: Their tenant's recent audit event processing from PostgreSQL

---

## Image #3 Fix (BullMQ badge in Events page)

- Replace the static "BullMQ async queue" chip in EventsPage with a proper `/queue` navigation button
- SHA-256 chain: show truncated `hash` + `prevHash` inline in each event row (not just verify button)
