# Next Steps — DataGuard (as of 2026-05-06)

## Code changes to commit & push (do this first)

These 7 files are modified locally and not yet pushed. Render will auto-redeploy once you push.

```bash
git add PROGRESS_TRACKER.md DEMO_GUIDE.md \
  privacy-audit-backend/src/ai-chat/ai-chat.service.ts \
  privacy-audit-backend/src/risk/risk.service.ts \
  privacy-audit-frontend/src/api/client.ts \
  privacy-audit-frontend/src/components/AIChatButton/AIChatButton.tsx \
  privacy-audit-frontend/src/pages/Dashboard.tsx

git commit -m "feat: Phase 16 — AI persona, improved analysis prompt, Run Analysis Now button, last analysis banner"

git push
```

Render redeploy takes ~2-3 min per service.

---

## Manual steps (in order)

### 1. ✅ Redis eviction policy → noeviction
Already done (2026-05-06). Maxmemory Policy now shows `noeviction` in Render dashboard.

### 2. Verify BullMQ queue health (INFRA-2)
After Render redeploys, open Swagger:
`https://audit-backend-ddew.onrender.com/api/docs`

Find `GET /dev/queue-status` → enter your `x-dev-token` → Execute.
You want: `failed: 0`

### 3. Smoke test new dashboard features
Log in as admin on the live frontend and check:
- [ ] **"Run Analysis Now"** button visible in AI Analysis History section header
- [ ] Clicking it triggers analysis and shows "Done — N alert(s) generated."
- [ ] **"Last analysis: X ago · N findings"** caption appears below the section heading
- [ ] Section is visible even before any analysis has run (admin-only view)

> Note: The button reads `dev_token` from `localStorage` first (set via AI Settings page),
> then falls back to `VITE_DEV_TOKEN` env var. If you've visited AI Settings before, it just works.

---

## Optional / skip for demo

| Task | Notes |
|---|---|
| DB backup scripts (`db-dump.sh` / `db-restore.sh`) | Nice-to-have safety net — not needed for dissertation demo |
| Google OAuth on Render | Skipped — admin email/password login works fine |

---

## Summary of what was done this session

| What | Where |
|---|---|
| "Run Analysis Now" button (admin only) | `Dashboard.tsx` |
| "Last analysis: X ago · N findings" banner | `Dashboard.tsx` |
| `triggerRiskAnalysis()` added to `devApi` | `api/client.ts` |
| Improved AI risk analysis prompt (GDPR article citations, severity thresholds, strict JSON output) | `risk.service.ts` |
| AI persona fixes (off-topic refusal, hides provider label) | `ai-chat.service.ts`, `AIChatButton.tsx` |
| Redis Maxmemory Policy changed to `noeviction` | Render dashboard |
