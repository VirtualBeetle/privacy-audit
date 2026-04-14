# Privacy Audit Dashboard — Frontend Plan

> This document outlines what we are building in the `privacy-audit-frontend` repo.
> It covers: what the app is, what pages exist, what components are needed,
> what dummy data we'll use for the demo, and the build order.

---

## What This App Is

This is the **user-facing Privacy Dashboard** for the Privacy Audit SaaS product.

When a user of a tenant app (e.g. HealthTrack or ConnectSocial) clicks a
"View my data privacy" link inside that app, they land here. This dashboard
shows them **exactly how their personal data has been used** — by whom, for
what reason, with what sensitivity, and whether any third parties were involved.

The end goal is to give users full visibility into their data privacy — the
equivalent of a bank statement, but for their personal data.

---

## Phase 1 — Demo with Dummy Data (What We Are Building Now)

The backend is built and working (Weeks 1–3 complete). However, for the mentor
demo today, the FE will use **hardcoded seed data** that mirrors the exact shape
of the real API response. When the real connection is wired up later, only the
data source changes — not the components.

---

## Pages

| Route | What It Shows |
|---|---|
| `/dashboard` | Main privacy dashboard — all events for one user across all tenants |
| `/dashboard?tenant=health` | Filtered view — only HealthTrack events |
| `/dashboard?tenant=social` | Filtered view — only ConnectSocial events |

For the demo we will build a **single-page dashboard** with a tenant filter tab.
No login screen needed for now — the user is assumed to be James O'Brien
(the seeded demo user from the Health App).

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: "Your Data Privacy Dashboard" + User name + Logo   │
├─────────────────────────────────────────────────────────────┤
│  TENANT TABS: [ All Apps ] [ HealthTrack ] [ ConnectSocial ]│
├───────────────┬─────────────────────────────────────────────┤
│  STATS BAR    │  4 summary cards                            │
├───────────────┴─────────────────────────────────────────────┤
│  CHARTS ROW                                                  │
│  [ Sensitivity Breakdown (donut) ] [ Top Data Fields (bar) ]│
├─────────────────────────────────────────────────────────────┤
│  EVENT FEED                                                  │
│  Timeline of all events, newest first, with filters         │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### `Header`
- App name: "DataGuard — Your Privacy Dashboard"
- User display name: "James O'Brien"
- Last updated timestamp

### `TenantTabs`
- Tabs: All Apps / HealthTrack / ConnectSocial
- Clicking a tab filters all sections below

### `StatsBar`
Four cards:
| Card | Value | Description |
|---|---|---|
| Total Events | e.g. 24 | How many times your data was accessed |
| Data Types Accessed | e.g. 8 | Unique types of data touched |
| Apps Connected | e.g. 2 | Tenant apps reporting to this dashboard |
| Last Activity | e.g. "2 hours ago" | Most recent event timestamp |

### `SensitivityChart`
- Donut chart (recharts `PieChart`)
- Segments: LOW / MEDIUM / HIGH / CRITICAL
- Colours: green / yellow / orange / red
- Shows count per sensitivity level

### `DataFieldsChart`
- Horizontal bar chart (recharts `BarChart`)
- Top 6 most accessed data fields
- e.g. email (12), location (9), phone_number (6), ...

### `EventFeed`
- Chronological list, newest first
- Each row shows:
  - Sensitivity badge (colour coded)
  - Action (READ / EXPORT / DELETE)
  - Data fields (chips)
  - Reason / actor
  - Tenant name
  - Timestamp (relative: "3 hours ago")
- Filter bar: by action type, by sensitivity, by tenant

### `EventCard`
- Expanded detail view for one event (drawer or inline expand)
- Shows all fields: actor, third party, region, consent, meta

### `SensitivityBadge`
- Inline coloured badge component
- LOW (green), MEDIUM (yellow), HIGH (orange), CRITICAL (red)

### `ActorBadge`
- Inline badge for actor type
- SYSTEM (blue), EMPLOYEE (purple), THIRD_PARTY (orange), OTHER_USER (grey)

---

## Dummy Data — Seed Events

Two tenants are simulated:

### Tenant 1 — HealthTrack App
Simulates a health app (Go backend in privacy-health-tenant repo).
Demo user: James O'Brien (patient).

| # | Event Description | Action | Data Fields | Reason | Actor | Sensitivity |
|---|---|---|---|---|---|---|
| 1 | Doctor viewed patient profile | READ | name, dob, blood_type | clinical_care | EMPLOYEE | HIGH |
| 2 | System loaded medical records for appointment | READ | diagnosis, prescriptions | appointment_prep | SYSTEM | CRITICAL |
| 3 | Insurance provider accessed coverage details | READ | insurance_provider, policy_number | billing | THIRD_PARTY | HIGH |
| 4 | Doctor viewed emergency contacts | READ | emergency_contact_name, phone | clinical_care | EMPLOYEE | MEDIUM |
| 5 | Patient exported their own data | EXPORT | name, dob, diagnosis, prescriptions | user_request | SYSTEM | HIGH |
| 6 | Recommendation engine flagged for follow-up appointment | READ | diagnosis, last_visit | care_reminder | SYSTEM | MEDIUM |
| 7 | Support staff accessed account for verification | READ | email, phone_number | support | EMPLOYEE | MEDIUM |
| 8 | Doctor viewed test results | READ | test_results, diagnosis | clinical_care | EMPLOYEE | CRITICAL |

### Tenant 2 — ConnectSocial App
Simulates a social media app (FastAPI backend in privacy-social-media-tenant repo).
Demo user: James O'Brien (user: james_obrien on the platform).

