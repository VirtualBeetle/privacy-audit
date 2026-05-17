#!/usr/bin/env bash
# db-restore.sh — restore DataGuard databases from a local dump
#
# Usage:
#   ./scripts/db-restore.sh <timestamp>
#   e.g. ./scripts/db-restore.sh 20260429_120000
#
# Workflow for Render free-tier migration:
#   1. Run db-dump.sh to snapshot the old Render DBs
#   2. Delete the old Render databases (or let them expire)
#   3. Create new Render PostgreSQL DBs + get their External URLs
#   4. Fill in the NEW_*_URL variables below
#   5. Run this script with the timestamp from step 1
#   6. Update env vars on each Render service (DB_HOST, DB_PORT, etc.)
#   7. Trigger a Manual Deploy on each backend service
#
# Requirements:
#   PostgreSQL: psql     — brew install libpq  (Mac)
#   MongoDB:    mongorestore — brew install mongodb-database-tools (Mac)

set -euo pipefail

TIMESTAMP="${1:-}"
if [[ -z "$TIMESTAMP" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  DUMP_DIR="$SCRIPT_DIR/../dumps"
  echo "Usage: ./scripts/db-restore.sh <timestamp>"
  echo ""
  echo "Available backups in dumps/:"
  ls "$DUMP_DIR"/*.sql 2>/dev/null | sed 's/.*\/\(.*\)\.sql/  \1/' | sed 's/_[^_]*$//' | sort -u || echo "  (none found)"
  ls "$DUMP_DIR" 2>/dev/null | grep "^mongo_" | sed 's/^/  /' || true
  exit 1
fi

# ── NEW PostgreSQL URLs (External Database URL from new Render DBs) ───────────
NEW_AUDIT_DB_URL="${NEW_AUDIT_DB_URL:-}"
NEW_HEALTH_DB_URL="${NEW_HEALTH_DB_URL:-}"
NEW_SOCIAL_DB_URL="${NEW_SOCIAL_DB_URL:-}"

# ── MongoDB: same MONGO_URI (Atlas URL doesn't change when you drop/recreate) ─
# Drop + re-import to the same MongoDB Atlas cluster.
MONGO_URI="${MONGO_URI:-}"

# ────────────────────────────────────────────────────────────────────────────
# You can also export these as env vars before running the script:
#   export NEW_AUDIT_DB_URL="postgres://..."
# ────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/../dumps"

AUDIT_DUMP="$DUMP_DIR/audit_db_${TIMESTAMP}.sql"
HEALTH_DUMP="$DUMP_DIR/health_db_${TIMESTAMP}.sql"
SOCIAL_DUMP="$DUMP_DIR/social_db_${TIMESTAMP}.sql"
MONGO_DUMP="$DUMP_DIR/mongo_${TIMESTAMP}"

echo ""
echo "=== DataGuard DB Restore — from $TIMESTAMP ==="
echo ""

# ── PostgreSQL restores ───────────────────────────────────────────────────────
if command -v psql &> /dev/null; then
  if [[ -f "$AUDIT_DUMP" && -n "${NEW_AUDIT_DB_URL:-}" ]]; then
    echo "Restoring audit-db..."
    psql "$NEW_AUDIT_DB_URL" -f "$AUDIT_DUMP" -q
    echo "  audit-db  ✓"
  elif [[ -f "$AUDIT_DUMP" ]]; then
    echo "SKIP audit-db: NEW_AUDIT_DB_URL not set"
  fi

  if [[ -f "$HEALTH_DUMP" && -n "${NEW_HEALTH_DB_URL:-}" ]]; then
    echo "Restoring health-db..."
    psql "$NEW_HEALTH_DB_URL" -f "$HEALTH_DUMP" -q
    echo "  health-db  ✓"
  elif [[ -f "$HEALTH_DUMP" ]]; then
    echo "SKIP health-db: NEW_HEALTH_DB_URL not set"
  fi

  if [[ -f "$SOCIAL_DUMP" && -n "${NEW_SOCIAL_DB_URL:-}" ]]; then
    echo "Restoring social-db..."
    psql "$NEW_SOCIAL_DB_URL" -f "$SOCIAL_DUMP" -q
    echo "  social-db  ✓"
  elif [[ -f "$SOCIAL_DUMP" ]]; then
    echo "SKIP social-db: NEW_SOCIAL_DB_URL not set"
  fi
else
  echo "SKIP PostgreSQL: psql not found. Install with: brew install libpq"
fi

# ── MongoDB restore ───────────────────────────────────────────────────────────
if [[ -d "$MONGO_DUMP" && -n "${MONGO_URI:-}" ]]; then
  if command -v mongorestore &> /dev/null; then
    echo ""
    echo "Restoring MongoDB from dumps/mongo_${TIMESTAMP}/..."
    # --drop: drops existing collections before restoring (clean slate)
    mongorestore \
      --uri="$MONGO_URI" \
      --dir="$MONGO_DUMP" \
      --drop \
      --quiet
    echo "  MongoDB  ✓"
  else
    echo "SKIP MongoDB: mongorestore not found."
    echo "  Install: brew install mongodb-database-tools"
  fi
elif [[ -d "$MONGO_DUMP" ]]; then
  echo "SKIP MongoDB: MONGO_URI not set"
fi

echo ""
echo "Restore complete."
echo ""
echo "=== Next steps ==="
echo "1. Update Render environment variables for each service:"
echo "   audit-backend:   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
echo "   health-backend:  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
echo "   social-backend:  DATABASE_URL  (if it uses a URL-style var)"
echo ""
echo "2. Trigger a Manual Deploy on each backend service in the Render dashboard."
echo ""
echo "3. Verify data by calling:"
echo "   curl https://audit-backend-ddew.onrender.com/api/events -H 'Authorization: Bearer TOKEN'"
