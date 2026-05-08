# DataGuard — Demo & User Guide

> A GDPR-compliant, AI-powered personal data transparency platform.  
> Built for dissertation demo at Griffith College Dublin.

---

## What is DataGuard?

DataGuard is a **privacy audit and transparency service** that gives users full visibility over how their personal data is accessed, shared, and processed by the applications they use. It demonstrates GDPR compliance through:

- **SHA-256 tamper-evident audit log** (Article 30)
- **AI-powered risk analysis** every 6 hours (Articles 5, 7, 17, 20, 30, 33, 35)
- **Real-time event streaming** via SSE
- **GDPR rights portal** (export, erasure, consent management)
- **Breach notification simulation** with 72-hour countdown (Article 33)

**Live URL:** https://privacy-audit-frontend.onrender.com  
**Backend API Docs:** https://audit-backend-ddew.onrender.com/api/docs

---

## System Architecture (Quick Reference)

```
HealthTrack App (Go/Gin) ──→ ┐
                             │──→ DataGuard Backend (NestJS)
ConnectSocial App (FastAPI) ─→ ┘    │  ├── PostgreSQL (events, GDPR)
                                    │  ├── MongoDB (AI sessions)
                                    │  └── Redis (BullMQ queue)
                                    │
                            DataGuard Dashboard (React + Vite)
```

**Two demo tenant apps** continuously push audit events:
- **HealthTrack** — a health records app (Go, port 8081)
- **ConnectSocial** — a social network (FastAPI, port 8082)

---

## User Accounts

| Role | Login Method | What They See |
|---|---|---|
| **Admin** (tenant admin) | Email + password (token paste) | All events, violations, AI alerts, breach reports, GDPR requests |
| **End User** (tenant user) | Token from HealthTrack / ConnectSocial login | Their own events, GDPR rights (export, erasure, consents) |
| **Super Admin** | Email + password | All tenants, platform-wide view |
| **Google User** | Google OAuth | Links multiple tenant apps, unified view |

### Demo Admin Login

1. Go to https://privacy-audit-frontend.onrender.com/login
2. Click **"Paste a session token"**
3. Get a token:
   ```bash
   curl -s -X POST https://audit-backend-ddew.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@healthtrack.com","password":"yourpassword"}' | jq -r '.access_token'
   ```
4. Paste the token and click **Sign in**

---

## Page-by-Page Feature Guide

### Dashboard (`/dashboard`)

The main control centre. Shows:

| Section | What it does |
|---|---|
| **Privacy Health Score** | 0–100 gauge (Grade A–D). Based on consent rate, sensitivity, third-party sharing. Click "PDF Compliance Report" for a downloadable PDF. |
| **4 Stat cards** | Times apps touched your data · Critical risk events · Shared with 3rd parties · % consented to processing |
| **Donut chart** | Events by sensitivity: CRITICAL / HIGH / MEDIUM / LOW |
| **Bar chart** | Most accessed data fields (medical_record, email, location…) |
| **Data Minimisation Violations** | Red banner when an app accessed a field not in its declared purpose (GDPR Art.5(1)(c)) |
| **Audit Log Integrity** | SHA-256 hash chain visualisation. Click "Verify Now" to cryptographically confirm no tampering. |
| **AI Privacy Risk Alerts** | Nav card to `/risk` — AI-generated findings updated every 6 hours |
| **AI Analysis History** | Expandable accordion cards of past AI analyses with findings |
| **GDPR Controls** | Consent toggles, export, deletion, breach report — see details below |

**Live updates:** A banner pulses green when a new event arrives via SSE.

**Tour:** Click the **?** floating button (bottom-left) to start the 6-step product tour.

---

### Events Page (`/events`)

Full audit event feed with filters and live streaming.

- **Search** by actor, data field, or reason label
- **Filter** by action (READ/WRITE/SHARE/DELETE/EXPORT/ANALYSE), sensitivity, or app
- **Density toggle** — switch between Comfortable and Compact view
- **Live animation** — new events slide in from the top; CRITICAL events trigger a red toast
- **Expand any event** to see: actor, data fields, consent status, third-party flag, SHA-256 hash + prev_hash (blockchain-style chain)
- Empty state shows hash chain visual with a "Connect an app" CTA if no events exist

---

### Risk Alerts (`/risk`)

