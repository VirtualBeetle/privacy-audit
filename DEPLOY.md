# DataGuard — Deployment Guide

---

## Option A — Local (Docker Compose)

**Requires Docker Desktop only.**

```bash
git clone <repo-url>
cd privacy-audit

chmod +x start.sh
./start.sh          # auto-copies .env.example, starts all 9 services
```

### Local URLs

| Service | URL |
|---|---|
| DataGuard Dashboard | http://localhost:3000 |
| Audit API | http://localhost:8080/api |
| API Docs (Swagger) | http://localhost:8080/api/docs |
| HealthTrack | http://localhost:3001 |
| ConnectSocial | http://localhost:3002 |

### Useful Commands

```bash
make start               # start everything
make stop                # stop (keep data)
make reset               # stop + wipe all data
make logs                # tail all logs
make logs-backend        # tail audit-backend only
make ps                  # show service health

export DEV_TOKEN=dev-secret-change-me
make dev-seed-events TENANT_ID=<uuid>   # seed 20 demo events
make dev-analysis                        # run AI risk analysis now
make dev-digest                          # send weekly email digest now
```

---

## Google OAuth Setup (Local)

Works without Google OAuth (email/token login still works), but "Continue with Google" requires credentials.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services → OAuth consent screen** → External → fill app name, add yourself as test user
3. **APIs & Services → Credentials → Create → OAuth 2.0 Client ID** → Web app
4. Add redirect URI: `http://localhost:8080/api/auth/google/callback`
5. Copy Client ID and Secret into `privacy-audit-infra/.env`:
   ```
   GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<secret>
   ```
6. Restart: `make stop && make start`

---

## Option B — Render (Cloud Hosting)

### Step 1 — MongoDB Atlas (free M0)

1. [mongodb.com/atlas](https://www.mongodb.com/atlas/database) → create free M0 cluster
2. Set username/password, allow `0.0.0.0/0` access
3. **Connect → Drivers** → copy connection string:
   `mongodb+srv://user:pass@cluster.mongodb.net/privacy_audit_ai`

### Step 2 — Deploy via Blueprint

1. Push mono-repo to GitHub
2. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**
3. Connect GitHub repo → Render finds `render.yaml` automatically → **Apply**

### Step 3 — Set Secrets in Render Dashboard

Go to each service's **Environment** tab:

| Variable | Service | How to get |
|---|---|---|
| `JWT_SECRET` | audit-backend | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | audit-backend | `openssl rand -hex 32` (must be 32 chars) |
| `DEV_TOKEN` | audit-backend | Any random secret |
| `SUPER_ADMIN_EMAIL` | audit-backend | Your email |
| `SUPER_ADMIN_PASSWORD` | audit-backend | A secure password |
| `MONGODB_URI` | audit-backend | Atlas connection string from Step 1 |
| `GOOGLE_CLIENT_ID` | audit-backend | Google Cloud Console (optional) |
| `GOOGLE_CLIENT_SECRET` | audit-backend | Google Cloud Console (optional) |
| `ANTHROPIC_API_KEY` | audit-backend | console.anthropic.com (fallback AI) |
| `HEALTH_AUDIT_API_KEY` | health-backend | Must match what's registered in audit service |
| `SOCIAL_AUDIT_API_KEY` | social-backend | Must match what's registered in audit service |
| `VITE_API_URL` | audit-frontend | `https://audit-backend-ddew.onrender.com/api` |

### Step 4 — Google OAuth Redirect URL (if using OAuth)

Add to Google Cloud Console → Credentials → your OAuth client:
```
https://audit-backend-ddew.onrender.com/api/auth/google/callback
```

### Render Free Tier Notes

- Web services **spin down after 15 minutes of inactivity** — first request after sleep takes ~30s
  - Visit the site once before your demo to wake services up
- Free PostgreSQL databases are deleted after 90 days
- Free Redis: 25 MB limit — more than enough
- Redis eviction policy: must be `noeviction` (not `allkeys-lru`) to prevent BullMQ data loss
  - Set this in Render dashboard → Redis service → Configuration

---

## Pre-Demo Checklist (Render)

Run through this before your dissertation demo:

| # | Check | How |
|---|---|---|
| 1 | Super admin env vars set | Render → audit-backend → Environment → `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` |
| 2 | Wake up services | Visit dashboard URL + API health: `/api/health` |
| 3 | BullMQ queue health | Swagger → `GET /dev/queue-status` with `x-dev-token` → want `failed: 0` |
| 4 | Dev token in browser | Dashboard → Settings → Security → paste `DEV_TOKEN` → Save |
| 5 | AI provider configured | Dashboard → Settings → AI → verify active provider |
| 6 | Seed demo events | Dashboard → Dev → "Seed Events" for both tenants |
| 7 | Run risk analysis | Dashboard → Dev → "Trigger Risk Analysis" |
| 8 | Check notifications | Bell icon → should show recent alerts |

---

## Environment Variables — Full Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | localhost | PostgreSQL host |
| `DB_PORT` | Yes | 5432 | PostgreSQL port |
| `DB_USER` | Yes | postgres | PostgreSQL user |
| `DB_PASSWORD` | Yes | postgres | PostgreSQL password |
| `DB_NAME` | Yes | privacy_audit | PostgreSQL database |
| `REDIS_HOST` | Yes | localhost | Redis host |
| `REDIS_PORT` | Yes | 6379 | Redis port |
| `MONGODB_URI` | Yes | mongodb://localhost:27017/... | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Signs all JWTs |
| `ENCRYPTION_KEY` | Yes | — | AES-256-GCM for AI provider keys (32 chars) |
| `DEV_TOKEN` | Yes | dev-secret | Guards `/api/dev/*` endpoints |
| `SUPER_ADMIN_EMAIL` | Yes | — | Creates super admin on startup |
| `SUPER_ADMIN_PASSWORD` | Yes | — | Super admin password |
| `GOOGLE_CLIENT_ID` | OAuth only | — | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth only | — | Google OAuth 2.0 secret |
| `GOOGLE_CALLBACK_URL` | OAuth only | — | Redirect URL after Google login |
| `DASHBOARD_BASE_URL` | Yes | http://localhost:3000 | Frontend URL (for redirects) |
| `ANTHROPIC_API_KEY` | AI fallback | — | Claude fallback if no DB provider set |
| `SMTP_HOST` | Email only | — | SMTP server (Mailtrap recommended) |
| `SMTP_PORT` | Email only | 587 | SMTP port |
| `SMTP_USER` | Email only | — | SMTP username |
| `SMTP_PASS` | Email only | — | SMTP password |
| `FROM_EMAIL` | Email only | — | Sender email address |
| `PORT` | Yes | 8080 | HTTP port |
| `VITE_API_URL` | Frontend | — | Backend URL for React build |
