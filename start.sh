#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — One-command bootstrap for Privacy Audit & Data Transparency Service
#
# Usage:
#   chmod +x start.sh
#   ./start.sh
#
# What it does:
#   1. Checks Docker + Docker Compose are installed
#   2. Copies .env.example → .env if .env doesn't exist yet
#   3. Warns about unfilled placeholder values
#   4. Runs docker compose up --build -d (all 9 services)
#   5. Waits for audit-backend /api/health to respond
#   6. Prints a status table showing all running services
#   7. Prints all service URLs
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

INFRA_DIR="privacy-audit-infra"
COMPOSE_FILE="$INFRA_DIR/docker-compose.yml"
ENV_EXAMPLE="$INFRA_DIR/.env.example"
ENV_FILE="$INFRA_DIR/.env"
COMPOSE_CMD="docker compose -f $COMPOSE_FILE"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step()  { printf "\n${BLUE}[%s] %s${NC}\n" "$1" "$2"; }
ok()    { printf "  ${GREEN}✓  %s${NC}\n" "$1"; }
warn()  { printf "  ${YELLOW}⚠  %s${NC}\n" "$1"; }
error() { printf "  ${RED}✗  %s${NC}\n" "$1"; exit 1; }

print_header() {
  printf "\n${BOLD}"
  printf "╔══════════════════════════════════════════════════════════╗\n"
  printf "║   Privacy Audit & Data Transparency Service              ║\n"
  printf "║   Rakesh Velavaluri — Griffith College Dublin            ║\n"
  printf "╚══════════════════════════════════════════════════════════╝\n"
  printf "${NC}\n"
}

# ── 1. Check dependencies ─────────────────────────────────────────────────────
check_deps() {
  step "1/5" "Checking dependencies"

  if ! command -v docker &> /dev/null; then
    error "Docker not found. Install: https://docs.docker.com/get-docker/"
  fi
  ok "Docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"

  if ! docker compose version &> /dev/null; then
    error "Docker Compose v2 not found. Update Docker Desktop."
  fi
  ok "Docker Compose $(docker compose version --short)"

  if ! docker info &> /dev/null; then
    error "Docker daemon is not running. Start Docker Desktop first."
  fi
  ok "Docker daemon running"
}

# ── 2. Set up .env ────────────────────────────────────────────────────────────
setup_env() {
  step "2/5" "Environment files"

  if [ ! -f "$ENV_EXAMPLE" ]; then
    error "$ENV_EXAMPLE not found. Cannot continue."
  fi

  if [ ! -f "$ENV_FILE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    warn "Created $ENV_FILE from template — edit it to add real secrets"
  else
    ok "$ENV_FILE already exists"
  fi
}

# ── 3. Warn about placeholders ────────────────────────────────────────────────
check_placeholders() {
  local warned=0

  check_var() {
    local key=$1 pattern=$2 feature=$3
    if grep -qE "^${key}=${pattern}" "$ENV_FILE" 2>/dev/null; then
      warn "$key is a placeholder → $feature will not work"
      warned=1
    fi
  }

  check_var "GOOGLE_CLIENT_ID"     "your-google.*"         "Google OAuth login"
  check_var "ANTHROPIC_API_KEY"    "sk-ant-your.*"         "AI risk analysis + AI chat"
  check_var "JWT_SECRET"           "change-me.*"           "Tokens are not secure (OK for local dev)"
  check_var "ENCRYPTION_KEY"       "change-me.*"           "AI key encryption is not secure (OK for local dev)"
  check_var "DEV_TOKEN"            "change-me.*|dev-secret-change-me" "Dev endpoints use default token"

  if [ "$warned" -eq 1 ]; then
    printf "\n  Edit ${BOLD}$ENV_FILE${NC} to enable all features.\n"
  fi
}

# ── 4. Start services ─────────────────────────────────────────────────────────
start_services() {
  step "3/5" "Starting all 9 services (first run builds images — may take a few minutes)"
  printf "\n"
  $COMPOSE_CMD up -d --build
}

# ── 5. Wait for audit-backend health ─────────────────────────────────────────
wait_for_backend() {
  step "4/5" "Waiting for audit-backend to be healthy"

  local retries=40
  local wait_secs=4

  for i in $(seq 1 $retries); do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
      ok "audit-backend is healthy"
      return 0
    fi

    # Show what's happening while we wait
    local state
    state=$($COMPOSE_CMD ps --format "{{.Status}}" audit-backend 2>/dev/null | head -1 || echo "starting")
    printf "  \r  Waiting... (attempt %d/%d) [%s]     " "$i" "$retries" "$state"
    sleep $wait_secs
  done

  printf "\n"
  warn "audit-backend did not become healthy in time."
  warn "Run: make logs SERVICE=audit-backend  to investigate"
  return 0  # don't fail — show status anyway
}

# ── Print status table ────────────────────────────────────────────────────────
print_status() {
  step "5/5" "Service status"
  printf "\n"
  $COMPOSE_CMD ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}" 2>/dev/null || \
  $COMPOSE_CMD ps
}

# ── Print URLs ────────────────────────────────────────────────────────────────
print_urls() {
  printf "\n${BOLD}"
  printf "╔══════════════════════════════════════════════════════════╗\n"
  printf "║   All services started!                                  ║\n"
  printf "╚══════════════════════════════════════════════════════════╝\n"
  printf "${NC}\n"

  printf "  ${CYAN}Service URLs:${NC}\n"
  printf "    Privacy Dashboard  → ${BOLD}http://localhost:3000${NC}\n"
  printf "    Audit REST API     → ${BOLD}http://localhost:8080/api${NC}\n"
  printf "    API Docs (Swagger) → ${BOLD}http://localhost:8080/api/docs${NC}\n"
  printf "    HealthTrack App    → ${BOLD}http://localhost:3001${NC}\n"
  printf "    ConnectSocial App  → ${BOLD}http://localhost:3002${NC}\n"

  printf "\n  ${CYAN}Useful commands:${NC}\n"
  printf "    make logs                  Tail all service logs\n"
  printf "    make logs SERVICE=<name>   Tail one service\n"
  printf "    make status                Show container health table\n"
  printf "    make pg-shell              psql into audit database\n"
  printf "    make mongo-shell           mongosh into MongoDB\n"
  printf "    make stop                  Stop all services\n"
  printf "    make reset                 Stop + wipe all data (fresh start)\n"

  printf "\n  ${CYAN}Dev triggers (after: export DEV_TOKEN=...):${NC}\n"
  printf "    make dev-analysis          Run AI risk analysis now\n"
  printf "    make dev-digest            Send email digest now\n"
  printf "    make dev-seed-events TENANT_ID=<uuid>\n"
  printf "\n"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  print_header
  check_deps
  setup_env
  check_placeholders
  start_services
  wait_for_backend
  print_status
  print_urls
}

main
