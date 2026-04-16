#!/usr/bin/env bash
# setup-hosts.sh — Add local dev domain entries to /etc/hosts (run once)
# Usage: sudo ./setup-hosts.sh

set -euo pipefail

HOSTS_FILE="/etc/hosts"
MARKER="# privacy-audit-local"

ENTRIES=(
  "127.0.0.1 dataguard.local"
  "127.0.0.1 api.dataguard.local"
  "127.0.0.1 health.local"
  "127.0.0.1 social.local"
)

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run with sudo: sudo ./setup-hosts.sh"
  exit 1
fi

# Check if already set up
if grep -q "$MARKER" "$HOSTS_FILE" 2>/dev/null; then
  echo -e "${YELLOW}Hosts entries already present — nothing to do.${NC}"
  echo ""
  grep -A4 "$MARKER" "$HOSTS_FILE"
  exit 0
fi

echo "" >> "$HOSTS_FILE"
echo "$MARKER" >> "$HOSTS_FILE"
for entry in "${ENTRIES[@]}"; do
  echo "$entry" >> "$HOSTS_FILE"
  echo -e "  ${GREEN}Added:${NC} $entry"
done
echo "$MARKER end" >> "$HOSTS_FILE"

echo ""
echo -e "${GREEN}Done! You can now access:${NC}"
echo "  http://dataguard.local     — DataGuard Privacy Dashboard"
echo "  http://health.local        — HealthTrack Patient Portal"
echo "  http://social.local        — ConnectSocial"
echo "  http://api.dataguard.local — Audit REST API + Swagger"
