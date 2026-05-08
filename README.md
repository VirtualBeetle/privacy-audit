# DataGuard — Privacy Audit & Data Transparency Service

**Rakesh Velavaluri · Griffith College Dublin · MSc Dissertation**

A production-grade, multi-tenant GDPR compliance platform. Tenant apps (HealthTrack, ConnectSocial) send data-access events to DataGuard via SDK. Users then see exactly how their data was used — with SHA-256 tamper-proof audit logs, AI-powered risk analysis, real-time streaming chat, and self-service GDPR rights.

---

## Documentation

| Doc | What's in it |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Complete technical architecture — auth flows, SSE protocol, DB schemas, API endpoints, AI streaming |
| [PRODUCT.md](PRODUCT.md) | Feature set, product decisions log, remaining roadmap (P0 → P3) |
| [PROGRESS_TRACKER.md](PROGRESS_TRACKER.md) | Task status for all 310 implementation tasks across all phases |
| [DEPLOY.md](DEPLOY.md) | Local Docker Compose setup + Render cloud deployment guide + env vars |
| [CREDENTIALS.md](CREDENTIALS.md) | Demo login credentials for all user types |
| [DEMO_GUIDE.md](DEMO_GUIDE.md) | 30-minute dissertation demo script with talking points |
| [DB_BACKUP_GUIDE.md](DB_BACKUP_GUIDE.md) | Render free-tier DB backup & restore — 2-command workflow |

---

## Design System

DataGuard uses a custom CSS token system (no Tailwind utility classes for colors):

| Token | Value | Use |
|---|---|---|
| `--brand` | `#f97316` orange | Logo, CTAs, breach alerts |
| `--accent` | `#7c3aed` / `#8b5cf6` | Active states, links, AI elements |
| `--bg` | `#f4f4fa` / `#0d0d12` | Page background |
| `--surface` | `#ffffff` / `#16161d` | Card backgrounds |

Sidebar: 216px labeled with OVERVIEW / TOOLS sections, user avatar, orange brand logo.

---

## Quick Start (Local)

**Requires Docker Desktop only — no Node, Python, or Go needed locally.**

```bash
git clone <repo-url>
cd privacy-audit

chmod +x start.sh
./start.sh
```

First run: ~3–5 minutes (builds images). Subsequent starts: ~30 seconds.

### Local URLs

| App | URL |
|---|---|
| DataGuard Dashboard | http://localhost:3000 |
| Audit API | http://localhost:8080/api |
| API Docs (Swagger) | http://localhost:8080/api/docs |
| HealthTrack | http://localhost:3001 |
| ConnectSocial | http://localhost:3002 |

### Nice URLs (optional, run once)

```bash
sudo ./setup-hosts.sh
# Adds dataguard.local / health.local / social.local to /etc/hosts
```

---

## Demo Accounts

### DataGuard Admin Login

| Role | Email | Password |
|---|---|---|
| Super Admin | Set via `SUPER_ADMIN_EMAIL` env | Set via `SUPER_ADMIN_PASSWORD` env |
| HealthTrack Admin | admin@healthdemo.internal | HealthDemo123! |
| ConnectSocial Admin | admin@socialdemo.internal | SocialDemo123! |

### HealthTrack Users (for "View My Privacy Dashboard" flow)

| Role | Email | Password |
|---|---|---|
| Patient | james.obrien@demo.com | patient123 |
| Patient | aoife.byrne@demo.com | patient123 |
| Doctor | sarah.mitchell@healthdemo.com | doctor123 |

### ConnectSocial Users

| Role | Email | Password |
|---|---|---|
| User | emma.thornton@demo.com | user123 |
| User | luca.marino@demo.com | user123 |
| Admin | admin@socialdemo.com | admin123 |

---

## The Core Demo Flow

1. Open **HealthTrack** → log in as a patient
2. Go to **Privacy Settings** → click **"View My Privacy Dashboard"**
3. Land directly on **DataGuard** (no second login)
4. See the full tamper-evident audit trail of how your health data was used

---

## Useful Commands

```bash
make start              # start all 9 services
make stop               # stop (keep data)
make reset              # stop + wipe all data (fresh start)
make logs               # tail all service logs
make logs-backend       # tail audit-backend only
make ps                 # show service health status

# Demo triggers (set DEV_TOKEN first)
export DEV_TOKEN=dev-secret-change-me
make dev-seed-events TENANT_ID=<uuid>   # inject 20 demo events
make dev-analysis                        # run AI risk analysis now
make dev-digest                          # send weekly email digest now

# One-shot demo script
./scripts/demo-onboard.sh               # register tenant → events → print URLs
```

---

## Optional Features

Edit `privacy-audit-infra/.env` to enable:

| Feature | Variable(s) |
|---|---|
| AI risk analysis + DataGuard AI chat | `ANTHROPIC_API_KEY` (fallback) or set provider via UI |
| Google Sign-In | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| Email digests | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` |

After editing, restart: `make stop && make start`

---

## Architecture (High Level)

```
Browser
├── DataGuard (React)    ←→  audit-backend (NestJS :8080)
├── HealthTrack (React)  ←→  health-backend (Go :8081)
└── ConnectSocial (React)←→  social-backend (FastAPI :8082)

audit-backend connects to:
├── PostgreSQL :5432   audit events, tenants, users, GDPR requests
├── MongoDB    :27017  AI chat sessions, risk analysis, notifications
└── Redis      :6379   BullMQ event processing queue

health-backend  → PostgreSQL :5433  (patient records)
social-backend  → PostgreSQL :5435  (social data)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Backend | NestJS + TypeScript + TypeORM |
| Frontend | React + Vite + TypeScript + MUI + Recharts |
| Database | PostgreSQL (events, GDPR) + MongoDB (AI, notifications) |
| Queue | BullMQ + Redis |
| Auth | JWT + API Key + Google OAuth (Passport.js) |
| AI | Claude / Gemini / OpenAI (switchable, keys AES-256 encrypted) |
| Streaming | Server-Sent Events (SSE) via fetch ReadableStream |
| Containers | Docker Compose (9 services) |
| Cloud | Render (backend + frontends) + MongoDB Atlas |
| SDKs | Go, Python, JS/TS |

---

## Troubleshooting

**Port conflict:**
```bash
lsof -i :3000   # find what's using the port
```

**"View my privacy" shows expired token:**
The handshake token is valid 15 minutes. Go back to the tenant app and click the button again.

**AI features not responding:**
Go to DataGuard → Settings → configure an AI provider, or set `ANTHROPIC_API_KEY` in `.env`.

**Fresh start:**
```bash
docker compose -f privacy-audit-infra/docker-compose.yml down -v
./start.sh
```