AI-generated GDPR risk findings.

- Each alert card shows: severity (CRITICAL/HIGH/MEDIUM/LOW), GDPR article cited, description, suggested action, and how many events triggered it
- Severity colour-coded: red (CRITICAL) → orange (HIGH) → yellow (MEDIUM) → green (LOW)
- "Run Analysis Now" button (admin only) triggers immediate AI analysis via the dev API

**Demo tip:** Run `/dev/trigger-risk-analysis` first to populate alerts before demoing this page.

---

### GDPR Rights (`/gdpr`)

**Admin view:** Visual timeline of all Article 20 (export) and Article 17 (erasure) requests across tenants, with stage pipeline pills: Submitted → Processing → Completed/Failed.

**End-user view:** 

| Section | What it does |
|---|---|
| **Article 20 — Data Portability** | Click "Request Export" → preview card shows what will be included → confirm → JSON download auto-triggers when ready |
| **Article 17 — Right to Erasure** | Two-step confirm → hard-deletes events → cryptographic evidence hash retained |
| **Pre-drafted DPC Complaint Letters** | Download `.txt` templates for Art.15, Art.17, Art.20, Art.21 complaints to Ireland's Data Protection Commission |

---

### AI Chat (`/ai-chat` or the purple FAB)

Conversational AI with full context of the user's audit events.

**Slash commands** (type `/` to open launcher):

| Command | What it does |
|---|---|
| `/explain <topic>` | Explains a GDPR article or privacy concept |
| `/draft <letter>` | Generates a pre-filled GDPR letter (erasure, access, objection) |
| `/compare` | Week-over-week privacy posture comparison |
| `/verify` | Recomputes SHA-256 hash chain inline |
| `/report` | Generates 30-day privacy compliance report with A–D grade + structured card |

**Response cards:** Some commands return structured cards (chain verification result, week comparison table, compliance report score).

**Follow-up chips:** After each response, click a suggested follow-up to continue the conversation.

**History sidebar:** Click the clock icon to load past sessions.

**Command palette (⌘K / Ctrl+K):** Quick-jump to any page or trigger an action from anywhere.

---

### Webhooks (`/webhooks`)

Register webhook URLs to receive HMAC-SHA256 signed payloads when HIGH or CRITICAL risk alerts fire. Shows active webhooks with last-delivery status.

---

### Queue Monitor (`/queue`)

Live BullMQ queue stats (waiting, active, completed, failed, delayed jobs). Shows the processing pipeline: Receive → Queue → Process → Hash Chain → Persist.

---

### Settings (`/settings`)

- **Profile** — display name, email (read-only)
- **Notifications** — configure which events show toasts
- **Security** — change password, view session info
- **AI Settings** — configure the active AI provider (Gemini/Claude/OpenAI). Set via `x-dev-token` header.

---

### Dev/Demo Page (`/dev`)

Admin-only. Manual trigger buttons for:
- Seed 20 demo events for any tenant
- Run AI risk analysis immediately
- Trigger weekly email digest
- Run retention purge
- Check queue health

---

## Demo Flow (30-Minute Presentation)

### Setup (5 min before)

1. Open https://privacy-audit-frontend.onrender.com in a browser
2. Log in as admin (token paste)
3. Go to `/dev` → click "Seed Events" for both HealthTrack and ConnectSocial
4. Click "Run AI Risk Analysis" → wait ~30 seconds
5. Open a second tab as an end-user (HealthTrack login → copy handshake token → paste in dashboard)

### Demo Script

**Scene 1 — "The Problem" (2 min)**
- "Your apps access your data constantly. Most people have no idea what's happening."
- Show the Dashboard stat cards: times touched, critical events, third-party sharing

**Scene 2 — Events Feed (3 min)**  
- Navigate to `/events`
- Show the live animation — new events sliding in
- Expand an event: point out actor, data fields, consent flag, SHA-256 hash
- Filter for CRITICAL events only
- Explain tamper-evident: "Every event is cryptographically linked to the previous one"

**Scene 3 — GDPR Rights (3 min)**
- Navigate to `/gdpr` (as end user)
- Click "Request Export" → show the preview card → confirm
- Download a DPC complaint letter template
- Toggle a consent switch → toast fires → click "Download Receipt" to get Art.7 receipt