| # | Event Description | Action | Data Fields | Reason | Actor | Sensitivity |
|---|---|---|---|---|---|---|
| 9 | Ad algorithm read profile for targeting | READ | age, location, interests | ad_targeting | SYSTEM | HIGH |
| 10 | Advertiser (third party) received profile data | READ | age, location, interests, browsing_behaviour | ad_revenue | THIRD_PARTY | HIGH |
| 11 | Another user searched for your profile | READ | name, profile_picture, bio | user_search | OTHER_USER | LOW |
| 12 | Feed algorithm read post engagement data | READ | post_likes, comments, shares | feed_ranking | SYSTEM | MEDIUM |
| 13 | Location check-in shared with data broker | SHARE | location, timestamp | data_brokering | THIRD_PARTY | CRITICAL |
| 14 | System read email for password reset | READ | email | account_security | SYSTEM | LOW |
| 15 | Admin reviewed account for policy check | READ | name, email, posts | policy_enforcement | EMPLOYEE | MEDIUM |
| 16 | User requested data export | EXPORT | name, email, posts, location, friends_list | user_request | SYSTEM | HIGH |

---

## Data Shape

Each seed event matches the **exact API response shape** from `GET /api/events`
on the backend. This means swapping to real data later requires only changing
the data source, not any component code.

```typescript
interface AuditEvent {
  id: string;
  tenantId: string;
  tenantName: string;        // added for display (join from tenants table)
  tenantUserId: string;
  eventId: string;
  actionCode: string;        // "READ" | "EXPORT" | "DELETE" | "SHARE"
  actionLabel: string;
  dataFields: string[];
  reasonCode: string;
  reasonLabel: string;
  actorType: string;         // "SYSTEM" | "EMPLOYEE" | "THIRD_PARTY" | "OTHER_USER"
  actorLabel: string;
  actorIdentifier: string | null;
  sensitivityCode: string;   // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  thirdPartyInvolved: boolean;
  thirdPartyName: string | null;
  retentionDays: number;
  region: string | null;
  consentObtained: boolean;
  userOptedOut: boolean;
  meta: Record<string, any> | null;
  occurredAt: string;        // ISO 8601
  createdAt: string;
}
```

---

## Tech Stack Additions Needed

The base Vite + React + TypeScript is already set up. We need to add:

| Package | Why |
|---|---|
| `react-router-dom` | Client-side routing (dashboard route, tenant filter params) |
| `recharts` | Charts — donut for sensitivity breakdown, bar for data fields |
| `date-fns` | Relative timestamps ("3 hours ago") |
| `@mui/material` + `@emotion/react` + `@emotion/styled` | MUI component library — Cards, Tabs, Chips, Drawer, Table, Badge |
| `@mui/icons-material` | MUI icon set — used throughout the dashboard |
| `tailwindcss` + `@tailwindcss/vite` | Utility classes for layout, spacing, and custom overrides |

**MUI + Tailwind coexistence config:**
- Tailwind `preflight` is disabled to avoid CSS reset conflicts with MUI
- Tailwind `important: '#root'` ensures Tailwind utilities win over MUI defaults when needed
- MUI handles component styling; Tailwind handles layout, spacing, and page-level arrangement

---

## Folder Structure

```
src/
├── data/
│   └── seedEvents.ts          ← all 16 dummy events + tenant info
├── types/
│   └── index.ts               ← AuditEvent, Tenant interfaces
├── components/
│   ├── Header/
│   │   └── Header.tsx
│   ├── TenantTabs/
│   │   └── TenantTabs.tsx
│   ├── StatsBar/
│   │   └── StatsBar.tsx
│   ├── SensitivityChart/
│   │   └── SensitivityChart.tsx
│   ├── DataFieldsChart/
│   │   └── DataFieldsChart.tsx
│   ├── EventFeed/
│   │   ├── EventFeed.tsx
│   │   └── EventCard.tsx
│   └── badges/
│       ├── SensitivityBadge.tsx
│       └── ActorBadge.tsx
├── pages/
│   └── Dashboard.tsx          ← assembles all components, handles tab state
├── App.tsx                    ← router setup
└── main.tsx
```

---

## Build Order

1. Install packages (`react-router-dom`, `recharts`, `date-fns`)
2. Create `src/types/index.ts` — interfaces
3. Create `src/data/seedEvents.ts` — all 16 dummy events
4. Create badge components (`SensitivityBadge`, `ActorBadge`)
5. Create `StatsBar`
6. Create `SensitivityChart` and `DataFieldsChart`
7. Create `EventCard` and `EventFeed`
8. Create `Header` and `TenantTabs`
9. Assemble `Dashboard.tsx` page
10. Wire up routing in `App.tsx`
11. Add global CSS (colour palette, fonts, layout)

---

## Demo Story for the Mentor

When showing this dashboard, walk through this narrative:

> "James O'Brien is a user on both HealthTrack and ConnectSocial.
> He clicks 'View my privacy' from within HealthTrack.
> He lands on this dashboard and can immediately see that his data
> has been accessed 24 times across 2 apps.
> 3 of those accesses were CRITICAL sensitivity — one was a location
> check-in shared with a data broker through ConnectSocial.
> He can drill into each event and see exactly who accessed it, why,
> and whether a third party was involved.
> This is what your product delivers — full transparency into how any
> app uses your personal data."

---

## What Is NOT in Scope for the Demo

- Login / authentication (FE is not connected to BE yet)
- Opt-out functionality (view only for now, per earlier decision)
- AI analysis (Week 8)
- Export / deletion request UI (Weeks 4–5 on BE, then wired to FE later)
- Real API calls (will be added once demo apps + SDK are wired up)
