---
name: organuz-run-tests
description: Run the Organuz Playwright suites (ui / organuz-api / product) against the right target and environment, including the local FastAPI+Grafana stack. Use when asked to run tests, run a specific project, switch environment, or debug the local server stack / port conflicts.
---

# Running the Organuz test suites

The default `npx playwright test` runs **3 tests** (all green): `agent` 2 + `organuz-api` 1. With `MONITORING_ENABLED=true` the opt-in `monitoring` project adds 50 live checks → **53 total**.

> **⚠️ Several projects are CURRENTLY DISABLED** — `chromium`, `product`, `product-setup`, and `product-authenticated` are commented out in `playwright.config.ts` (spec files retained; re-enable by uncommenting). While disabled, `npx playwright test --project=chromium` (or `--project=product`, etc.) reports "no tests". The rows for them below apply once re-enabled.

The main project targets:

| Project | testMatch | Target |
|---|---|---|
| `organuz-api` *(active)* | `tests/organuz-api/**` (`@other-smoke`) | Organuz Supabase backend (`/rest/v1/projects`, edge functions) |
| `agent` *(active)* | `tests/agent/**` (`@other-smoke`) | QA-agent orchestrator unit spec (stubs, no network) |
| `chromium` *(disabled)* | `tests/ui/**` (`@other-smoke`) | Marketing site `www.organuz.ai` (prod) |
| `product` *(disabled)* | `tests/product/**` (excl. `flows/**`) | Product app — `QA_TARGET_ENV` (default **dev** `dev1.app.organize.organuz.com`) |
| `product-setup` → `product-authenticated` *(disabled)* | `tests/product/support/auth.setup.ts` → `tests/product/flows/**` | Live per-role sanity e2e (skip-safe without creds) |

## Commands
- **Full local run + server stack + reports:** `./scripts/run-all-tests.sh`. It:
  1. typechecks (`npx tsc --noEmit`);
  2. auto-starts the Docker stack (`api swagger prometheus grafana pushgateway`) if it isn't already healthy;
  3. runs every real project in one invocation so Allure aggregates the whole suite — `--project=chromium --project=organuz-api --project=product --project=agent` (the credential-gated role flows stay out), then generates the Allure 3 report. **Note:** with `chromium` and `product` currently disabled in `playwright.config.ts`, only `organuz-api` + `agent` actually produce tests (3 total); re-enable those projects to restore their coverage;
  4. brings all servers up (adding `allure`) and **pushes this run's QA metrics to the Pushgateway** via `scripts/push-qa-metrics.mjs` (Prometheus scrapes it → Grafana);
  5. opens the servers (incl. the Grafana dashboard) and posts the Allure + Grafana links to Slack.
- **Server ports:** FastAPI `api` **8000**, Scalar/Swagger **8080**, Pushgateway **9091**, Prometheus **9092**, Grafana **3001**, Allure **5050**.
- One project: `npx playwright test --project=organuz-api --reporter=list` (or `npm run test:ui` / `test:product`).
- Switch environment: `QA_TARGET_ENV=prod npx playwright test --project=product` (or set it in `.env`).
- **Opt-in live monitoring:** `npm run test:monitoring` (`MONITORING_ENABLED=true`) registers the `monitoring` project — Govmap 25 + Ofek 25 = 50 live third-party availability checks (total suite 53). The default suite never runs these, so the green PR gate can't break on a Govmap/Ofek outage. `run-all-tests.sh` also adds `--project=monitoring` when `MONITORING_ENABLED=true`.
- Always `npx tsc --noEmit` before a run — the script does this first.

## Env / secrets
- Local overrides live in the **gitignored** `.env` (target env, dev credentials — Restricted). `.env.example` documents the vars. `.env` MUST stay gitignored.
- The token-sanity / public-app-sanity dev checks need `PRODUCT_PLATFORM_PASSWORD` (dev password gate). Live per-role specs need per-role `<ROLE>_PHONE` / `<ROLE>_OTP_CODE` (CUSTOMER, CONSULTANT, COMPANY); absent → those roles skip. See the [organuz-product-roles] skill.
- The `product-setup` project (a dependency of `product-authenticated`) logs each role in once and saves `storageState`; per-role specs reuse it, so a full run does one OTP send per role. Sessions land in `playwright/.auth/` (gitignored); delete them to force a fresh login.
- Slack report links come from the gitignored `.env`: `SLACK_WEBHOOK_URL` and `SLACK_WEBHOOK_BOT_URL` (either/both; unset = skipped). Disable posting with `NOTIFY_SLACK=false`.

## Gotchas
- **Port 8000 conflict:** a leftover `ai_automation_testing` compose stack also binds 8000. If `run-all-tests.sh` fails with "port is already allocated", `docker stop ai_automation_testing-automation-server-1`.
- **QA metrics now go via the Pushgateway** (`scripts/push-qa-metrics.mjs` reads `test-results/results.json` → pushes `qa_playwright_*`). The `api` container no longer bind-mounts / reads `test-results`, so the old "stale bind-mount / restart api after tests" gotcha is gone. If Grafana test panels are empty, check the push step ran (Pushgateway ready at :9091, `results.json` present).
- Never use `waitForLoadState('networkidle')` in product tests (map iframe keeps the network busy).
