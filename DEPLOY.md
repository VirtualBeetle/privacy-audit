# Deployment Guide

## Option A — Local (Docker Compose) — Fastest

### Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- No other dependencies needed

### Steps

```bash
# 1. Clone the project
git clone <your-repo-url>
cd project

# 2. Start everything (auto-copies .env.example if missing)
chmod +x start.sh
./start.sh

# OR using Make
make start
```

That's it. The script handles `.env` setup and starts all 9 services.

### Service URLs (local)
| Service | URL |
|---|---|
| Privacy Dashboard | http://localhost:3000 |
| Audit API | http://localhost:8080/api |
| API Docs (Swagger) | http://localhost:8080/api/docs |
| HealthTrack App | http://localhost:3001 |
| ConnectSocial App | http://localhost:3002 |

### Useful commands
```bash
make logs           # tail all logs
make logs-backend   # tail audit-backend only
make ps             # show service health
make seed           # seed demo data
make stop           # stop (keep data)
make reset          # stop + wipe data (fresh start)

# Manual triggers for demo:
export DEV_TOKEN=dev-secret-change-me
make dev-analysis   # run AI risk analysis now
make dev-digest     # send weekly email digest now
```

---

## Option B — Render (Free Cloud Hosting) — Share with Mentor

Render lets you deploy all services for free. No credit card needed for the free tier.

### Step 1 — Push code to GitHub

Push all repos to a GitHub account (can be a single mono-repo or separate repos).

### Step 2 — Set up MongoDB Atlas (free)

MongoDB Atlas provides a free M0 cluster (512MB, enough for this project):

1. Go to https://www.mongodb.com/atlas/database
2. Create a free account → "Build a database" → M0 Free tier
3. Set username/password, allow access from `0.0.0.0/0` (for Render)
4. Click "Connect" → "Drivers" → copy the connection string:
   `mongodb+srv://username:password@cluster.mongodb.net/privacy_audit_ai`

### Step 3 — Deploy to Render via Blueprint

1. Go to https://dashboard.render.com
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render will find `privacy-audit-infra/render.yaml` automatically
5. Review the services and click **Apply**

### Step 4 — Set required secrets in Render dashboard

After blueprint deploys, go to each service's **Environment** tab and set:

| Variable | Where | Notes |
|---|---|---|
| `JWT_SECRET` | audit-backend | Run `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | audit-backend | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | audit-backend | From Google Cloud Console |
| `ANTHROPIC_API_KEY` | audit-backend | From console.anthropic.com |
| `MONGODB_URI` | audit-backend | From MongoDB Atlas Step 2 |
| `SMTP_HOST/USER/PASS` | audit-backend | From Mailtrap or Gmail |
| `DEV_TOKEN` | audit-backend | Any random secret |
| `HEALTH_AUDIT_API_KEY` | health-backend | Must match what you register in audit service |
| `SOCIAL_AUDIT_API_KEY` | social-backend | Must match what you register in audit service |

### Step 5 — Update Google OAuth callback URL

In Google Cloud Console → Credentials → your OAuth 2.0 client, add:
```
https://audit-backend.onrender.com/api/auth/google/callback
```

### Render URLs (after deploy)
| Service | URL |
|---|---|
| Privacy Dashboard | https://audit-frontend.onrender.com |
| Audit API | https://audit-backend.onrender.com/api |
| API Docs | https://audit-backend.onrender.com/api/docs |
| HealthTrack App | https://health-frontend.onrender.com |
| ConnectSocial App | https://social-frontend.onrender.com |

### Notes on Render Free Tier
- Free web services **spin down after 15 minutes of inactivity** — first request after sleep takes ~30s
- Free PostgreSQL databases are deleted after 90 days (upgrade to $7/mo to persist)
- For a dissertation demo, the free tier is fine — just visit the site once before the demo to wake services up
- Render's free Redis has a 25MB limit — more than enough for this project

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | localhost | PostgreSQL host |
| `DB_PORT` | Yes | 5432 | PostgreSQL port |
| `DB_USER` | Yes | postgres | PostgreSQL user |
| `DB_PASSWORD` | Yes | postgres | PostgreSQL password |
| `DB_NAME` | Yes | privacy_audit | PostgreSQL database |
| `REDIS_HOST` | Yes | localhost | Redis host |
| `REDIS_PORT` | Yes | 6379 | Redis port |
| `MONGODB_URI` | Yes | mongodb://... | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Shared JWT signing secret |
| `GOOGLE_CLIENT_ID` | OAuth only | — | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth only | — | Google OAuth 2.0 secret |
| `GOOGLE_CALLBACK_URL` | OAuth only | — | Redirect URL after Google login |
| `DASHBOARD_BASE_URL` | Yes | http://localhost:3000 | Frontend URL (for redirects) |
| `ANTHROPIC_API_KEY` | AI only | — | Claude API key |
| `SMTP_HOST` | Email only | sandbox.smtp.mailtrap.io | SMTP server |
| `SMTP_PORT` | Email only | 587 | SMTP port |
| `SMTP_USER` | Email only | — | SMTP username |
| `SMTP_PASS` | Email only | — | SMTP password |
| `FROM_EMAIL` | Email only | — | Sender email address |
| `DEV_TOKEN` | Dev only | dev-secret | Guards /api/dev/* endpoints |
| `PORT` | Yes | 8080 | HTTP port |
