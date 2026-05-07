#!/usr/bin/env bash
# db-dump.sh — dump all 3 Render Postgres databases to local .sql files
#
# Usage:
#   ./scripts/db-dump.sh
#
# Before running:
#   Fill in the AUDIT_DB_URL, HEALTH_DB_URL, SOCIAL_DB_URL variables below
#   with the External Database URLs from the Render dashboard.
#   (Render dashboard → <database> → Info → External Database URL)
#
# Output:
#   dumps/audit_db_<timestamp>.sql
#   dumps/health_db_<timestamp>.sql
#   dumps/social_db_<timestamp>.sql
#
# Requires: pg_dump (install via `brew install libpq` on Mac)

set -euo pipefail

# ── Fill these in from Render dashboard → <DB> → Info → External Database URL ──
AUDIT_DB_URL=""
HEALTH_DB_URL=""
SOCIAL_DB_URL=""
# ────────────────────────────────────────────────────────────────────────────────

DUMP_DIR="$(dirname "$0")/../dumps"
mkdir -p "$DUMP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [[ -z "$AUDIT_DB_URL" || -z "$HEALTH_DB_URL" || -z "$SOCIAL_DB_URL" ]]; then
  echo "ERROR: Fill in the DB URLs at the top of this script before running."
  exit 1
fi

echo "Dumping audit-db..."
pg_dump "$AUDIT_DB_URL" --no-owner --no-acl -F p -f "$DUMP_DIR/audit_db_${TIMESTAMP}.sql"
echo "  -> $DUMP_DIR/audit_db_${TIMESTAMP}.sql"

echo "Dumping health-db..."
pg_dump "$HEALTH_DB_URL" --no-owner --no-acl -F p -f "$DUMP_DIR/health_db_${TIMESTAMP}.sql"
echo "  -> $DUMP_DIR/health_db_${TIMESTAMP}.sql"

echo "Dumping social-db..."
pg_dump "$SOCIAL_DB_URL" --no-owner --no-acl -F p -f "$DUMP_DIR/social_db_${TIMESTAMP}.sql"
echo "  -> $DUMP_DIR/social_db_${TIMESTAMP}.sql"

echo ""
echo "Done. 3 dumps saved to $DUMP_DIR/"
echo "To restore, run: ./scripts/db-restore.sh $TIMESTAMP"
