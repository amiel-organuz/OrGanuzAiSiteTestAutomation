# OrGanuz AI Site Test Automation

Playwright + TypeScript test suite for Organuz, plus a local FastAPI/Prometheus/Grafana stack that turns Playwright results into a QA dashboard.

## Test projects (`playwright.config.ts`)
- **`chromium`** → `tests/ui/**` → marketing site `www.organuz.ai` (prod), default-filtered to `@other-smoke`.
- **`product`** → product calculator specs that do not need shared role storage (`smoke`, registration, full-flow, matrix, sign-out); environment via `QA_TARGET_ENV` (dev | test | prod, **default dev** `dev1.app.organize.organuz.com`), resolved from `config.json → environments`.
- **`product-authenticated`** → per-role specs that resume saved sessions. Depends on **`product-setup`** (`tests/product/support/auth.setup.ts`), which logs each role in once and saves its `storageState` to `playwright/.auth/` (gitignored).
- **`organuz-api`** → `tests/organuz-api/**` → Organuz Supabase backend (`/rest/v1/projects`, edge functions) with a public anon key, default-filtered to `@other-smoke`.
- **`dev-api`** → `tests/dev-api/**` → the dev product-app backend at `organuz.flamiingo.com` — an RPC gateway (`POST /?call=<method>`), public baked-in token, default-filtered to `@other-smoke`.

Page objects: `src/pages` (marketing site), `tests/product/support/ProductAppPage.ts` (product app). UI journey fixtures live in `tests/ui/support` (for example `siteFlows`) layered on top of shared `src/fixtures`. API client: `src/api` (+ `OrganuzApi`). Shared config: `src/utils/config.ts` reads `config.json` with env-var overrides.

## Environments & secrets
- `QA_TARGET_ENV` selects the product target; `APP_BASE_URL`/`APP_ADMIN_URL` override explicitly.
- Local overrides + credentials live in the **gitignored `.env`** (Restricted — from the "Organuz Environments" doc). Never commit `.env` or move credentials into committed files. `.env.example` documents the vars with placeholders.
- Dev/Test product apps sit behind a shared password gate; dev login uses phone + fixed OTP `7777`.

## Conventions
- Specs import `test`/`expect` from `src/fixtures` unless a domain-specific support fixture extends it (for example `tests/ui/support/fixtures` or `tests/product/support/fixtures`). Use the `allureEpic/Feature/Story/Severity/Step` helpers with `@tag`s.
- Run `npx tsc --noEmit` before running tests.
- Non-product projects intentionally run only five default smoke tests via `@other-smoke` (2 UI, 1 Organuz API, 1 dev RPC, 1 agent). Product projects carry the main coverage.
- Never use `waitForLoadState('networkidle')` in product tests — the map iframe keeps the network busy; use `domcontentloaded` or `expect` auto-waiting.
- Product per-role specs resume a saved session (`test.use({ authRole })` + `resumeSession()`), never `loginAs()` per test — that's only for `product-setup` and the isolated `role-logout` spec. The page object throws `OtpUnavailableError` on OTP rate-limit; `ProductFlows` turns it (and a missing saved session) into a graceful `test.skip`, so keep skip/lifecycle logic out of `ProductAppPage`.

## Skills
Project skills live in `.claude/skills/`. Invoke with `/<name>`:
- **`organuz-run-tests`** — run the suites against the right project/environment, plus the local server stack and its gotchas (port-8000 conflict, stale Grafana data).
- **`organuz-product-e2e`** — drive/debug the product calculator end-to-end: dev password gate, phone+OTP login UI, the characterization wizard (confirmed dev selectors/URLs), the `ProductFlows` fixture, and MCP driving. Use when working on `tests/product/**` or exploring dev with the Playwright MCP.
- **`organuz-product-roles`** — per-role auth & session reuse (`product-setup` + `storageState` + `resumeSession`), the customer/consultant/company roles and their personal areas, and the role specs under `tests/product/flows`. Use when writing/fixing per-role product tests, the auth setup, or the product fixtures.
- **`organuz-api-tests`** — write/debug contract & API tests against the Organuz Supabase backend (`tests/organuz-api/**`): projects REST resource, anon key, RLS, edge-function preflights.
- **`organuz-monitoring`** — build/debug the Grafana+Prometheus stack: dashboards from `qa_playwright_*` metrics, the process CPU/mem/network metrics, and the port-8000 / stale-bind-mount gotchas.

Add new skills under `.claude/skills/<name>/SKILL.md` (frontmatter: `name`, `description`) and list them here.
