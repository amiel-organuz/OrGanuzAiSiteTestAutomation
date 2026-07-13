# OrGanuz AI Site Test Automation

Playwright + TypeScript test suite for Organuz, plus a local FastAPI/Prometheus/Grafana stack that turns Playwright results into a QA dashboard.

## Test projects (`playwright.config.ts`)
- **`chromium`** → `tests/ui/**` → marketing site `www.organuz.ai` (prod), default-filtered to `@other-smoke`.
- **`product`** → `tests/product/**` → product calculator; environment via `QA_TARGET_ENV` (dev | test | prod, **default dev** `dev1.app.organize.organuz.com`), resolved from `config.json → environments`. No default grep, so every `tests/product/**` spec runs: the token-sanity API spec (extracts the dev UI token via `TokenInterceptor`) and the matrix data-contract spec.
- **`organuz-api`** → `tests/organuz-api/**` → Organuz Supabase backend (`/rest/v1/projects`, edge functions) with a public anon key, default-filtered to `@other-smoke`.
- **`agent`** → `tests/agent/**` → QA-agent orchestrator unit spec (stubs, no network/browser), default-filtered to `@other-smoke`.

The default `npx playwright test` runs 20 all-passing tests (chromium 2, product 16, organuz-api 1, agent 1). GitHub Actions runs the identical set — keep the two in sync per the **`test-suite-parity`** skill.

Page objects: `src/pages` (marketing site), `tests/product/support/ProductAppPage.ts` (product app). Shared fixtures: `src/fixtures` (+ the token-extractor fixtures in `src/fixtures/token-fixtures.ts`). API client: `src/api` (+ `OrganuzApi`). Shared config: `src/utils/config.ts` reads `config.json` with env-var overrides.

## Environments & secrets
- `QA_TARGET_ENV` selects the product target; `APP_BASE_URL`/`APP_ADMIN_URL` override explicitly.
- Local overrides + credentials live in the **gitignored `.env`** (Restricted — from the "Organuz Environments" doc). Never commit `.env` or move credentials into committed files. `.env.example` documents the vars with placeholders.
- Dev/Test product apps sit behind a shared password gate (`PRODUCT_PLATFORM_PASSWORD`); the token-sanity spec needs it to open the dev calculator. On CI it's the `PRODUCT_PLATFORM_PASSWORD` GitHub repo secret (see the `test-suite-parity` skill).

## Conventions
- Specs import `test`/`expect` from `src/fixtures` unless a domain-specific support fixture extends it (for example `tests/ui/support/fixtures` or `tests/product/support/fixtures`). Use the `allureEpic/Feature/Story/Severity/Step` helpers with `@tag`s.
- Run `npx tsc --noEmit` before running tests.
- Non-product projects intentionally run only their `@other-smoke` test by default (chromium 2, organuz-api 1, agent 1); the `product` project has no grep filter and carries the rest.
- Never use `waitForLoadState('networkidle')` in product tests — the map iframe keeps the network busy; use `domcontentloaded` or `expect` auto-waiting.
- Environmental outages are typed errors in `tests/product/support/errors.ts` (`OtpUnavailableError`, `AppUnavailableError`) — `instanceof`-safe (they set the prototype/name, since Playwright's transpiler otherwise severs `extends Error`). `ProductAppPage`/`env-gate`/`ProductFlows` **throw** them; the test edge (spec or fixture) decides whether to skip or fail. Keep skip/lifecycle logic out of the page object and the flows.
- The suite must stay all-green with no skips: a test that would `test.skip()` on an environmental condition should instead run or be removed (see the `test-suite-parity` skill).

## Skills
Project skills live in `.claude/skills/`. Invoke with `/<name>`:
- **`organuz-run-tests`** — run the suites against the right project/environment, plus the local server stack and its gotchas (port-8000 conflict, stale Grafana data).
- **`organuz-product-e2e`** — drive/debug the product calculator end-to-end: dev password gate, phone+OTP login UI, the characterization wizard (confirmed dev selectors/URLs), the `ProductFlows` fixture, and MCP driving. Use when working on `tests/product/**` or exploring dev with the Playwright MCP.
- **`organuz-product-roles`** — per-role auth & session reuse (`product-setup` + `storageState` + `resumeSession`), the customer/consultant/company roles and their personal areas, and the role specs under `tests/product/flows`. Use when writing/fixing per-role product tests, the auth setup, or the product fixtures.
- **`organuz-api-tests`** — write/debug contract & API tests against the Organuz Supabase backend (`tests/organuz-api/**`): projects REST resource, anon key, RLS, edge-function preflights.
- **`organuz-monitoring`** — build/debug the Grafana+Prometheus stack: dashboards from `qa_playwright_*` metrics, the process CPU/mem/network metrics, and the port-8000 / stale-bind-mount gotchas.
- **`test-suite-parity`** — keep the Playwright suite identical locally and on GitHub Actions (same projects/tests, all green). Use when adding/removing a test or project, editing `playwright.config.ts`, or `.github/workflows/parallel-tests.yml`.

Add new skills under `.claude/skills/<name>/SKILL.md` (frontmatter: `name`, `description`) and list them here.
