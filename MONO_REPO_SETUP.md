# Mono-Repo Setup Guide

Your local folder `/Users/seenivasan/Documents/personal/rakesh/project/` is **already the perfect mono-repo structure**. You just need to initialise git and push it to a single GitHub repo.

## Why mono-repo?

| | Separate repos (current) | Mono-repo (recommended) |
|---|---|---|
| GitHub Actions CI | 1 workflow per repo × 6 repos | 1 workflow, covers everything |
| Render deployment | `render.yaml` can't span repos | `render.yaml` at root, covers all services |
| `docker-compose.yml` | Already spans all services | No change needed |
| Code sharing (SDKs) | Hard to reference across repos | Just import from subdirectory |
| Dissertation submission | 6 repos to hand in | 1 repo, clean |

## Migration Steps

### Step 1 — Create a new GitHub repo

Go to https://github.com/new and create:
- Name: `privacy-audit-platform`
- Visibility: Private (or Public — your choice)
- **Do NOT** initialise with README or .gitignore

### Step 2 — Initialise local git

```bash
cd /Users/seenivasan/Documents/personal/rakesh/project

# Initialise git at the project root
git init

# Create a .gitignore
cat > .gitignore << 'EOF'
# Node
node_modules/
dist/
.env
*.local

# Python
__pycache__/
*.pyc
.venv/
venv/
*.egg-info/

# Go
*.exe
*.test

# Docker
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
EOF

# Stage everything
git add .

# First commit
git commit -m "Initial commit: Privacy Audit & Data Transparency Service (mono-repo)

Multi-tenant privacy audit SaaS — Rakesh Velavaluri, Griffith College Dublin
- NestJS audit backend (port 8080)
- React privacy dashboard (port 3000)
- Go health tenant (port 8081)
- FastAPI social tenant (port 8062)
- Go/Python/JS SDKs
- Full Docker Compose (9 services)
- Render Blueprint for cloud deploy"

# Add remote and push
git remote add origin https://github.com/VirtualBeetle/privacy-audit-platform.git
git branch -M main
git push -u origin main
```

That's it. GitHub Actions CI will trigger on the first push.

### Step 3 — Archive the old separate repos (optional)

Go to each old repo on GitHub → Settings → scroll to bottom → **Archive this repository**.
This marks them as read-only so future viewers know the mono-repo is the canonical one.

Old repos to archive:
- `VirtualBeetle/privacy-audit-backend`
- `VirtualBeetle/privacy-audit-frontend`
- `VirtualBeetle/privacy-audit-infra`
- `VirtualBeetle/privacy-health-tenant`
- `VirtualBeetle/privacy-social-media-tenant`
- `VirtualBeetle/privacy-audit-sdk`

### Step 4 — Verify CI is passing

Go to `github.com/VirtualBeetle/privacy-audit-platform/actions` — you should see the CI workflow running for the first push.

---

## What's in the mono-repo root

```
privacy-audit-platform/
├── .github/
│   └── workflows/
│       └── ci.yml              ← CI runs on every push/PR
├── render.yaml                 ← Render Blueprint (must be at root)
├── Makefile                    ← make start / make logs / make dev-analysis
├── start.sh                    ← ./start.sh one-command local startup
├── DEPLOY.md                   ← Full deployment guide
├── PROGRESS_TRACKER.md
├── architecture-diagram.excalidraw
│
├── privacy-audit-backend/      ← NestJS, TypeORM, BullMQ
├── privacy-audit-frontend/     ← React, Vite, MUI
├── privacy-audit-infra/
│   ├── docker-compose.yml      ← All 9 services
│   ├── .env.example            ← Template for local dev
│   └── README.md
├── privacy-health-tenant/
│   ├── backend/                ← Go + Gin
│   └── frontend/               ← React
├── privacy-social-media-tenant/
│   ├── backend/                ← FastAPI + Python
│   └── frontend/               ← React
└── privacy-audit-sdk/
    ├── go/
    ├── python/
    └── js/
```
