#!/usr/bin/env bash
# =============================================================================
# demo-onboard.sh — 30-second terminal demo for Privacy Audit Service
#
# Usage:
#   ./scripts/demo-onboard.sh
#   API_URL=https://your-api.onrender.com ./scripts/demo-onboard.sh
#
# What it does:
#   1. Registers a new demo tenant
#   2. Sends 5 realistic audit events using the returned API key
#   3. Prints the dashboard URL and tenant credentials
# =============================================================================

set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

# ── Colours ──────────────────────────────────────────────────────────────────
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
RESET="\033[0m"

step() { echo -e "\n${CYAN}${BOLD}▶ $*${RESET}"; }
ok()   { echo -e "${GREEN}✓ $*${RESET}"; }
info() { echo -e "  ${YELLOW}$*${RESET}"; }

echo -e "\n${BOLD}Privacy Audit Service — Demo Onboarding${RESET}"
echo -e "API: ${API_URL}"
echo -e "Dashboard: ${FRONTEND_URL}/dashboard"

# ── Step 1: Register tenant ───────────────────────────────────────────────────
step "Registering demo tenant…"

DEMO_EMAIL="demo-$(date +%s)@example.com"
DEMO_PASSWORD="Demo1234!"
DEMO_NAME="Demo Corp $(date +%H%M%S)"

REGISTER_RESPONSE=$(curl -sf -X POST "${API_URL}/api/tenants/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${DEMO_NAME}\",\"email\":\"${DEMO_EMAIL}\",\"password\":\"${DEMO_PASSWORD}\"}")

TENANT_ID=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tenant']['id'])")
API_KEY=$(echo "$REGISTER_RESPONSE"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tenant']['apiKey'])")

ok "Tenant registered: ${TENANT_ID}"
info "Email:   ${DEMO_EMAIL}"
info "API Key: ${API_KEY}"

# ── Step 2: Send 5 audit events ───────────────────────────────────────────────
step "Sending 5 sample audit events…"

send_event() {
  local IDX="$1"
  local ACTION_CODE="$2"
  local ACTION_LABEL="$3"
  local SENSITIVITY="$4"
  local FIELDS="$5"
  local CONSENT="$6"

  curl -sf -X POST "${API_URL}/api/events" \
    -H "Content-Type: application/json" \
    -H "x-api-key: ${API_KEY}" \
    -d "{
      \"event_id\": \"demo-evt-${IDX}-$(date +%s%N)\",
      \"tenant_user_id\": \"demo-user-001\",
      \"action\": {\"code\": \"${ACTION_CODE}\", \"label\": \"${ACTION_LABEL}\"},
      \"data_fields\": ${FIELDS},
      \"reason\": {\"code\": \"SERVICE\", \"label\": \"Demo operation\"},
      \"actor\": {\"type\": \"user\", \"label\": \"Demo user\"},
      \"sensitivity\": {\"code\": \"${SENSITIVITY}\", \"label\": \"${SENSITIVITY}\"},
      \"consent_obtained\": ${CONSENT},
      \"occurred_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" > /dev/null && ok "Event ${IDX}: ${ACTION_LABEL}" || echo "  ⚠ Event ${IDX} failed (server may still be starting)"
}

send_event 1 "READ"   "Read user profile"       "LOW"      '["email","name"]'              true
sleep 0.3
send_event 2 "WRITE"  "Update health record"    "HIGH"     '["medical_history"]'            true
sleep 0.3
send_event 3 "SHARE"  "Share with analytics"    "MEDIUM"   '["location","browsing_history"]' false
sleep 0.3
send_event 4 "EXPORT" "Export payment data"     "CRITICAL" '["payment_info","card_last4"]'  true
sleep 0.3
send_event 5 "DELETE" "Delete biometric sample" "HIGH"     '["biometric_data"]'             true

# ── Step 3: Print summary ─────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}═══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Demo tenant is live!${RESET}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${RESET}"
info "Tenant ID  : ${TENANT_ID}"
info "Email      : ${DEMO_EMAIL}"
info "Password   : ${DEMO_PASSWORD}"
info "API Key    : ${API_KEY}"
echo ""
info "Dashboard  : ${FRONTEND_URL}/dashboard"
info "Login      : ${FRONTEND_URL}/login"
echo ""
info "Trigger AI risk analysis (needs DEV_TOKEN):"
info "  curl -X POST ${API_URL}/api/dev/trigger-risk-analysis \\"
info "       -H 'x-dev-token: \$DEV_TOKEN'"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${RESET}\n"
