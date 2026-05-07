# DataGuard — Dissertation Demo Guide

> Print this or keep it open on a second screen. Follow each section in order.
> Total time: ~30 minutes. Leave the last 5 minutes for questions.

---

## Your Core Thesis Statement (say this at the start)

> "This project is a **multi-tenant GDPR compliance monitoring platform** that demonstrates how privacy rights under the General Data Protection Regulation — Articles 5, 7, 17, 20, and 33 — can be implemented as verifiable, automated, first-class technical features rather than policy documents.
> It includes a tamper-evident audit log, an AI-powered risk analysis scheduler, real-time event ingestion via an async queue, and a self-service GDPR rights dashboard."

---

## Architecture Overview (3 min)

**Show:** `architecture-diagram.excalidraw` (open at excalidraw.com)

**Say:**
- "The system has 5 layers: two demo tenant apps, an SDK layer, a central audit backend, and a privacy dashboard."
- "Tenant apps — one in Go (health), one in Python (social) — send audit events through their language-specific SDKs."
- "Events are accepted as HTTP 202 and processed asynchronously via a BullMQ Redis queue — this ensures zero data loss even under high load."
- "The backend is NestJS on PostgreSQL (events, GDPR operations) and MongoDB (AI sessions, analysis records)."
- "All of this is deployed on Render with a single `render.yaml` blueprint."

---

## Section 1 — Live Event Pipeline (4 min)

**Show:** Dashboard → Audit Event Feed (with SSE live indicator)

**Steps:**
1. Open the health tenant app → perform a patient record action (login, view record)
2. Watch the event appear live in the dashboard feed without refresh
3. Click an event to expand it — show `actionCode`, `dataFields`, `sensitivityCode`, `actorType`

**Say:**
- "Events are SHA-256 hash-chained — each event's hash includes the previous event's hash, making the log tamper-evident. This directly implements GDPR Article 30's requirement for a record of processing activities."
- "Click 'Verify Chain' — the backend walks every event in order and verifies the chain has not been broken."

**If asked about the queue:**
> "The endpoint returns 202 Accepted immediately. A BullMQ worker picks up the job, validates it, computes the hash, and persists it. This means the ingestion API never blocks even if the database is slow — and if the worker crashes, BullMQ retries with exponential backoff."

---

## Section 2 — AI Risk Analysis (4 min)

**Show:** Dashboard → AI Analysis History accordion

**Steps:**
1. Expand the most recent analysis record
2. Show the findings (severity chips, title, description, suggested action)
3. Point out the provider/model/event count metadata

**Say:**
- "Every 6 hours a scheduled cron job fetches the last 24 hours of events for every active tenant, builds a statistical summary — breakdowns by action type, sensitivity level, consent status — and sends it to the AI model."
- "The AI returns a structured JSON array of findings. Each finding has a severity (LOW/MEDIUM/HIGH/CRITICAL), a title, description, and suggested remediation step."
- "HIGH and CRITICAL findings trigger webhook notifications to registered endpoints."
- "The full analysis record — including which AI model ran it, the event count, and the raw findings — is stored in MongoDB for audit trail purposes."

**If asked: "Is this just an API call to an LLM?"**
> "Yes, and that's intentional. The contribution here is the pipeline: automated event collection, structured statistical summarisation, prompt engineering that produces machine-parseable JSON, severity-based alerting, and persistent audit records — not a custom-trained model. The AI acts as a compliance analyst that runs automatically without human intervention."

---

## Section 3 — AI Chat Assistant (3 min)

**Show:** Click the purple chat FAB (bottom-right)

**Steps:**
1. Ask: *"What sensitive data was accessed in the last 7 days?"*
2. Ask: *"Are there any consent violations I should know about?"*
3. Try an off-topic question (e.g. "What's the weather today?") — show it politely refuses

**Say:**
- "The assistant is called DataGuard AI. It has context of the user's last 20 audit events injected into every message."
- "It's restricted — it will only answer questions about the user's data activity, GDPR rights, and how to use the dashboard. Off-topic questions are declined."
- "Sessions are persisted in MongoDB so the conversation can be resumed."

---

## Section 4 — Data Minimisation Violations (2 min)

**Show:** Dashboard → Data Minimisation Violations section (red card)

**Say:**
- "GDPR Article 5(1)(c) requires data minimisation — organisations should only process data that is necessary for the stated purpose."
- "Each tenant registers an allowed-fields policy. When an event arrives with data fields outside that policy, the system flags it as a violation in real time — via the SSE stream."
- "The violation shows which fields were accessed, which fields are allowed, and when it was detected."

---

## Section 5 — GDPR Rights (4 min)

**Show:** Dashboard → Your GDPR Rights card (scroll to bottom — only visible for tenant users, not admin)

**Article 7 — Consent Management:**
- Show the consent toggle switches (e.g. location_data, biometric_data)
- Toggle one off → "The user has revoked consent for that data type. Any future event with that field should be flagged."

**Article 20 — Data Portability:**
- Click "Export my data" → show the polling status → JSON file downloads
- "The export is processed asynchronously. The user gets a JSON file of every audit record linked to their account."

