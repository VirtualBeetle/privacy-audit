# Master Ports & Endpoints Reference
# Privacy Audit and Data Transparency Service — All Services

> Single source of truth for all ports, URLs, and credentials across the entire project.
> Keep this file updated whenever ports change.

---

## Port Map Overview

| Service | Repo | Host Port | Internal Port | URL |
|---|---|---|---|---|
| Health Tenant Frontend | privacy-health-tenant | **4001** | 3001 | http://localhost:4001 |
| Health Tenant Backend API | privacy-health-tenant | **8061** | 8081 | http://localhost:8061 |
| Health Tenant PostgreSQL | privacy-health-tenant | **5433** | 5432 | localhost:5433 |
| Social Media Frontend | privacy-social-media-tenant | **4002** | 3002 | http://localhost:4002 |
| Social Media Backend API | privacy-social-media-tenant | **8062** | 8082 | http://localhost:8062 |
| Social Media PostgreSQL | privacy-social-media-tenant | **5435** | 5432 | localhost:5435 |
| Privacy Audit Backend | privacy-audit-backend | **8080** | 8080 | http://localhost:8080 |
| Privacy Audit Frontend | privacy-audit-frontend | **3000** | 3000 | http://localhost:3000 |
| Privacy Audit PostgreSQL | privacy-audit-infra | **5432** | 5432 | localhost:5432 |

> Ports 4001–4002 are frontend browser URLs.
> Ports 8061–8062 are backend API URLs (used by frontends and for direct testing).
> Ports 5432–5435 are database ports (only needed for direct DB access).

---

## Health Tenant — `privacy-health-tenant`

### Run
```bash
cd privacy-health-tenant
docker-compose up --build
```

### URLs
| What | URL |
|---|---|
| Patient / Doctor Login | http://localhost:4001/login |
| API Base | http://localhost:8061/api |

### Credentials
| Role | Email | Password |
|---|---|---|
| Doctor | sarah.mitchell@healthdemo.com | doctor123 |
| Patient | james.obrien@demo.com | patient123 |
| Patient | aoife.byrne@demo.com | patient123 |
| Patient | conor.walsh@demo.com | patient123 |

### Key Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/patient/me
GET    /api/patient/records
GET    /api/patient/appointments
GET    /api/patient/emergency-contacts
GET    /api/patient/insurance
GET    /api/doctor/patients
GET    /api/doctor/patients/:id
GET    /api/doctor/patients/:id/records
GET    /api/doctor/patients/:id/appointments
GET    /api/privacy/dashboard-link
POST   /api/privacy/export
DELETE /api/privacy/delete
```

### Privacy Audit Events
| Trigger | Action | Sensitivity |
|---|---|---|
| Doctor views patient profile | READ | HIGH |
| Doctor views medical records | READ | CRITICAL |
| Insurance details accessed | READ | MEDIUM |
| Data export requested | EXPORT | HIGH |
| Account deletion requested | DELETE | HIGH |

---

## Social Media Tenant — `privacy-social-media-tenant`

### Run
```bash
cd privacy-social-media-tenant
docker-compose up --build
```

### URLs
| What | URL |
|---|---|
| User / Admin Login | http://localhost:4002/login |
| API Base | http://localhost:8062/api |
| API Docs (FastAPI) | http://localhost:8062/docs |

### Credentials
| Role | Email | Username | Password |
|---|---|---|---|
| Admin | admin@socialdemo.com | admin | admin123 |
| User | emma.thornton@demo.com | emma_writes | user123 |
| User | luca.marino@demo.com | luca_dev | user123 |
| User | priya.k@demo.com | priya_k | user123 |

### Key Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me
PUT    /api/users/me
GET    /api/users/search?q=
GET    /api/posts/feed
POST   /api/posts
GET    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/like
POST   /api/posts/:id/comments
GET    /api/posts/:id/comments
GET    /api/checkins
POST   /api/checkins
GET    /api/admin/users
GET    /api/admin/posts
GET    /api/privacy/dashboard-link
POST   /api/privacy/export
DELETE /api/privacy/delete
GET    /health
```

### Privacy Audit Events
| Trigger | Action | Actor | Sensitivity |
|---|---|---|---|
| Feed loads (per author) | READ | SYSTEM | MEDIUM |
| Feed loads (ad targeting) | READ | SYSTEM | HIGH |
| User searched | READ | OTHER_USER | LOW |
| Post detail viewed | READ | THIRD_PARTY | MEDIUM |
| Check-in created | SHARE | DATA_BROKER | HIGH |
| Data export requested | EXPORT | SYSTEM | HIGH |
| Account deletion requested | DELETE | SYSTEM | HIGH |

---

## Privacy Audit Service — `privacy-audit-backend` (planned)

### URLs (when built)
| What | URL |
|---|---|
| API | http://localhost:8080/api |
| Event ingestion | POST http://localhost:8080/api/events |
| Tenant registration | POST http://localhost:8080/api/tenants |

### Integration (from tenant backends)
```
POST http://localhost:8080/api/events
Headers:
  Content-Type: application/json
  X-API-Key: <tenant-api-key>
```

---

## Privacy Audit Dashboard — `privacy-audit-frontend` (planned)

| What | URL |
|---|---|
| Dashboard | http://localhost:3000/dashboard |
| User privacy view | http://localhost:3000/dashboard?tenant_id=X&user_id=Y |

---

## Environment Variable Cross-Reference

### Health Tenant Backend (`backend/.env`)
```
AUDIT_SERVICE_URL=http://localhost:8080
AUDIT_API_KEY=health-tenant-api-key
AUDIT_TENANT_ID=<assigned after tenant registration>
```

### Social Media Tenant Backend (`backend/.env`)
```
AUDIT_SERVICE_URL=http://localhost:8080
AUDIT_API_KEY=social-tenant-api-key
AUDIT_TENANT_ID=<assigned after tenant registration>
```

---

## Quick Reference — Run All Demo Apps Together

```bash
# Terminal 1 — Health Tenant
cd /Users/seenivasan/Documents/personal/rakesh/project/privacy-health-tenant
docker-compose up --build

# Terminal 2 — Social Media Tenant
cd /Users/seenivasan/Documents/personal/rakesh/project/privacy-social-media-tenant
docker-compose up --build
```

Both run independently. No shared Docker network required at this stage.
