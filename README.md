# Privacy Audit & Data Transparency Service
**Rakesh Velavaluri — Griffith College Dublin — MSc Dissertation Project**

A production-grade GDPR compliance platform demonstrating privacy-by-design across three interconnected applications:

| App | What it is | URL (after setup) |
|---|---|---|
| **DataGuard** | Privacy dashboard — users see all their data access history | http://dataguard.local |
| **HealthTrack** | Demo healthcare app sending audit events | http://health.local |
| **ConnectSocial** | Demo social media app sending audit events | http://social.local |
| **API Docs** | Swagger UI for the audit REST API | http://api.dataguard.local/api/docs |

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | 4.x+ | https://docs.docker.com/get-docker/ |
| Git | any | pre-installed on Mac/Linux |

That's it. No Node.js, Python, or Go needed locally — everything runs in Docker.

---

## Quick Start (2 steps)

### Step 1 — Clone and start

```bash
git clone <repo-url>
cd project

chmod +x start.sh
./start.sh
```

First run takes 3–5 minutes (builds all Docker images). Subsequent starts take ~30 seconds.

### Step 2 — Set up nice URLs (optional but recommended, run once)

```bash
sudo ./setup-hosts.sh
```

This adds four entries to `/etc/hosts` so you can use `dataguard.local` instead of `localhost:3000`. It's a one-time step. If you skip it, the app works on `localhost:3000/3001/3002`.

---

## Demo Accounts

### HealthTrack
| Role | Email | Password |
|---|---|---|
| Patient | james.obrien@demo.com | patient123 |
| Patient | aoife.byrne@demo.com | patient123 |
| Doctor | sarah.mitchell@healthdemo.com | doctor123 |

### ConnectSocial
| Role | Email | Password |
|---|---|---|
| User | emma.thornton@demo.com | user123 |
| User | luca.marino@demo.com | user123 |
| Admin | admin@socialdemo.com | admin123 |

---

## The Core Demo Flow

1. Open **HealthTrack** → `http://health.local` → log in as a patient
2. Go to **Privacy Settings** (in the navbar)
3. Click **"View My Privacy Dashboard"**
4. You land directly on **DataGuard** — no second login needed
5. See the full audit trail of how your health data was accessed

---

## Enabling Optional Features

Edit `privacy-audit-infra/.env` to enable these features:

| Feature | Variable(s) to set | Where to get them |
|---|---|---|
| AI risk analysis & chat | `ANTHROPIC_API_KEY` | console.anthropic.com |
| Google Sign-In | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google Cloud Console (see below) |
| Email digests | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` | Mailtrap.io (free) |

After editing `.env`, restart with: `docker compose -f privacy-audit-infra/docker-compose.yml up -d`

### Google OAuth setup (5 minutes)
1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. **Create Credentials** → OAuth 2.0 Client ID → Web application
3. Add `http://localhost:8080/api/auth/google/callback` under **Authorised redirect URIs**
4. Copy Client ID and Client Secret into `privacy-audit-infra/.env`

---

## Useful Commands

```bash
# Start everything
./start.sh

# Stop (keeps data)
docker compose -f privacy-audit-infra/docker-compose.yml stop

# Stop and wipe all data (fresh start)
docker compose -f privacy-audit-infra/docker-compose.yml down -v

# View logs
docker compose -f privacy-audit-infra/docker-compose.yml logs -f

# View logs for one service
docker compose -f privacy-audit-infra/docker-compose.yml logs -f audit-backend

# Seed demo events for AI analysis
export DEV_TOKEN=dev-secret-change-me
curl -X POST http://localhost:8080/api/dev/seed-events \
  -H "Content-Type: application/json" \
  -H "x-dev-token: $DEV_TOKEN" \
  -d '{"tenantId": "11111111-1111-1111-1111-111111111111"}'

# Trigger AI risk analysis
curl -X POST http://localhost:8080/api/dev/trigger-risk-analysis \
  -H "x-dev-token: $DEV_TOKEN"
```

---

## Architecture (High Level)

```
Browser
├── dataguard.local  →  audit-frontend (React)  ←→  audit-backend (NestJS :8080)
├── health.local     →  health-frontend (React)  ←→  health-backend (Go :8081)
└── social.local     →  social-frontend (React)  ←→  social-backend (FastAPI :8082)

audit-backend connects to:
├── PostgreSQL :5442   (audit events, tenants, users)
├── MongoDB    :27017  (AI chat history, risk analysis)
└── Redis      :6379   (BullMQ event queue)

health-backend  →  PostgreSQL :5433  (patient data)
social-backend  →  PostgreSQL :5435  (social data)

All three backends send privacy audit events to audit-backend via API key auth.
```

---

## Troubleshooting

**Services won't start / port conflict**
```bash
# Check what's using a port
lsof -i :3000
# If another app is on 3000, stop it first
```

**"View my privacy" shows expired token error**
The handshake token is valid for 15 minutes. Go back to the tenant app and click the button again.

**AI features not working**
Set `ANTHROPIC_API_KEY` in `.env` and restart `audit-backend`.

**Need a completely fresh start**
```bash
docker compose -f privacy-audit-infra/docker-compose.yml down -v
./start.sh
```

---

## Project Structure

```
project/
├── README.md                    ← You are here
├── start.sh                     ← One-command startup
├── setup-hosts.sh               ← Nice URL setup (run once with sudo)
├── Makefile                     ← Shortcut commands
├── PORTS.md                     ← All ports and endpoints reference
├── DEPLOY.md                    ← Render cloud deployment guide
├── docs/                        ← Phase specs and progress trackers
├── privacy-audit-backend/       ← NestJS core audit service
├── privacy-audit-frontend/      ← React privacy dashboard (DataGuard)
├── privacy-health-tenant/       ← Go + React healthcare demo app
├── privacy-social-media-tenant/ ← FastAPI + React social demo app
├── privacy-audit-sdk/           ← TypeScript + Python SDKs
└── privacy-audit-infra/         ← Docker Compose, nginx, .env
```

---

*Built with NestJS · Go · FastAPI · React · PostgreSQL · MongoDB · Redis · Docker*