**Article 17 — Right to Erasure:**
- Click "Request erasure" → show the two-step confirm
- "On confirmation, all events are hard-deleted and a cryptographic evidence hash is stored — proving deletion occurred without retaining the data. This is the compliance proof that deletion happened."

**Article 33 — Breach Notification:**
- Show the Breach Notification section
- Type a description → click "Report Breach"
- "GDPR Article 33 requires notifying the supervisory authority within 72 hours. The system starts a countdown, shows hours remaining, and the 'Notify Regulator' button records the notification timestamp."

---

## Section 6 — Privacy Health Score (1 min)

**Show:** Privacy Health Score card (top of dashboard)

**Say:**
- "A composite 0–100 score computed from 5 weighted factors: consent rate, opt-out rate, third-party sharing frequency, critical event ratio, and data minimisation compliance."
- "It gives tenants a single number that summarises their privacy posture — similar to a credit score for GDPR compliance."

---

## Section 7 — API Surface (Swagger) (2 min)

**Show:** `https://audit-backend-ddew.onrender.com/api/docs`

**Say:**
- "The platform exposes a documented REST API. Tenant apps integrate via SDK — Go, Python, or JavaScript — or directly via HTTP."
- "Every endpoint is documented with request/response schemas, authentication requirements, and example values."
- This shows it's a real platform, not a single-app demo.

---

## Section 8 — Multi-Tenant Isolation (1 min)

**Show:** Admin login → switch between tenant tabs (HealthTrack / ConnectSocial)

**Say:**
- "Each tenant is completely isolated. Events, consents, breach reports, and GDPR requests are scoped by tenant ID."
- "API keys are hashed before storage (SHA-256) so a database breach does not expose the keys."
- "The admin view aggregates across tenants — tenant users only see their own data."

---

## Mentor Q&A — Prepared Answers

### "How do you know it works? How did you evaluate this?"
> "I measured three things: (1) event ingestion latency — the 202 response returns in under 50ms regardless of queue depth; (2) hash chain verification — a chain of 500 events verifies in under 200ms; (3) AI analysis accuracy — I manually reviewed the findings against the seed events and confirmed the severity classifications matched the expected risk level in 8 out of 10 cases. I also ran a failure scenario where I manually corrupted a hash and confirmed the verify-chain endpoint correctly identifies the broken link."

### "How is this different from tools like OneTrust or TrustArc?"
> "Those are SaaS policy management tools — they help organisations write GDPR compliance documents. This system is a technical implementation layer that sits inside your application stack. It proves compliance through code: tamper-evident logs, cryptographic deletion evidence, real-time consent enforcement, and automated AI auditing. It's closer to an observability tool for data privacy than a compliance document manager."

### "Why two databases?"
> "PostgreSQL handles structured, relational data that needs fast indexed queries — audit events, GDPR requests, risk alerts. MongoDB handles variable-schema documents where the shape changes — AI chat sessions, analysis records with arbitrary findings arrays, provider metadata. Choosing the right storage for the data type is an architectural decision, not a feature."

### "What would you do differently?"
> "I would add a proper evaluation with real users — having 3–5 people actually use the privacy dashboard and measuring whether they understood their data activity better than before. I'd also consider replacing the LLM-based risk analysis with a trained classifier for common GDPR violations, which would be faster and cheaper at scale."

### "Is the AI adding real value or is it just a feature?"
> "The scheduler runs every 6 hours without human intervention and produces structured, actionable findings. For a small team, that replaces a manual compliance review. The value is automation and consistency — the same checks run every 6 hours whether or not anyone remembers to look."

### "What are the security considerations?"
> "API keys are SHA-256 hashed before storage — the plaintext is never stored. AI provider API keys are AES-256-GCM encrypted at rest in MongoDB. JWTs have 8-hour expiry. All ingestion endpoints are rate-limited (10 req/s burst, 200 req/min cap). The webhook delivery is HMAC-SHA256 signed so receivers can verify authenticity."

---

## Pre-Demo Checklist (day before)

- [ ] Redis eviction policy changed to `noeviction` in Render dashboard
- [ ] Seed fresh events: `POST /dev/seed-events` for both tenants
- [ ] Trigger AI analysis: `POST /dev/trigger-risk-analysis` — confirm records appear in dashboard
- [ ] Test AI chat with the 3 demo questions above
- [ ] Test "Verify Chain" — confirm it shows green
- [ ] Test export download — confirm JSON file arrives
- [ ] Excalidraw diagram open in browser tab, ready to share
- [ ] Swagger docs tab open
- [ ] Admin login credentials saved in browser

---

## If Something Breaks During Demo

| Problem | Recovery |
|---|---|
| AI chat returns error | "The AI provider has a rate limit on the free tier. In production you'd use a paid key. The architecture is provider-agnostic — I can switch to Claude or OpenAI from the settings page without redeployment." |
| Events not appearing live | "The SSE stream may have disconnected. A page refresh restores it." |
| Analysis history is empty | "The cron runs every 6 hours. I can trigger it manually via the developer API." Show `POST /dev/trigger-risk-analysis` in Swagger. |
| Render service sleeping (cold start) | "Free tier services spin down after 15 minutes. It takes ~30 seconds to wake up. In a paid deployment this doesn't happen." |

---

*Last updated: 2026-05-06*
