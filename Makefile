# ─────────────────────────────────────────────────────────────────────────────
# Privacy Audit & Data Transparency Service — Makefile
#
# Usage: make <target>
# Run from the repo root (same folder as this Makefile).
# ─────────────────────────────────────────────────────────────────────────────

INFRA_DIR  := privacy-audit-infra
COMPOSE    := docker compose -f $(INFRA_DIR)/docker-compose.yml
ENV_FILE   := $(INFRA_DIR)/.env
ENV_EXAMPLE:= $(INFRA_DIR)/.env.example

# Detect if jq is available for prettier JSON output
JQ := $(shell command -v jq 2>/dev/null && echo "| jq ." || echo "")

.PHONY: help start stop reset restart build logs status ps \
        shell seed dev-analysis dev-retention dev-digest dev-seed-events \
        mongo-shell redis-cli pg-shell

# ── Help ─────────────────────────────────────────────────────────────────────
help:
	@printf "\n  \033[1mPrivacy Audit Service\033[0m — available commands\n\n"
	@printf "  \033[36mStartup\033[0m\n"
	@printf "    make start              Start all 9 services (auto-copies .env if needed)\n"
	@printf "    make stop               Stop all services (data is kept)\n"
	@printf "    make reset              Stop + wipe all data volumes (fresh DB)\n"
	@printf "    make restart            Restart without rebuilding images\n"
	@printf "    make build              Build Docker images only\n\n"
	@printf "  \033[36mLogs & Status\033[0m\n"
	@printf "    make logs               Tail all service logs (color-coded)\n"
	@printf "    make logs SERVICE=xyz   Tail one service (e.g. audit-backend)\n"
	@printf "    make status             Show health of all containers\n\n"
	@printf "  \033[36mDatabase shells\033[0m\n"
	@printf "    make pg-shell           psql into audit PostgreSQL\n"
	@printf "    make mongo-shell        mongosh into MongoDB\n"
	@printf "    make redis-cli          redis-cli into Redis\n"
	@printf "    make shell SERVICE=xyz  bash into any container\n\n"
	@printf "  \033[36mDev Triggers (set DEV_TOKEN=... first)\033[0m\n"
	@printf "    make dev-analysis       Run AI risk analysis now\n"
	@printf "    make dev-retention      Run retention purge now\n"
	@printf "    make dev-digest         Send weekly email digest now\n"
	@printf "    make dev-seed-events    Seed 20 sample events (set TENANT_ID=...)\n"
	@printf "\n"

# ── Environment setup ────────────────────────────────────────────────────────
$(ENV_FILE):
	@printf "  \033[33m→ Copying $(ENV_EXAMPLE) → $(ENV_FILE)\033[0m\n"
	@cp $(ENV_EXAMPLE) $(ENV_FILE)
	@printf "  \033[33m  ⚠  Edit $(ENV_FILE) to fill in real secrets.\033[0m\n"

# ── Start all services ────────────────────────────────────────────────────────
start: $(ENV_FILE)
	@printf "\n  \033[32m→ Starting all services...\033[0m\n\n"
	$(COMPOSE) up -d --build
	@printf "\n  \033[1mServices running:\033[0m\n"
	@printf "    \033[36mPrivacy Dashboard\033[0m  → http://localhost:3000\n"
	@printf "    \033[36mAudit API\033[0m          → http://localhost:8080/api\n"
	@printf "    \033[36mAPI Docs\033[0m           → http://localhost:8080/api/docs\n"
	@printf "    \033[36mHealthTrack App\033[0m    → http://localhost:3001\n"
	@printf "    \033[36mConnectSocial App\033[0m  → http://localhost:3002\n"
	@printf "\n  Run \033[1mmake logs\033[0m to watch startup or \033[1mmake status\033[0m to check health.\n\n"

# ── Stop ─────────────────────────────────────────────────────────────────────
stop:
	@printf "  \033[33m→ Stopping all services...\033[0m\n"
	$(COMPOSE) down
	@printf "  \033[32m  Done. Data volumes preserved.\033[0m\n"

