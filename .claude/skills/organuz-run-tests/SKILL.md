---
name: organuz-run-tests
description: Run the Organuz Playwright suites (ui / organuz-api / product) against the right target and environment, including the local FastAPI+Grafana stack. Use when asked to run tests, run a specific project, switch environment, or debug the local server stack / port conflicts.
---

# Running the Organuz test suites

Three Playwright projects (`playwright.config.ts`), each with its own `baseURL`:

| Project | testMatch | Target |
|---|---|---|
| `chromium` | `tests/ui/**` | Marketing site `www.organuz.ai` (prod) |
| `product` | `tests/product/**` | Product app — `QA_TARGET_ENV` (default **dev** `dev1.app.organize.organuz.com`) |
| `organuz-api` | `tests/organuz-api/**` | Organuz Supabase backend (`/rest/v1/projects`, edge functions) |

## Commands
- Full local run + server stack + reports: `./scripts/run-all-tests.sh` (typechecks, brings up Docker: FastAPI:8000, Scalar:8080, Prometheus:9092, Grafana:3001, Allure:5050; runs `chromium`+`organuz-api`; opens the servers including the Grafana dashboard). It restarts the api container after tests so Grafana test metrics refresh.
- One project: `npx playwright test --project=organuz-api --reporter=list`
- Product smoke (credential-free, safe) vs dev: `npx playwright test --project=product tests/product/smoke`
- Switch environment: `QA_TARGET_ENV=prod npx playwright test --project=product` (or set it in `.env`).
- Always `npx tsc --noEmit` before a run — the script does this first.

## Env / secrets
- Local overrides live in the **gitignored** `.env` (target env, dev credentials — Restricted). `.env.example` documents the vars. `.env` MUST stay gitignored.
- Product persona E2E is gated by `PRODUCT_E2E_ENABLED=true` + persona phones + OTP `7777` (see [organuz-product-e2e] skill). The credential-free `tests/product/smoke` always runs.
- `--project=product` auto-runs its `product-setup` dependency (`tests/product/support/auth.setup.ts`), which logs each role in once and saves `storageState`; per-role specs reuse it, so a full run does one OTP send per role. Sessions land in `playwright/.auth/` (gitignored); delete them to force a fresh login.

## Gotchas
- **Port 8000 conflict:** a leftover `ai_automation_testing` compose stack also binds 8000. If `run-all-tests.sh` fails with "port is already allocated", `docker stop ai_automation_testing-automation-server-1`.
- **Stale Grafana test data:** Playwright wipes `test-results/` each run, changing its inode; on macOS the long-running `api` container then serves an empty mount. The script now `docker compose restart api` after tests to fix this.
- Never use `waitForLoadState('networkidle')` in product tests (map iframe keeps the network busy).
