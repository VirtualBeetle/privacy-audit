# CLAUDE.md — Health Tenant App

> This file is the authoritative AI implementation guide for this repository.
> Any AI assistant (Claude Code, Copilot, Cursor, etc.) must read this before writing or modifying any code.

---

## What This Repo Is

`privacy-health-tenant` is a **demo healthcare platform** that acts as a tenant of the Privacy Audit and Data Transparency Service (the core dissertation project by Rakesh Velavaluri, Griffith College Dublin).

Its purpose is to simulate a realistic healthcare application that:
1. Manages patients, doctors, medical records, appointments, insurance, and emergency contacts
2. Integrates with the Privacy Audit Service by reporting data access events via the Go SDK
3. Provides patients with a link to view their full privacy audit trail on the Privacy Audit Dashboard

---

## Repo Layout

```
privacy-health-tenant/
├── CLAUDE.md                  ← you are here
├── docker-compose.yml
├── .gitignore
├── README.md
├── docs/
│   ├── backend_spec.md        ← full backend implementation spec
│   ├── frontend_spec.md       ← full frontend implementation spec
│   ├── api_contract.md        ← all API endpoints with request/response shapes
│   ├── db_schema.md           ← database schema and relationships
│   └── privacy_integration.md ← how and where to fire privacy audit events
├── backend/                   ← Go + Gin + GORM
│   ├── main.go
│   ├── .env
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   ├── config/
│   ├── models/
│   ├── handlers/
│   ├── middleware/
│   ├── routes/
│   └── seed/
└── frontend/                  ← Vite + React + TypeScript
    ├── index.html
    ├── vite.config.ts
    ├── .env
    ├── package.json
    └── src/
```

---

## Tech Stack (do not change)

| Part | Technology | Version |
|---|---|---|
| Backend language | Go | 1.21+ |
| Backend framework | Gin | latest |
| ORM | GORM | latest |
| DB driver | gorm/driver/postgres | latest |
| JWT | golang-jwt/jwt/v5 | v5 |
| Env loader | joho/godotenv | latest |
| HTTP client (for SDK) | net/http (stdlib) | — |
| Frontend scaffold | Vite + React + TypeScript | latest |
| HTTP client (frontend) | axios | latest |
| Routing (frontend) | react-router-dom v6 | latest |
| Database | PostgreSQL 15 | — |
| Container | Docker + Docker Compose | — |

---

## Ports

| Service | Port |
|---|---|
| Backend API | 8081 |
| Frontend | 3001 |
| PostgreSQL (host-mapped) | 5433 → 5432 |

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=8081
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=health_tenant
JWT_SECRET=health-demo-secret-change-in-prod
AUDIT_SERVICE_URL=http://localhost:8080
AUDIT_API_KEY=health-tenant-api-key
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8081
VITE_APP_NAME=HealthDemo
```

---

## User Roles

| Role | Permissions |
|---|---|
| `patient` | Register, login, view/edit own profile, view own records/appointments/insurance/emergency contacts, request export/deletion, get privacy dashboard link |
| `doctor` | Login only (no self-register), view assigned patient list, view any patient's full records and appointments |

**Doctor accounts are seeded only — no self-registration endpoint for doctors.**

---

## Seed Credentials (for testing)

| Role | Email | Password |
|---|---|---|
| Doctor | sarah.mitchell@healthdemo.com | doctor123 |
| Patient 1 | james.obrien@demo.com | patient123 |
| Patient 2 | aoife.byrne@demo.com | patient123 |
| Patient 3 | conor.walsh@demo.com | patient123 |

---

## Privacy Audit Integration Rules

The Health App must fire audit events to the Privacy Audit Service at these exact moments:

| Trigger | action_code | data_fields | actor_type | reason_code |
|---|---|---|---|---|
| Doctor views patient profile | READ | full_name, dob, blood_type | EMPLOYEE | TREATMENT |
| Doctor views patient medical records | READ | diagnosis, prescriptions, test_results | EMPLOYEE | TREATMENT |
| System sends appointment reminder (seed) | READ | full_name, phone, email | SYSTEM | APPOINTMENT_REMINDER |
| Insurance details accessed | READ | policy_number, coverage_type | SYSTEM | BILLING |
| Patient requests data export | EXPORT | all fields | SYSTEM | GDPR_REQUEST |
| Patient requests account deletion | DELETE | all fields | SYSTEM | GDPR_REQUEST |

**Rule:** If `AUDIT_SERVICE_URL` is set, always attempt the SDK call. If the audit service is unreachable, log the error but do NOT fail the primary request. Audit reporting is fire-and-forget with best-effort delivery.

---

## Code Rules for AI Assistants

1. **Do not change the tech stack.** No extra frameworks, no ORMs other than GORM, no alternative routers.
2. **Do not add features beyond the spec.** If a feature isn't in `docs/`, don't build it.
3. **GORM AutoMigrate only.** No raw SQL migrations. The `config/db.go` `AutoMigrate` call handles schema.
4. **All JWT claims must include:** `user_id` (UUID string), `role` (string), `exp` (expiry).
5. **Passwords must be bcrypt hashed.** Never store plain text.
6. **All API responses must be JSON.** Use `c.JSON(statusCode, gin.H{...})`.
7. **Role middleware must be applied at the route group level** — not inside individual handlers.
8. **Seed must be idempotent.** Running seed twice must not duplicate data (check by email before inserting).
9. **Privacy audit calls are fire-and-forget.** Wrap in a goroutine or call synchronously but never block the response.
10. **Frontend API calls go through `api/client.ts` only.** Never use `fetch` directly in pages/components.

---

## How to Run Locally (without Docker)

```bash
# 1. Start Postgres (or use Docker)
docker run -d -p 5433:5432 -e POSTGRES_DB=health_tenant -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:15

# 2. Run backend
cd backend
cp .env.example .env   # or create .env manually
go run main.go --seed  # --seed flag runs seed on first boot

# 3. Run frontend
cd frontend
npm install
npm run dev
```

## How to Run with Docker Compose

```bash
docker-compose up --build
```

---

## Spec Files Index

| File | What it covers |
|---|---|
| `docs/backend_spec.md` | All models, handlers, middleware, routes — full implementation detail |
| `docs/frontend_spec.md` | All pages, components, context, hooks — full implementation detail |
| `docs/api_contract.md` | Request/response shapes for every endpoint |
| `docs/db_schema.md` | PostgreSQL schema, GORM model tags, relationships |
| `docs/privacy_integration.md` | Exact event payloads to send to the audit service |
