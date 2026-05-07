# Manual Actions Required — DataGuard Platform

This file lists everything you (Rakesh) need to do manually in Render / external services.
Code changes are automated — only things in this file need your hands.

---

## 🔴 CRITICAL — Do before testing Phase 17

### 1. Add Super Admin env vars to Render backend

Go to → **Render → audit-backend → Environment**

Add these two vars:
```
SUPER_ADMIN_EMAIL=<your-email>
SUPER_ADMIN_PASSWORD=<your-secure-password>
```

On next deploy/boot, the seed service will create your super admin account automatically.
After this, log in at `/login` with those credentials — you'll see the full super admin nav.

---

## 🟡 IMPORTANT — Do before dissertation demo

### 2. Verify BullMQ queue health

After any redeploy, open Swagger:
```
https://audit-backend-ddew.onrender.com/api/docs
```
Find `GET /dev/queue-status` → enter your `x-dev-token` header → Execute.
Want: `failed: 0`, `health: "ok"`

### 3. Verify dev token is set in browser

Open the live dashboard → Settings → Security → paste your `DEV_TOKEN` → Save.
This unlocks AI Settings and Dev/Demo controls.

### 4. Google OAuth on Render (optional for demo)

If you want Google sign-in working on live:
Go to → **Render → audit-backend → Environment**
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
DASHBOARD_BASE_URL=https://your-frontend-url.onrender.com
```

---

## 🟢 NICE TO HAVE — Before dissertation submission

### 5. MongoDB Atlas — ensure notifications collection allowed

The notifications module writes to MongoDB Atlas. No config needed (same `MONGODB_URI`),
but verify Atlas free tier has enough storage (512 MB limit).

---

## Summary Table

| # | Action | Location | Priority |
|---|---|---|---|
| 1 | Add `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD` | Render → audit-backend → Env | 🔴 Critical |
| 2 | Verify BullMQ queue health (`failed: 0`) | Render → Swagger | 🟡 Demo |
| 3 | Set `DEV_TOKEN` in browser Settings | Live dashboard → Settings | 🟡 Demo |
| 4 | Google OAuth env vars | Render → audit-backend → Env | 🟢 Optional |
| 5 | MongoDB Atlas storage check | Atlas dashboard | 🟢 Optional |
