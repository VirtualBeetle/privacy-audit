# Ports & Endpoints Reference — Social Media Tenant

## Docker Host Ports (what you access from your browser)

| Service | Host Port | URL |
|---|---|---|
| Frontend | 4002 | http://localhost:4002 |
| Backend API | 8062 | http://localhost:8062 |
| PostgreSQL | 5435 | localhost:5435 |

## Internal Docker Ports (inside Docker network)

| Service | Internal Port |
|---|---|
| Backend | 8082 |
| Frontend (nginx) | 3002 |
| PostgreSQL | 5432 |

## Key API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | public | Register new user |
| POST | /api/auth/login | public | Login → returns JWT |
| GET | /api/users/me | user | Own profile |
| PUT | /api/users/me | user | Update own profile |
| GET | /api/users/search?q= | any | Search users (fires audit) |
| GET | /api/posts/feed | any | Public + friends feed |
| POST | /api/posts | user | Create post |
| GET | /api/posts/:id | any | View post (fires analytics audit) |
| DELETE | /api/posts/:id | user | Delete own post |
| POST | /api/posts/:id/like | user | Toggle like |
| POST | /api/posts/:id/comments | user | Add comment |
| GET | /api/posts/:id/comments | user | List comments |
| GET | /api/checkins | user | Own check-ins |
| POST | /api/checkins | user | Add check-in (fires location audit) |
| GET | /api/admin/users | admin | All users |
| GET | /api/admin/posts | admin | All posts |
| GET | /api/privacy/dashboard-link | any | Privacy audit dashboard URL |
| POST | /api/privacy/export | any | GDPR Article 20 export request |
| DELETE | /api/privacy/delete | any | GDPR Article 17 deletion request |
| GET | /health | public | Health check |

## Demo Credentials

| Role | Email | Username | Password |
|---|---|---|---|
| Admin | admin@socialdemo.com | admin | admin123 |
| User | emma.thornton@demo.com | emma_writes | user123 |
| User | luca.marino@demo.com | luca_dev | user123 |
| User | priya.k@demo.com | priya_k | user123 |
