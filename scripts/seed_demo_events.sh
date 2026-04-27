#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# seed_demo_events.sh — Populates the audit log with realistic demo events
#                       including intentional Data Minimisation violations.
#
# Usage:
#   chmod +x scripts/seed_demo_events.sh
#   ./scripts/seed_demo_events.sh
#
# What it seeds:
#   HealthTrack: 8 events (6 normal + 2 violations — biometric_data, financial_data)
#   ConnectSocial: 7 events (5 normal + 2 violations — browsing_history, ad_profile)
#
# Violations trigger the Data Minimisation panel (GDPR Article 5(1)(c)).
# After-hours events trigger AI risk alerts.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080/api}"
HEALTH_API_KEY="health-tenant-api-key"
SOCIAL_API_KEY="social-tenant-api-key"
HEALTH_TENANT_ID="11111111-1111-1111-1111-111111111111"
SOCIAL_TENANT_ID="22222222-2222-2222-2222-222222222222"

# Demo user IDs (must match what the user logs in with)
HEALTH_USER="patient-sarah-001"
SOCIAL_USER="user-james-001"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

ok()    { printf "  ${GREEN}✓${NC}  %s\n" "$1"; }
warn()  { printf "  ${YELLOW}⚠${NC}  %s\n" "$1"; }
info()  { printf "  ${BOLD}→${NC}  %s\n" "$1"; }

send_event() {
  local api_key="$1"
  local payload="$2"
  local label="$3"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${API_BASE}/events" \
    -H "Content-Type: application/json" \
    -H "x-api-key: ${api_key}" \
    -d "${payload}")

  if [ "$http_code" = "202" ]; then
    ok "${label}"
  else
    warn "${label} — HTTP ${http_code}"
  fi
  sleep 0.3
}

uuid() {
  python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || \
  cat /proc/sys/kernel/random/uuid 2>/dev/null || \
  uuidgen 2>/dev/null || \
  echo "$(date +%s%N)-$(($RANDOM * $RANDOM))"
}

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

printf "\n${BOLD}╔══════════════════════════════════════════════════════════╗${NC}\n"
printf "${BOLD}║   Privacy Audit — Demo Event Seeder                      ║${NC}\n"
printf "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}\n\n"

# ── HealthTrack events ────────────────────────────────────────────────────────
info "Seeding HealthTrack events (tenant: ${HEALTH_TENANT_ID})"
printf "\n"

# Normal events (within allowed fields)
send_event "$HEALTH_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${HEALTH_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["email", "name", "appointment_date"],
  "reason": {"code": "SCHEDULING", "label": "Appointment scheduling"},
  "actor": {"type": "EMPLOYEE", "label": "Dr. O'Brien"},
  "sensitivity": {"code": "MEDIUM", "label": "Medium sensitivity"},
  "thirdPartyInvolved": false,
  "consentObtained": true,
  "userOptedOut": false,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "HealthTrack: Doctor reads appointment (normal)"

send_event "$HEALTH_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${HEALTH_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["medical_record", "diagnosis", "prescription"],
  "reason": {"code": "TREATMENT", "label": "Patient treatment"},
  "actor": {"type": "EMPLOYEE", "label": "Dr. O'Brien"},
  "sensitivity": {"code": "HIGH", "label": "High sensitivity"},
  "thirdPartyInvolved": false,
  "consentObtained": true,
  "userOptedOut": false,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "HealthTrack: Doctor reads medical record (normal — HIGH sensitivity)"

send_event "$HEALTH_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${HEALTH_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["insurance_details", "name"],
  "reason": {"code": "BILLING", "label": "Insurance billing"},
  "actor": {"type": "THIRD_PARTY", "label": "InsureCo Ltd"},
  "sensitivity": {"code": "HIGH", "label": "High sensitivity"},
  "thirdPartyInvolved": true,
  "thirdPartyName": "InsureCo Ltd",
  "consentObtained": true,
  "userOptedOut": false,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "HealthTrack: Insurance company reads details (normal — third party)"

send_event "$HEALTH_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${HEALTH_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["email", "phone_number"],
  "reason": {"code": "REMINDER", "label": "Appointment reminder"},
  "actor": {"type": "SYSTEM", "label": "Automated reminder system"},
  "sensitivity": {"code": "LOW", "label": "Low sensitivity"},
  "thirdPartyInvolved": false,
  "consentObtained": true,
  "userOptedOut": false,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "HealthTrack: Reminder system reads contact (normal)"

# ── VIOLATION EVENTS (fields not in allowedDataFields) ────────────────────────
printf "\n"
warn "Seeding VIOLATION events — these will appear in the violations panel"
printf "\n"

send_event "$HEALTH_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${HEALTH_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["biometric_data", "dna_profile", "diagnosis"],
  "reason": {"code": "RESEARCH", "label": "Medical research program"},
  "actor": {"type": "THIRD_PARTY", "label": "MedResearch Corp"},
  "sensitivity": {"code": "CRITICAL", "label": "Critical sensitivity"},
  "thirdPartyInvolved": true,
  "thirdPartyName": "MedResearch Corp",
  "consentObtained": false,
  "userOptedOut": true,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "HealthTrack: VIOLATION — biometric_data + dna_profile (not in allowed fields)"

