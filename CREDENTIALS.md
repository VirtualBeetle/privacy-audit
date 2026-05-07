# DataGuard — Admin Credentials

## Super Admin

| Field    | Value                                          |
|----------|------------------------------------------------|
| Email    | Set via `SUPER_ADMIN_EMAIL` in Render env      |
| Password | Set via `SUPER_ADMIN_PASSWORD` in Render env   |
| Role     | `super_admin`                                  |

> To check or update: Render dashboard → `privacy-audit-backend` → **Environment**
> To reset password: change `SUPER_ADMIN_PASSWORD` in Render and redeploy.

---

## HealthTrack Admin (Tenant 1)

| Field     | Value                                      |
|-----------|--------------------------------------------|
| Email     | `admin@healthdemo.internal`                |
| Password  | `HealthDemo123!`                           |
| API Key   | `health-tenant-api-key`                    |
| Tenant ID | `11111111-1111-1111-1111-111111111111`     |
| Role      | `tenant_admin`                             |

---

## ConnectSocial Admin (Tenant 2)

| Field     | Value                                      |
|-----------|--------------------------------------------|
| Email     | `admin@socialdemo.internal`                |
| Password  | `SocialDemo123!`                           |
| API Key   | `social-tenant-api-key`                    |
| Tenant ID | `22222222-2222-2222-2222-222222222222`     |
| Role      | `tenant_admin`                             |

---

## Google User (End User)

| Field    | Value                                          |
|----------|------------------------------------------------|
| Login    | "Continue with Google" on the login page       |
| Password | None — OAuth only                              |
| Role     | `google_session`                               |

---

## Notes

- Tenant admin accounts are seeded automatically on backend startup.
- The Super Admin account is only created if both `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` env vars are set.
- API keys are used by tenant apps (health/social) to post audit events via `x-api-key` header.
- Google users sign in via OAuth and can link multiple tenant accounts from the Connected Apps page.