# ── Reset (destroy all data) ──────────────────────────────────────────────────
reset:
	@printf "  \033[31m→ Stopping services and deleting all data volumes...\033[0m\n"
	$(COMPOSE) down -v
	@printf "  \033[32m  Done. Run 'make start' for a completely fresh environment.\033[0m\n"

# ── Restart (no rebuild) ──────────────────────────────────────────────────────
restart:
	$(COMPOSE) restart

# ── Build images only ─────────────────────────────────────────────────────────
build: $(ENV_FILE)
	$(COMPOSE) build

# ── Logs ─────────────────────────────────────────────────────────────────────
# Usage:
#   make logs                  — all services, follow mode
#   make logs SERVICE=audit-backend
#   make logs SERVICE=audit-backend LINES=200
LINES ?= 100
logs:
ifdef SERVICE
	$(COMPOSE) logs -f --tail=$(LINES) $(SERVICE)
else
	$(COMPOSE) logs -f --tail=$(LINES)
endif

# ── Status table ──────────────────────────────────────────────────────────────
status:
	@printf "\n  \033[1mContainer health:\033[0m\n\n"
	$(COMPOSE) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@printf "\n"

# ── Database shells ───────────────────────────────────────────────────────────
pg-shell:
	$(COMPOSE) exec postgres-audit psql -U postgres -d privacy_audit

pg-shell-health:
	$(COMPOSE) exec postgres-health psql -U postgres -d health_tenant

pg-shell-social:
	$(COMPOSE) exec postgres-social psql -U postgres -d social_tenant

mongo-shell:
	$(COMPOSE) exec mongo mongosh privacy_audit_ai

redis-cli:
	$(COMPOSE) exec redis redis-cli

# ── Arbitrary shell ───────────────────────────────────────────────────────────
# Usage: make shell SERVICE=audit-backend
shell:
	$(COMPOSE) exec $(SERVICE) sh

# ── Seed ─────────────────────────────────────────────────────────────────────
seed:
	@[ -f scripts/seed-demo.sh ] && bash scripts/seed-demo.sh || printf "  \033[33m  No seed script found yet.\033[0m\n"

# ── Developer triggers ────────────────────────────────────────────────────────
# All require DEV_TOKEN to be set: export DEV_TOKEN=your-dev-token

_check-dev-token:
	@[ -n "$(DEV_TOKEN)" ] || (printf "\n  \033[31mError: DEV_TOKEN is not set.\033[0m\n  Run: export DEV_TOKEN=dev-secret-change-me\n\n" && exit 1)

dev-analysis: _check-dev-token
	@printf "\n  \033[36m→ Triggering AI risk analysis...\033[0m\n"
	@curl -sf -X POST http://localhost:8080/api/dev/trigger-risk-analysis \
	  -H "x-dev-token: $(DEV_TOKEN)" $(JQ)
	@printf "\n"

dev-retention: _check-dev-token
	@printf "\n  \033[36m→ Triggering retention purge...\033[0m\n"
	@curl -sf -X POST http://localhost:8080/api/dev/trigger-retention \
	  -H "x-dev-token: $(DEV_TOKEN)" $(JQ)
	@printf "\n"

dev-digest: _check-dev-token
	@printf "\n  \033[36m→ Triggering weekly email digest...\033[0m\n"
	@curl -sf -X POST http://localhost:8080/api/dev/trigger-weekly-digest \
	  -H "x-dev-token: $(DEV_TOKEN)" $(JQ)
	@printf "\n"

dev-seed-events: _check-dev-token
	@[ -n "$(TENANT_ID)" ] || (printf "\n  \033[31mError: TENANT_ID is not set.\033[0m\n  Run: make dev-seed-events TENANT_ID=<uuid>\n\n" && exit 1)
	@printf "\n  \033[36m→ Seeding 20 events for tenant $(TENANT_ID)...\033[0m\n"
	@curl -sf -X POST http://localhost:8080/api/dev/seed-events \
	  -H "x-dev-token: $(DEV_TOKEN)" \
	  -H "Content-Type: application/json" \
	  -d '{"tenantId":"$(TENANT_ID)"}' $(JQ)
	@printf "\n"

# ── Shorthand aliases ─────────────────────────────────────────────────────────
up: start
down: stop
ps: status
