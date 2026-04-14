# Ports & Endpoints Reference — Health Tenant

## Docker Host Ports (what you access from your browser)

| Service | Host Port | URL |
|---|---|---|
| Frontend | 4001 | http://localhost:4001 |
| Backend API | 8061 | http://localhost:8061 |
| PostgreSQL | 5433 | localhost:5433 |

## Internal Docker Ports (inside Docker network)

| Service | Internal Port |
|---|---|
| Backend | 8081 |
| Frontend (nginx) | 3001 |
| PostgreSQL | 5432 |

## Key API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | public | Register new patient |
| POST | /api/auth/login | public | Login → returns JWT |
| GET | /api/patient/me | patient | Own profile |
| PUT | /api/patient/me | patient | Update own profile |
| GET | /api/patient/records | patient | Own medical records |
| GET | /api/patient/appointments | patient | Own appointments |
| GET | /api/patient/emergency-contacts | patient | Own emergency contacts |
| GET | /api/patient/insurance | patient | Own insurance (fires billing audit) |
| GET | /api/doctor/patients | doctor | All patients list |
| GET | /api/doctor/patients/:id | doctor | Patient profile (fires READ audit) |
| GET | /api/doctor/patients/:id/records | doctor | Patient records (fires CRITICAL audit) |
| GET | /api/doctor/patients/:id/appointments | doctor | Patient appointments |
| GET | /api/privacy/dashboard-link | any | Privacy audit dashboard URL |
| POST | /api/privacy/export | any | GDPR Article 20 export request |
| DELETE | /api/privacy/delete | any | GDPR Article 17 deletion request |

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Doctor | sarah.mitchell@healthdemo.com | doctor123 |
| Patient | james.obrien@demo.com | patient123 |
| Patient | aoife.byrne@demo.com | patient123 |
| Patient | conor.walsh@demo.com | patient123 |
