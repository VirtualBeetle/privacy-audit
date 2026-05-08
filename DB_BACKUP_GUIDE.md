# DataGuard — Database Backup & Restore Guide

> Render free-tier databases expire after 90 days. This guide lets you back up
> all data in one command and restore it to a new DB when needed.

---

## What gets backed up

| Database | What's in it | Tool used |
|---|---|---|
| `audit-db` (PostgreSQL) | All audit events, tenants, users, consents, exports, deletions, risk alerts, webhooks, breach reports | `pg_dump` |
| `health-db` (PostgreSQL) | HealthTrack tenant app data | `pg_dump` |
| `social-db` (PostgreSQL) | ConnectSocial tenant app data | `pg_dump` |
| MongoDB Atlas | AI chat sessions, AI analysis records, notifications | `mongodump` |

---

## One-time setup (do this once)

### 1. Install required tools (Mac)

```bash
# pg_dump / psql for PostgreSQL
brew install libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# mongodump / mongorestore for MongoDB Atlas
brew tap mongodb/brew
brew install mongodb-database-tools

# Verify
pg_dump --version
mongodump --version
```

### 2. Create your `.env.backup` file

```bash
cp scripts/.env.backup.example scripts/.env.backup
```

Open `scripts/.env.backup` and fill in your URLs:

```bash
# From Render dashboard → <database> → Info → External Database URL
export AUDIT_DB_URL="postgres://USER:PASSWORD@render-host.oregon-postgres.render.com:5432/audit_db"
export HEALTH_DB_URL="postgres://USER:PASSWORD@render-host.oregon-postgres.render.com:5432/health_db"
export SOCIAL_DB_URL="postgres://USER:PASSWORD@render-host.oregon-postgres.render.com:5432/social_db"

# From MongoDB Atlas → Connect → Drivers
export MONGO_URI="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/privacy_audit_ai"

# For restore: fill these in AFTER creating new Render DBs
export NEW_AUDIT_DB_URL=""
export NEW_HEALTH_DB_URL=""
export NEW_SOCIAL_DB_URL=""
```

> **Note:** `scripts/.env.backup` is gitignored — your passwords never go into git.

---

## Regular backup (run every 2–3 weeks)

```bash
source scripts/.env.backup && ./scripts/db-dump.sh
```

**Output:**
```
=== DataGuard DB Backup — 20260508_143022 ===

Backing up audit-db (PostgreSQL)...
  -> dumps/audit_db_20260508_143022.sql  ✓
Backing up health-db (PostgreSQL)...
  -> dumps/health_db_20260508_143022.sql  ✓
Backing up social-db (PostgreSQL)...
  -> dumps/social_db_20260508_143022.sql  ✓

Backing up MongoDB Atlas...
  -> dumps/mongo_20260508_143022/  ✓

Backup complete. Timestamp: 20260508_143022
To restore later:  ./scripts/db-restore.sh 20260508_143022
```

Takes ~10–30 seconds. **Save the timestamp** printed at the end.

---

## Restore to new Render DBs

This is the full Render free-tier migration workflow:

### Step 1 — Back up BEFORE the old DB expires

```bash
source scripts/.env.backup && ./scripts/db-dump.sh
# Note the timestamp, e.g. 20260508_143022
```

### Step 2 — Create new Render PostgreSQL databases

1. Go to [Render dashboard](https://dashboard.render.com) → **New** → **PostgreSQL**
2. Create 3 databases: `audit-db`, `health-db`, `social-db`
3. After each is created, go to **Info** → copy the **External Database URL**

### Step 3 — Update `.env.backup` with new URLs

```bash
# In scripts/.env.backup, fill in the NEW_*_URL variables:
export NEW_AUDIT_DB_URL="postgres://USER:NEWPASSWORD@new-render-host.render.com:5432/audit_db"
export NEW_HEALTH_DB_URL="postgres://..."
export NEW_SOCIAL_DB_URL="postgres://..."
```

### Step 4 — Restore data

```bash
source scripts/.env.backup && ./scripts/db-restore.sh 20260508_143022
```

**Output:**
```
=== DataGuard DB Restore — from 20260508_143022 ===

Restoring audit-db...
  audit-db  ✓
Restoring health-db...
  health-db  ✓
Restoring social-db...
  social-db  ✓

Restoring MongoDB from dumps/mongo_20260508_143022/...
  MongoDB  ✓

Restore complete.

=== Next steps ===
1. Update Render environment variables for each service:
   audit-backend: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
   ...
2. Trigger a Manual Deploy on each backend service.
3. Verify data by calling: curl https://...
```

### Step 5 — Update Render service env vars

For each backend service on Render:
1. Go to service → **Environment**
2. Update these variables with values from the new DB connection string:

| Variable | Where to get it |
|---|---|
| `DB_HOST` | hostname part of the External Database URL |
| `DB_PORT` | port (usually `5432`) |
| `DB_USER` | username part |
| `DB_PASSWORD` | password part |
| `DB_NAME` | database name part |

> **Tip:** The External Database URL format is: `postgres://USER:PASSWORD@HOST:PORT/DBNAME`
> Just split it apart into the individual env vars.

### Step 6 — Trigger Manual Deploy

On each backend service in Render → **Manual Deploy** → **Deploy latest commit**

### Step 7 — Verify

```bash
# Quick health check
curl https://audit-backend-ddew.onrender.com/api/health

# Check events exist
curl https://audit-backend-ddew.onrender.com/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.total'
```

---

## MongoDB Atlas — no expiry!

MongoDB Atlas free tier (M0) does **not** expire. You don't need to migrate MongoDB between Render database rotations — it stays the same. The `MONGO_URI` in your `.env.backup` stays the same forever.

You only need the `mongodump` / `mongorestore` steps if:
- You want to move to a different MongoDB Atlas cluster
- You accidentally deleted data and want to roll back

---

## Quick reference

| Task | Command |
|---|---|
| Back up everything | `source scripts/.env.backup && ./scripts/db-dump.sh` |
| Restore from backup | `source scripts/.env.backup && ./scripts/db-restore.sh TIMESTAMP` |
| List saved backups | `ls dumps/` |
| Check backup size | `du -sh dumps/` |

---

## Backup schedule recommendation

| When | Action |
|---|---|
| Every 2 weeks | Run `db-dump.sh` |
| Before demo | Run `db-dump.sh` (safety net) |
| ~75 days after DB creation | Render will warn you — run `db-dump.sh` immediately |
| Day 90 (DB expiry) | Run restore workflow (Steps 2–6 above) |

---

*Last updated: 2026-05-08*
