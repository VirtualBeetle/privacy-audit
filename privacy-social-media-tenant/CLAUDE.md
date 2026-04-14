# CLAUDE.md — Social Media Tenant App

> Authoritative AI implementation guide. Read this before writing or modifying any code.

---

## What This Repo Is

`privacy-social-media-tenant` is a demo social media platform (simplified LinkedIn/Instagram) acting as a tenant of the Privacy Audit and Data Transparency Service (dissertation project by Rakesh Velavaluri, Griffith College Dublin).

It demonstrates how internal data usage — ad targeting, feed recommendations, location sharing with partners, third-party analytics — gets reported to the Privacy Audit Service so users can see it on their privacy dashboard.

---

## Repo Layout

```
privacy-social-media-tenant/
├── CLAUDE.md
├── PORTS.md                       ← all ports and endpoints reference
├── docker-compose.yml
├── .gitignore
├── README.md
├── docs/
│   ├── backend_spec.md
│   ├── frontend_spec.md
│   ├── api_contract.md
│   ├── db_schema.md
│   └── privacy_integration.md
├── backend/
│   ├── main.py
│   ├── .env
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   └── app/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       ├── audit.py
│       ├── models/
│       ├── schemas/
│       ├── middleware/
│       ├── routers/
│       └── seed/
└── frontend/
    ├── vite.config.ts
    ├── .env
    ├── nginx.conf
    ├── Dockerfile
    └── src/
```

---

## Tech Stack (do not change)

| Part | Technology |
|---|---|
| Backend language | Python 3.12 |
| Backend framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic 1.13 |
| DB driver | psycopg2-binary |
| JWT | python-jose[cryptography] |
| Password hashing | passlib[bcrypt] |
| HTTP client (audit) | httpx |
| Frontend | Vite + React + TypeScript |
| Frontend HTTP | axios |
| Frontend routing | react-router-dom v6 |
| Database | PostgreSQL 15 |
| Containerisation | Docker + Docker Compose |

---

## Ports

| Service | Docker host port | Internal port |
|---|---|---|
| Backend API | 8062 | 8082 |
| Frontend | 4002 | 3002 |
| PostgreSQL | 5435 | 5432 |

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=8082
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_tenant
JWT_SECRET=social-demo-secret-change-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
AUDIT_SERVICE_URL=http://localhost:8080
AUDIT_API_KEY=social-tenant-api-key
AUDIT_TENANT_ID=social-tenant-uuid-replace-after-registration
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8062
VITE_APP_NAME=SocialDemo
```

---

## User Roles

| Role | Capabilities |
|---|---|
| `user` | Register, login, create posts, view feed, like/comment, check-ins, privacy settings |
| `admin` | Login only (no self-register), view all users and posts |

Admin accounts are seeded only.

---

## Seed Credentials

| Role | Email | Username | Password |
|---|---|---|---|
| Admin | admin@socialdemo.com | admin | admin123 |
| User 1 | emma.thornton@demo.com | emma_writes | user123 |
| User 2 | luca.marino@demo.com | luca_dev | user123 |
| User 3 | priya.k@demo.com | priya_k | user123 |

---

## Feed Logic

- Feed shows all posts where `visibility = 'public'` OR `visibility = 'friends'`
- Posts where `visibility = 'private'` are only shown to the owner
- No follower system — "friends" means all authenticated users (demo simplification)
- Feed ordered by `created_at DESC`

---

## Privacy Audit Events (all 7 must fire)

| Trigger | action | data_fields | actor_type | reason |
|---|---|---|---|---|
| Feed loads (per user in feed) | READ | username, location, bio | SYSTEM | RECOMMENDATION |
| Feed loads (ad targeting) | READ | location, email | SYSTEM | AD_TARGETING |
| User searches for another user | READ | username, full_name, profile_picture_url | OTHER_USER | SEARCH |
| Post detail viewed | READ | content, created_at | THIRD_PARTY | ANALYTICS |
| Check-in created | SHARE | city, country, place_name | DATA_BROKER | LOCATION_PARTNERSHIP |
| Data export requested | EXPORT | all_fields | SYSTEM | GDPR_REQUEST |
| Account deletion requested | DELETE | all_fields | SYSTEM | GDPR_REQUEST |

All audit events are fire-and-forget via FastAPI `BackgroundTasks`. Never block the primary response.

---

## Code Rules for AI Assistants

1. **Do not change the tech stack.**
2. **Alembic only for schema changes.** No `Base.metadata.create_all()` in production paths.
3. **All JWT tokens contain:** `sub` (user ID as string), `role`, `exp`.
4. **Passwords are bcrypt hashed** via passlib. Never store plain text.
5. **All API responses are JSON.** Use FastAPI's response model or return dicts.
6. **Role checking is a FastAPI dependency** — applied at the router level, not inside handlers.
7. **Seed is idempotent.** Check by email before inserting.
8. **Audit calls use FastAPI BackgroundTasks** — `background_tasks.add_task(audit.send, event)`.
9. **CORS allows all origins in dev.** Use `fastapi.middleware.cors.CORSMiddleware`.
10. **Feed audit events fire once per feed load**, not once per post.

---

## How to Run Locally

```bash
# 1. Start Postgres
docker run -d -p 5435:5432 \
  -e POSTGRES_DB=social_tenant \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15

# 2. Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -c "from app.seed.seed import run; from app.database import SessionLocal; run(SessionLocal())"
uvicorn main:app --reload --port 8082

# 3. Frontend
cd frontend
npm install
npm run dev
```

## How to Run with Docker Compose

```bash
docker-compose up --build
```
