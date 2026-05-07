#!/usr/bin/env bash
# db-restore.sh — restore all 3 Postgres databases from local .sql dumps
#
# Usage:
#   ./scripts/db-restore.sh <timestamp>
#   e.g. ./scripts/db-restore.sh 20260429_120000
#
# Before running:
#   Fill in the NEW_AUDIT_DB_URL, NEW_HEALTH_DB_URL, NEW_SOCIAL_DB_URL variables
#   below with the External Database URLs of the NEW databases (from Render dashboard).
#   These can be new Render DBs or the same ones (to reset data).
#
# Also update the Render env vars for each service:
#   health-backend: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#   social-backend: DATABASE_URL
#   audit-backend:  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#
# Requires: psql (install via `brew install libpq` on Mac)

set -euo pipefail

TIMESTAMP="${1:-}"
if [[ -z "$TIMESTAMP" ]]; then
  echo "Usage: ./scripts/db-restore.sh <timestamp>"
  echo "  e.g. ./scripts/db-restore.sh 20260429_120000"
  exit 1
fi

# ── Fill these in with the NEW database External URLs ──────────────────────────
NEW_AUDIT_DB_URL=""
NEW_HEALTH_DB_URL=""
NEW_SOCIAL_DB_URL=""
# ────────────────────────────────────────────────────────────────────────────────

DUMP_DIR="$(dirname "$0")/../dumps"

AUDIT_DUMP="$DUMP_DIR/audit_db_${TIMESTAMP}.sql"
HEALTH_DUMP="$DUMP_DIR/health_db_${TIMESTAMP}.sql"
SOCIAL_DUMP="$DUMP_DIR/social_db_${TIMESTAMP}.sql"

for f in "$AUDIT_DUMP" "$HEALTH_DUMP" "$SOCIAL_DUMP"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: Dump file not found: $f"
    echo "Run ./scripts/db-dump.sh first."
    exit 1
  fi
done

if [[ -z "$NEW_AUDIT_DB_URL" || -z "$NEW_HEALTH_DB_URL" || -z "$NEW_SOCIAL_DB_URL" ]]; then
  echo "ERROR: Fill in the NEW DB URLs at the top of this script before running."
  exit 1
fi

echo "Restoring audit-db from $AUDIT_DUMP ..."
psql "$NEW_AUDIT_DB_URL" -f "$AUDIT_DUMP" -q
echo "  Done."

echo "Restoring health-db from $HEALTH_DUMP ..."
psql "$NEW_HEALTH_DB_URL" -f "$HEALTH_DUMP" -q
echo "  Done."

echo "Restoring social-db from $SOCIAL_DUMP ..."
psql "$NEW_SOCIAL_DB_URL" -f "$SOCIAL_DUMP" -q
echo "  Done."

echo ""
echo "All 3 databases restored from timestamp $TIMESTAMP."
echo ""
echo "NEXT: Update env vars in Render dashboard for each service with the new DB URLs"
echo "  then trigger a Manual Deploy on each backend service."
