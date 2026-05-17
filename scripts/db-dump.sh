#!/usr/bin/env bash
# db-dump.sh — back up all Render PostgreSQL databases + MongoDB Atlas
#
# Usage:
#   ./scripts/db-dump.sh
#
# Setup (one-time):
#   1. Fill in the DB URLs below from Render dashboard
#      (Render → <database> → Info → External Database URL)
#   2. Fill in MONGO_URI from your .env or MongoDB Atlas dashboard
#
# Output (in ./dumps/):
#   audit_db_<timestamp>.sql
#   health_db_<timestamp>.sql
#   social_db_<timestamp>.sql
#   mongo_<timestamp>/        ← mongodump output directory
#
# Requirements:
#   PostgreSQL: pg_dump  — brew install libpq  (Mac) / apt install postgresql-client (Linux)
#   MongoDB:    mongodump — brew install mongodb-database-tools  (Mac)
#                           https://www.mongodb.com/try/download/database-tools

set -euo pipefail

# ── PostgreSQL connection URLs (External Database URL from Render dashboard) ──
AUDIT_DB_URL="${AUDIT_DB_URL:-}"
HEALTH_DB_URL="${HEALTH_DB_URL:-}"
SOCIAL_DB_URL="${SOCIAL_DB_URL:-}"

# ── MongoDB Atlas connection string (from your .env MONGODB_URI) ────────────
# Format: mongodb+srv://user:password@cluster.mongodb.net/dbname
MONGO_URI="${MONGO_URI:-}"

# ────────────────────────────────────────────────────────────────────────────
# You can also set these as environment variables instead of hardcoding:
#   export AUDIT_DB_URL="postgres://..."
#   export MONGO_URI="mongodb+srv://..."
# Then run the script without filling in the values above.
# ────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP_DIR="$SCRIPT_DIR/../dumps"
mkdir -p "$DUMP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ── Validate ─────────────────────────────────────────────────────────────────
missing=()
[[ -z "${AUDIT_DB_URL:-}" ]]  && missing+=("AUDIT_DB_URL")
[[ -z "${HEALTH_DB_URL:-}" ]] && missing+=("HEALTH_DB_URL")
[[ -z "${SOCIAL_DB_URL:-}" ]] && missing+=("SOCIAL_DB_URL")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "WARNING: The following PostgreSQL URLs are not set — skipping those databases:"
  for v in "${missing[@]}"; do echo "  - $v"; done
fi

echo ""
echo "=== DataGuard DB Backup — $TIMESTAMP ==="
echo ""

# ── PostgreSQL dumps ─────────────────────────────────────────────────────────
if command -v pg_dump &> /dev/null; then
  if [[ -n "${AUDIT_DB_URL:-}" ]]; then
    echo "Backing up audit-db (PostgreSQL)..."
    pg_dump "$AUDIT_DB_URL" --no-owner --no-acl -F p \
      -f "$DUMP_DIR/audit_db_${TIMESTAMP}.sql"
    echo "  -> dumps/audit_db_${TIMESTAMP}.sql  ✓"
  fi

  if [[ -n "${HEALTH_DB_URL:-}" ]]; then
    echo "Backing up health-db (PostgreSQL)..."
    pg_dump "$HEALTH_DB_URL" --no-owner --no-acl -F p \
      -f "$DUMP_DIR/health_db_${TIMESTAMP}.sql"
    echo "  -> dumps/health_db_${TIMESTAMP}.sql  ✓"
  fi

  if [[ -n "${SOCIAL_DB_URL:-}" ]]; then
    echo "Backing up social-db (PostgreSQL)..."
    pg_dump "$SOCIAL_DB_URL" --no-owner --no-acl -F p \
      -f "$DUMP_DIR/social_db_${TIMESTAMP}.sql"
    echo "  -> dumps/social_db_${TIMESTAMP}.sql  ✓"
  fi
else
  echo "SKIP: pg_dump not found. Install with: brew install libpq"
fi

# ── MongoDB dump ─────────────────────────────────────────────────────────────
if [[ -n "${MONGO_URI:-}" ]]; then
  if command -v mongodump &> /dev/null; then
    echo ""
    echo "Backing up MongoDB Atlas..."
    MONGO_OUT="$DUMP_DIR/mongo_${TIMESTAMP}"
    mkdir -p "$MONGO_OUT"
    mongodump \
      --uri="$MONGO_URI" \
      --out="$MONGO_OUT" \
      --quiet
    echo "  -> dumps/mongo_${TIMESTAMP}/  ✓"
  else
    echo "SKIP: mongodump not found."
    echo "  Install: brew install mongodb-database-tools"
    echo "  Or: https://www.mongodb.com/try/download/database-tools"
  fi
else
  echo "SKIP: MONGO_URI not set — skipping MongoDB backup."
fi

echo ""
echo "Backup complete. Timestamp: $TIMESTAMP"
echo "To restore later:  ./scripts/db-restore.sh $TIMESTAMP"
echo ""
echo "Tip: Add your DB URLs to a local .env.backup file (gitignored) and source it:"
echo "  source .env.backup && ./scripts/db-dump.sh"
