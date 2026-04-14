# Privacy Audit — Infrastructure

This folder contains everything needed to run the full platform locally or deploy to Render.

## Local Setup (One Command)

From the **repo root**:

```bash
./start.sh        # First time: checks Docker, copies .env, starts all 9 services
```

Or using Make:

```bash
make start        # Start everything
make stop         # Stop (keeps data)
make reset        # Stop + wipe all data
make logs         # Tail all logs (colour-coded, one stream)
make logs SERVICE=audit-backend   # Tail one service only
make status       # Show container health table
```

### Service URLs (local)

| Service | URL |
|---|---|
| Privacy Dashboard | http://localhost:3000 |
| Audit REST API | http://localhost:8080/api |
| API Docs (Swagger) | http://localhost:8080/api/docs |
| HealthTrack App | http://localhost:3001 |
| ConnectSocial App | http://localhost:3002 |

---

## Environment Variables

Copy `.env.example` → `.env` and fill in secrets:

```bash
cp .env.example .env
```

| Variable | Required | Default (local) | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | change-me | Signs all JWTs — use `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Yes | change-me | AES-256 key for storing AI provider API keys in DB |
| `GOOGLE_CLIENT_ID` | OAuth only | — | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth only | — | From Google Cloud Console |
| `ANTHROPIC_API_KEY` | AI bootstrap | — | Used before AI providers are configured in DB |
| `MONGODB_URI` | Yes | mongodb://mongo:27017/... | MongoDB connection |
| `SMTP_HOST` | Email only | sandbox.smtp.mailtrap.io | SMTP server |
| `SMTP_USER/PASS` | Email only | — | SMTP credentials |
| `FROM_EMAIL` | Email only | — | Sender address |
| `DEV_TOKEN` | Dev tools | dev-secret-change-me | Guards `/api/dev/*` endpoints |
| `HEALTH_AUDIT_API_KEY` | Yes | health-tenant-api-key | API key for health tenant |
| `SOCIAL_AUDIT_API_KEY` | Yes | social-tenant-api-key | API key for social tenant |

---

## Logs — How to Read Them

Docker Compose colour-codes logs by service. With `make logs` you get all 9 services in one stream:

```
privacy-audit-backend   | [NestJS] POST /api/events → 202
privacy-redis           | 1:M Ready to accept connections
privacy-postgres-audit  | database system is ready
privacy-mongo           | Waiting for connections
```

Filter to one service:
```bash
make logs SERVICE=audit-backend      # NestJS backend only
make logs SERVICE=mongo              # MongoDB only
make logs SERVICE=social-backend     # Social FastAPI only
LINES=500 make logs SERVICE=audit-backend   # Last 500 lines
```

---

## Render Deployment

See `../DEPLOY.md` for full instructions. The `render.yaml` at the repo root defines all services.

Key points:
- `render.yaml` **must** be at the repo root — that is where it lives in this mono-repo.
- Free tier web services spin down after 15 min of inactivity (first request ~30s after sleep).
- MongoDB Atlas free M0 tier is required for MongoDB (Render does not host Mongo).
- Set secrets in the Render dashboard under each service's **Environment** tab.

---

## Developer Triggers (demo day)

```bash
export DEV_TOKEN=dev-secret-change-me   # matches DEV_TOKEN in .env

make dev-analysis      # Run AI risk analysis immediately
make dev-digest        # Send weekly email digest now
make dev-retention     # Run data retention purge now
make dev-seed-events TENANT_ID=<uuid>   # Seed 20 events for a tenant
```

---

## Services in docker-compose.yml

| Container | Image | Ports | Purpose |
|---|---|---|---|
| `privacy-postgres-audit` | postgres:15-alpine | 5432 | Core audit + user data |
| `privacy-postgres-health` | postgres:15-alpine | 5433 | HealthTrack tenant data |
| `privacy-postgres-social` | postgres:15-alpine | 5435 | ConnectSocial tenant data |
| `privacy-redis` | redis:7-alpine | 6379 | BullMQ event queue |
| `privacy-mongo` | mongo:7 | 27017 | AI chat + analysis storage |
| `privacy-audit-backend` | local build | 8080 | NestJS core service |
| `privacy-audit-frontend` | local build | 3000 | React dashboard |
| `privacy-health-backend` | local build | 8081 | Go health tenant |
| `privacy-social-backend` | local build | 8062 | FastAPI social tenant |