send_event "$HEALTH_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${HEALTH_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "SHARE", "label": "Share"},
  "dataFields": ["financial_data", "credit_score", "email"],
  "reason": {"code": "AD_TARGETING", "label": "Targeted advertising"},
  "actor": {"type": "DATA_BROKER", "label": "AdTech Partners"},
  "sensitivity": {"code": "CRITICAL", "label": "Critical sensitivity"},
  "thirdPartyInvolved": true,
  "thirdPartyName": "AdTech Partners",
  "consentObtained": false,
  "userOptedOut": true,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "HealthTrack: VIOLATION — financial_data + credit_score shared with data broker"

# ── ConnectSocial events ──────────────────────────────────────────────────────
printf "\n"
info "Seeding ConnectSocial events (tenant: ${SOCIAL_TENANT_ID})"
printf "\n"

send_event "$SOCIAL_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${SOCIAL_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["posts", "location"],
  "reason": {"code": "FEED_ALGORITHM", "label": "Feed personalisation"},
  "actor": {"type": "SYSTEM", "label": "Feed recommendation engine"},
  "sensitivity": {"code": "LOW", "label": "Low sensitivity"},
  "thirdPartyInvolved": false,
  "consentObtained": true,
  "userOptedOut": false,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "ConnectSocial: Feed algorithm reads posts (normal)"

send_event "$SOCIAL_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${SOCIAL_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["email", "location"],
  "reason": {"code": "AD_TARGETING", "label": "Targeted advertising"},
  "actor": {"type": "SYSTEM", "label": "Ad targeting engine"},
  "sensitivity": {"code": "MEDIUM", "label": "Medium sensitivity"},
  "thirdPartyInvolved": false,
  "consentObtained": true,
  "userOptedOut": false,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "ConnectSocial: Ad engine reads location (normal)"

send_event "$SOCIAL_API_KEY" "$(cat <<JSON
{
  "eventId": "$(now_iso)",
  "tenantUserId": "${SOCIAL_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "SHARE", "label": "Share"},
  "dataFields": ["check_in", "location"],
  "reason": {"code": "LOCATION_SHARING", "label": "Location partner integration"},
  "actor": {"type": "DATA_BROKER", "label": "LocationIQ"},
  "sensitivity": {"code": "HIGH", "label": "High sensitivity"},
  "thirdPartyInvolved": true,
  "thirdPartyName": "LocationIQ",
  "consentObtained": true,
  "userOptedOut": false,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "ConnectSocial: Check-in shared with location partner (normal — data broker)"

printf "\n"
warn "Seeding ConnectSocial VIOLATION events"
printf "\n"

send_event "$SOCIAL_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${SOCIAL_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "READ", "label": "Read"},
  "dataFields": ["browsing_history", "search_queries", "email"],
  "reason": {"code": "AD_TARGETING", "label": "Behavioural ad targeting"},
  "actor": {"type": "THIRD_PARTY", "label": "DoubleClick Ads"},
  "sensitivity": {"code": "HIGH", "label": "High sensitivity"},
  "thirdPartyInvolved": true,
  "thirdPartyName": "DoubleClick Ads",
  "consentObtained": false,
  "userOptedOut": true,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "ConnectSocial: VIOLATION — browsing_history + search_queries (not declared)"

send_event "$SOCIAL_API_KEY" "$(cat <<JSON
{
  "eventId": "$(uuid)",
  "tenantUserId": "${SOCIAL_USER}",
  "timestamp": "$(now_iso)",
  "action": {"code": "SHARE", "label": "Share"},
  "dataFields": ["ad_profile", "political_views", "username"],
  "reason": {"code": "PROFILING", "label": "User profiling for monetisation"},
  "actor": {"type": "DATA_BROKER", "label": "DataBroker.io"},
  "sensitivity": {"code": "CRITICAL", "label": "Critical sensitivity"},
  "thirdPartyInvolved": true,
  "thirdPartyName": "DataBroker.io",
  "consentObtained": false,
  "userOptedOut": true,
  "occurredAt": "$(now_iso)",
  "retentionDays": 90,
  "region": "IE"
}
JSON
)" "ConnectSocial: VIOLATION — ad_profile + political_views shared with data broker"

printf "\n${GREEN}${BOLD}Done!${NC} ${GREEN}All demo events seeded.${NC}\n"
printf "\n  ${BOLD}What to do next:${NC}\n"
printf "  1. Open DataGuard dashboard\n"
printf "  2. Log in as the demo user (token from HealthTrack or ConnectSocial)\n"
printf "  3. You should see:\n"
printf "     • Violations panel with 4 red violation cards\n"
printf "     • Events in the feed (newest first)\n"
printf "     • Risk alerts (run: make dev-analysis first to trigger AI analysis)\n"
printf "\n  ${YELLOW}Tip: To see live updates, keep dashboard open and run this script again${NC}\n\n"
