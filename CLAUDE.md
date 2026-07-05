# OrGanuz AI Site Test Automation

Playwright + TypeScript test suite for Organuz, plus a local FastAPI/Prometheus/Grafana stack that turns Playwright results into a QA dashboard.

## Test projects (`playwright.config.ts`)
- **`chromium`** → `tests/ui/**` → marketing site `www.organuz.ai` (prod).
- **`product`** → `tests/product/**` → product calculator app; environment via `QA_TARGET_ENV` (dev | test | prod, **default dev** `dev1.app.organize.organuz.com`), resolved from `config.json → environments`.
- **`organuz-api`** → `tests/organuz-api/**` → Organuz Supabase backend (`/rest/v1/projects`, edge functions) with a public anon key.
- **`dev-api`** → `tests/dev-api/**` → the dev product-app backend at `organuz.flamiingo.com` — an RPC gateway (`POST /?call=<method>`), public baked-in token. Read-only contract tests (`get_arena_types`, `get_remaining_projects`, error envelopes).

Page objects: `src/pages` (marketing site), `tests/product/support/ProductAppPage.ts` (product app). API client: `src/api` (+ `OrganuzApi`). Shared config: `src/utils/config.ts` reads `config.json` with env-var overrides. Fixtures: `src/fixtures`.

## Environments & secrets
- `QA_TARGET_ENV` selects the product target; `APP_BASE_URL`/`APP_ADMIN_URL` override explicitly.
- Local overrides + credentials live in the **gitignored `.env`** (Restricted — from the "Organuz Environments" doc). Never commit `.env` or move credentials into committed files. `.env.example` documents the vars with placeholders.
- Dev/Test product apps sit behind a shared password gate; dev login uses phone + fixed OTP `7777`.

## Conventions
- Specs import `test`/`expect` from `src/fixtures` (adds Allure attachments + failure capture) and use the `allureEpic/Feature/Story/Severity/Step` helpers with `@tag`s.
- Run `npx tsc --noEmit` before running tests.
- Never use `waitForLoadState('networkidle')` in product tests — the map iframe keeps the network busy; use `domcontentloaded` or `expect` auto-waiting.

## Skills
Project skills live in `.claude/skills/`. Invoke with `/<name>`:
- **`organuz-run-tests`** — run the suites against the right project/environment, plus the local server stack and its gotchas (port-8000 conflict, stale Grafana data).
- **`organuz-product-e2e`** — drive/debug the product calculator end-to-end: dev password gate, phone+OTP login, the characterization wizard (confirmed dev selectors/URLs), and the `ProductFlows` fixture. Use when working on `tests/product/**` or exploring dev with the Playwright MCP.
- **`organuz-api-tests`** — write/debug contract & API tests against the Organuz Supabase backend (`tests/organuz-api/**`): projects REST resource, anon key, RLS, edge-function preflights.
- **`organuz-monitoring`** — build/debug the Grafana+Prometheus stack: dashboards from `qa_playwright_*` metrics, the process CPU/mem/network metrics, and the port-8000 / stale-bind-mount gotchas.

Add new skills under `.claude/skills/<name>/SKILL.md` (frontmatter: `name`, `description`) and list them here.