**Scene 4 — AI Privacy Intelligence (5 min)**
- Click the purple chat FAB
- Ask: "What are the biggest privacy risks in my data?"
- Type `/report` → show the structured compliance report card with grade + score bar
- Type `/verify` → show real-time SHA-256 chain verification
- Type `/compare` → show week-over-week comparison table
- Mention: "The AI always identifies as DataGuard AI — never exposes the underlying model"

**Scene 5 — Risk Alerts (2 min)**
- Navigate to `/risk`
- Show an alert card with GDPR article citation and suggested action
- Explain: "The AI runs every 6 hours across all tenants and generates structured findings"

**Scene 6 — Breach Notification (2 min)**
- On dashboard, scroll to GDPR Controls
- Type a breach description and click "Report Breach"
- Show 72-hour countdown timer (Article 33)
- Click "Notify Regulator" to simulate DPC notification

**Scene 7 — Hash Chain Integrity (2 min)**
- Scroll to "Audit Log Integrity" on dashboard
- Click "Verify Now"
- Point out: blockchain-style visualisation, SHA-256 hash shown on each block
- "If any event is tampered with, the chain breaks at that point — this is GDPR Article 30 compliance"

**Scene 8 — Command Palette (1 min)**
- Press ⌘K (Mac) or Ctrl+K (Windows)
- Search for "run analysis" → select
- Explain: "Power users can trigger any action from anywhere"

---

## Useful cURL Commands (Demo Setup)

```bash
# Login and get admin token
curl -s -X POST https://audit-backend-ddew.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@healthtrack.com","password":"YOUR_PASSWORD"}'

# Seed 20 events for HealthTrack (replace TENANT_ID and DEV_TOKEN)
curl -X POST https://audit-backend-ddew.onrender.com/api/dev/seed-events \
  -H "x-dev-token: YOUR_DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"HEALTH_TENANT_ID"}'

# Trigger AI risk analysis immediately
curl -X POST https://audit-backend-ddew.onrender.com/api/dev/trigger-risk-analysis \
  -H "x-dev-token: YOUR_DEV_TOKEN"

# Verify hash chain
curl -s https://audit-backend-ddew.onrender.com/api/dashboard/chain-integrity \
  -H "Authorization: Bearer YOUR_TOKEN"

# Download PDF compliance report
curl -o report.pdf https://audit-backend-ddew.onrender.com/api/dashboard/compliance-report/download \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## GDPR Articles Demonstrated

| Article | Feature |
|---|---|
| Art. 5(1)(a) | Lawfulness + transparency — every event logged with purpose and legal basis |
| Art. 5(1)(c) | Data minimisation — violations flagged when apps access undeclared fields |
| Art. 7 | Consent management — per-data-type toggles + downloadable receipts |
| Art. 17 | Right to Erasure — hard deletion with cryptographic evidence hash |
| Art. 20 | Data Portability — JSON export with SHA-256 hash chain included |
| Art. 30 | Records of Processing — tamper-evident SHA-256 hash chain on every event |
| Art. 33 | Breach Notification — 72-hour countdown, notify regulator simulation |
| Art. 35 | DPIA reference — AI findings cite DPIA requirements where relevant |

---

## Break-Glass Recovery

If anything breaks during the demo:

| Problem | Fix |
|---|---|
| Dashboard shows no events | Go to `/dev` → Seed Events for both tenants |
| AI chat gives errors | Check active AI provider in `/settings` → AI Settings |
| Risk alerts empty | Go to `/dev` → Run AI Risk Analysis → wait 30s |
| Hash chain shows broken | This is a bug or DB issue — navigate to queue monitor to check job status |
| Render service sleeping | Open backend URL once and wait ~30s for cold start |

---

## Key Technical Differentiators

1. **Tamper-evident SHA-256 hash chain** — provably tamper-evident log, not just logs
2. **AI that knows your data** — AI chat is pre-loaded with the user's actual event context, not generic responses
3. **4 user types** with role-aware navigation and AI context
4. **Real-time SSE streaming** — events appear live without polling
5. **BullMQ async queue** — event ingestion decoupled from storage for resilience
6. **Pre-drafted DPC letters** — actionable GDPR rights, not just information
7. **Consent receipts** — downloadable Art.7 evidence for each consent change

---

*Last updated: 2026-05-08 | DataGuard v18 (Phase 18 complete)*
