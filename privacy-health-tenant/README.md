# Privacy Health Tenant Demo App

Demo healthcare application for the Privacy Audit and Data Transparency Service dissertation project (Rakesh Velavaluri, Griffith College Dublin).

## Quick Start

### Option A — Docker Compose (recommended)

```bash
# From repo root
docker-compose up --build
```

- Frontend: http://localhost:3001
- Backend API: http://localhost:8081
- PostgreSQL: localhost:5433

### Option B — Local (requires Go 1.21+ and Node 22.12+)

```bash
# 1. Start Postgres
docker run -d -p 5433:5432 \
  -e POSTGRES_DB=health_tenant \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15

# 2. Backend
cd backend
go mod tidy
go run main.go --seed     # --seed seeds the DB on first run

# 3. Frontend
cd frontend
npm install
npm run dev
```

## Demo Credentials

| Role    | Email                          | Password   |
|---------|-------------------------------|------------|
| Doctor  | sarah.mitchell@healthdemo.com | doctor123  |
| Patient | james.obrien@demo.com         | patient123 |
| Patient | aoife.byrne@demo.com          | patient123 |
| Patient | conor.walsh@demo.com          | patient123 |

## Architecture

See `docs/` for full specification:
- `CLAUDE.md` — AI implementation guide
- `docs/backend_spec.md` — backend implementation detail
- `docs/frontend_spec.md` — frontend implementation detail
- `docs/api_contract.md` — all API endpoints
- `docs/db_schema.md` — database schema
- `docs/privacy_integration.md` — privacy audit event integration

## Privacy Audit Integration

When a doctor views patient records or profile, the app fires audit events to the Privacy Audit Service (`AUDIT_SERVICE_URL`). If the service is not running, events are logged and dropped — the primary app flow is unaffected.

Configure `AUDIT_SERVICE_URL`, `AUDIT_API_KEY`, and `AUDIT_TENANT_ID` in `backend/.env`.
