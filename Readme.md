# OrGanuz AI Site Test Automation

Playwright TypeScript automation for `www.organuz.ai` and the Organuz product application, with a supporting Docker Compose stack for API documentation, observability, and containerized test execution.

## Stack

- Playwright for marketing UI, product smoke/registration/matrix/role flows, Organuz Supabase backend API, dev product-app RPC gateway, and agent-orchestrator regression tests
- TypeScript for test and framework code
- FastAPI service for local API endpoints and health checks
- Scalar API reference for external OpenAPI documentation
- Prometheus for metrics scraping
- Grafana for metrics dashboards, including the provisioned OrGanuz QA Dashboard
- Allure and Playwright HTML reports for test results
- A QA agent orchestrator (`src/agent/`) that coordinates Azure DevOps, Playwright, OneDrive, and Google Sheets, can enrich test cases from PDF/DOCX/XLSX requirements documents, and can run the repository's current Playwright projects through a real CLI-backed runner — plus a `TestPlanAgent` that generates a test plan from a URL by driving the Playwright MCP CLI server

## Project Structure

```text
.
|-- Dockerfile
|-- docker-compose.yml
|-- playwright.config.ts
|-- scripts/
|   `-- run-all-tests.sh
|-- server/
|   |-- Dockerfile
|   |-- grafana/
|   |   `-- provisioning/
|   |-- prometheus.yml
|   |-- requirements.txt
|   |-- scalar/
|   `-- app/
|       `-- main.py
|-- docs/test-plans/          # written test plan per group + index, and pdf/ renders
|-- test-requirements-docs/   # sample requirements docs for the QA agent (generated)
|-- src/
|   |-- agent/                # QA agent orchestrator + TestPlanAgent (see src/agent/README.md)
|   |   |-- connectors/       # Azure DevOps, Google Sheets, OneDrive, Playwright, Playwright-MCP CLI client (+ stubs)
|   |   |-- utils/            # RequirementsReader (PDF/DOCX/XLSX parsing)
|   |   `-- demo/             # seed data, offline demo, generate-test-plan
|   |-- api/
|   |-- fixtures/
|   |-- pages/
|   |-- types/               # central types (agent, api, token, allure, organuz) + barrel
|   |-- tools/               # build-test-plan-pdfs
|   `-- utils/
`-- tests/
    |-- agent/
    |   `-- orchestrator/      # QA agent orchestrator specs
    |-- organuz-api/
    |   |-- contracts/         # Supabase/PostgREST projects schema + contract coverage
    |   |-- resources/         # projects query behaviours (select, order, filter, count)
    |   |-- security/          # anon auth, RLS, and negative cases
    |   `-- functions/         # edge-function CORS preflight checks
    |-- dev-api/
    |   |-- contracts/         # organuz.flamiingo.com RPC gateway envelope + invariants
    |   |-- security/          # RPC negative/security + input-validation cases
    |   `-- support/           # FlamiingoApi RPC client + fixtures
    |-- product/
    |   |-- matrix/            # product E2E matrix data + specs (credential-gated)
    |   |-- flows/             # registration, full-flow, role specs (roles, areas, session, sanity, logout)
    |   |-- api/               # gated product role backend API checks
    |   |-- smoke/             # credential-free public calculator shell checks
    |   `-- support/           # page helpers, ProductFlows, fixtures, product-setup auth (storageState)
    |-- ui/
    |   |-- content/           # blog, FAQ, agents, projects, static pages
    |   |-- diagnostics/       # expected-failure pipeline checks
    |   |-- flows/             # cross-section critical user journeys
    |   |-- support/           # UI-only flow fixtures such as siteFlows
    |   `-- homepage/          # hero, navigation, contact
    `-- constants.ts
```

## Local Setup

Install dependencies:

```bash
npm ci
```

Run all tests locally with the project defaults:

```bash
npm test
```

`npm test` runs every project configured in `playwright.config.ts`: `chromium`, `product`, `product-setup`, `product-authenticated`, `organuz-api`, `dev-api`, and the internal `agent` orchestrator project. Product live browser flows stay gated unless `PRODUCT_E2E_ENABLED=true` and persona credentials are set. Non-product projects are intentionally default-filtered to exactly six `@other-smoke` tests total: two UI checks, one Organuz API contract, one dev RPC contract, and two agent tests (the orchestrator regression and the URL-driven test-plan generator).

Run the full local automation flow:

```bash
./scripts/run-all-tests.sh
```

This script typechecks the project, starts the local runtime stack when needed, runs the Playwright `chromium`, `organuz-api`, `product`, and `agent` projects in one invocation (into a freshly cleaned `allure-results/`, so the report aggregates all of them), generates an Allure 3 report, brings up all local servers (FastAPI, Scalar, Prometheus, Pushgateway, Grafana, Allure), pushes the run's QA metrics to the Pushgateway so Grafana shows fresh results, opens the Grafana dashboard, and prints the main service URLs at the end. The credential-gated role flows (`product-setup` → `product-authenticated`) stay out; run those directly with `npx playwright test --project=product-authenticated`.

Run only UI tests:

```bash
npm run test:ui
```

Run the 50-test product E2E matrix:

```bash
npm run test:product
```

The product suite is split into the plain `product` project and the role-session `product-authenticated` project. The matrix is data-driven from `tests/product/matrix/e2e-matrix.data.ts` and includes:

- 12 main `CALC-ROOF-*` characterization scenarios from the working document.
- 4 personas per main scenario: customer, consultant, company, and company employee.
- Property types: private house, residential building, commercial, agricultural, and public.
- Polygon behavior: building, parking, sports court, and mixed building + parking/sports-court flows.
- Roof/surface types: concrete, tiles, iscoverit, parking, and sports court.
- Negative coverage for fewer than 5 panels.
- UI-only tracking for the no-panel case, where the request should not be sent.

`npm run test:product` is intentionally scoped to the 50 live E2E matrix tests in `Product calculator and quotation E2E matrix`: 48 main scenario/persona combinations, one insufficient-panels negative case, and one company-employee access-blocking case.

For the broader product suite, use:

```bash
npm run test:product:all
```

### External API monitoring (Govmap + Ofek)

Dedicated availability + contract monitoring for the two critical third-party map dependencies the product relies on — **Govmap** (`www.govmap.gov.il`, map API + address geocoding) and **Ofek** (`basemaps.govmap.gov.il`, the Survey-of-Israel national orthophoto tiles the roof scan runs on). 25 checks each (50 total), using `APIRequestContext` only (no browser).

```bash
npm run test:monitoring
```

It is **opt-in** (registered only when `MONITORING_ENABLED=true`) so it never runs in the default suite, and it is *meant to fail* when a dependency is down — that is the alert. A scheduled GitHub Actions workflow (`.github/workflows/monitoring.yml`, every 30 min) runs it separately from the PR gate. On failure it opens a single auto-managed `monitoring-alert` GitHub issue (auto-closed on the next green run) and, if a `SLACK_WEBHOOK_URL` repository secret is set, posts a Slack alert. Endpoints, tokens, and tile coordinates live in `config.json → monitoring`.

The broader `product` project also includes credential-free smoke specs and registration coverage. Smoke checks exercise the public calculator shell served before login — the Organuz title, arena entry points, register/login entry, the four-step characterization stepper, the address step, and the disabled "continue" state — so the project has real runnable coverage even without persona credentials. Registration specs cover property-owner form validation, required terms consent, invalid mobile gating, optional consent behavior, full property-owner signup, and company/consultant lead-form redirects.

The live persona browser flows are opt-in until live app credentials and stable selectors are available:

```bash
PRODUCT_E2E_ENABLED=true \
CUSTOMER_PHONE=... CUSTOMER_OTP_CODE=... \
CONSULTANT_PHONE=... CONSULTANT_OTP_CODE=... \
COMPANY_PHONE=... COMPANY_OTP_CODE=... \
COMPANY_EMPLOYEE_PHONE=... COMPANY_EMPLOYEE_OTP_CODE=... \
npm run test:product
```

Email/password variables are still supported as a fallback, but the live app currently exposes a phone/OTP login path.

Under the hood, only the `product-authenticated` project depends on `product-setup` (`tests/product/support/auth.setup.ts`). Setup logs each authenticated role — `customer`, `consultant`, `company` — in once and saves its `storageState` to `playwright/.auth/` (gitignored). The per-role specs (`roles`, `role-areas`, `role-session`, `role-sanity`, `role-backend`) then resume that saved session via `test.use({ authRole })` + `product.resumeSession()` instead of logging in again, so those specs perform at most one OTP send per role. Registration, smoke, matrix, full-flow, and sign-out stay in the plain `product` project so they do not trigger shared auth setup unnecessarily. `company-employee` has no phone and cannot sign in.

By default, broad lower-priority marketing suites tagged `@low-priority` are excluded. Set `INCLUDE_LOW_PRIORITY_TESTS=true` to include them.

Run the Organuz backend API tests:

```bash
npx playwright test --project=organuz-api
```

The `organuz-api` project targets the Organuz Supabase/PostgREST backend (`config.json → organuzApi`). It exercises the `/rest/v1/projects` REST resource (contracts, query behaviours, anon-key auth/RLS) and the edge-function CORS preflights, using the public `anon` key baked into the site bundle. Tests are read-only; they never POST to the edge functions.

Run the dev product-app API tests:

```bash
npx playwright test --project=dev-api
```

The `dev-api` project targets the dev/test product-app backend at `organuz.flamiingo.com` (`config.json → devApi`). It is not REST but an RPC gateway: every call is `POST /` with a form body `action=token&token=<token>&call=<method>`, returning a JSON `{ status: "ok", ... }` envelope. The tests cover the read-only public methods the app calls before login (`get_arena_types`, `get_remaining_projects`) plus envelope invariants, token/input hardening, and RPC negative/security cases, using the public token baked into the app bundle.

Run the agent regression tests:

```bash
npx playwright test --project=agent
```

Run type checking:

```bash
npm run typecheck
```

Run the linter:

```bash
npm run lint
```

Linting uses ESLint's flat config (`eslint.config.mjs`) with the `typescript-eslint` recommended ruleset over `src/` and `tests/`.

## QA Agent

The repository includes a QA agent orchestrator under `src/agent/`. It coordinates four systems — Azure DevOps (system of record), Playwright (execution), OneDrive (evidence store), and Google Sheets (test data and results log) — and runs the suite end-to-end: read cases, optionally enrich acceptance criteria from requirements docs, pull data, execute, push evidence, write results back, file bugs idempotently, re-run flaky failures once, and emit a summary.

Run the offline demo (everything wired to in-memory stubs, no credentials needed):

```bash
npm run agent:demo
```

Run the repository's real Playwright projects through the agent (stubbed Azure DevOps/Sheets/OneDrive, real Playwright CLI):

```bash
npm run agent:current-tests
```

Generate a test plan from a URL. The `TestPlanAgent` explores a page and emits a `TestSuite` (page-load, headings, per-link, and form cases) in the same shape the orchestrator consumes. Offline by default; `--live` drives the real **Playwright MCP CLI server** (`npx @playwright/mcp`) to explore a live browser:

```bash
npm run agent:plan -- https://www.organuz.ai          # offline stub
npm run agent:plan -- https://www.organuz.ai --live   # real browser via Playwright MCP
```

Written test plans for every test group live in [`docs/test-plans/`](docs/test-plans/) (one per group + index). Render them to PDF (`docs/test-plans/pdf/`) with:

```bash
npm run test-plans:pdf
```

`agent:current-tests` generates one orchestrator case per current Playwright project:

| Case | Command |
| --- | --- |
| `PW-ORGANUZ-API` | `npx playwright test --project=organuz-api` |
| `PW-CHROMIUM` | `npx playwright test --project=chromium` |
| `PW-PRODUCT` | `npx playwright test --project=product --grep "Product calculator and quotation E2E matrix"` |
| `PW-AGENT` | `npx playwright test --project=agent` |

The command exits non-zero if any mapped project fails or is blocked.

Generate a sample set of requirements documents and run with enrichment enabled:

```bash
npm run agent:build && node dist/src/agent/demo/generate-test-files.js
QA_REQUIREMENTS_PATH=test-requirements-docs npm run agent:demo
```

The agent has its own Playwright project (`agent`, matching `tests/agent/**/*.spec.ts`) for orchestrator regression coverage:

```bash
npx playwright test --project=agent
```

Configuration is env-driven via `ADO_*` and `QA_*` variables (see `.env.example`). Full design notes, the connector interfaces, and the path from stubs to real backends are documented in [`src/agent/README.md`](src/agent/README.md).

## Docker Compose

Start the FastAPI server:

```bash
docker compose up --build api
```

Start the runtime service stack:

```bash
docker compose up --build api swagger prometheus grafana allure
```

Run all tests in Docker:

```bash
docker compose run --rm tests
```

Start only the local report server after an Allure report already exists:

```bash
docker compose up -d allure
```

## Service URLs

| Service | URL |
| --- | --- |
| FastAPI root | `http://localhost:8000/` |
| FastAPI health | `http://localhost:8000/health` |
| Automation overview | `http://localhost:8000/automation` |
| Playwright project metadata | `http://localhost:8000/automation/playwright-projects` |
| QA agent command metadata | `http://localhost:8000/automation/qa-agent` |
| FastAPI metrics | `http://localhost:8000/metrics` |
| FastAPI built-in Swagger | `http://localhost:8000/docs` |
| External Scalar API reference | `http://localhost:8080` |
| Prometheus | `http://localhost:9092` |
| Pushgateway (QA metrics) | `http://localhost:9091` |
| Grafana | `http://localhost:3001` |
| Grafana QA dashboard | `http://localhost:3001/d/organuz-qa-dashboard/organuz-qa-dashboard` |
| Allure report server | `http://localhost:5050` |

Grafana is mapped to host port `3001` because port `3000` is commonly used by local frontend dev servers. Inside Docker Compose, Grafana still listens on `grafana:3000`.

## Grafana QA Dashboard

The provisioned QA dashboard reads Prometheus metrics that the test runner **pushes** to the Prometheus Pushgateway. `scripts/push-qa-metrics.mjs` parses the latest Playwright JSON report at `test-results/results.json` and pushes:

| Metric | Query example |
| --- | --- |
| Test totals by project/status | `sum by(project, status)(qa_playwright_tests_total)` |
| Failed tests | `sum(qa_playwright_tests_total{status="failed"})` |
| Pass rate by project | `100 * sum by(project)(qa_playwright_tests_total{status="passed"}) / sum by(project)(qa_playwright_tests_total)` |
| Run duration by project | `qa_playwright_duration_seconds` |
| Report age | `time() - qa_playwright_last_run_timestamp_seconds` |
| Report loaded flag | `qa_playwright_report_present` |

`scripts/run-all-tests.sh` pushes these after each run (Prometheus then scrapes the Pushgateway with `honor_labels: true`). To refresh the numbers by hand after a run: `PUSHGATEWAY_URL=http://localhost:9091 node scripts/push-qa-metrics.mjs`. The FastAPI `/metrics` endpoint still provides the `process_*` / `up` metrics the system dashboard uses, but no longer reads the results file — which is what removed the old stale-bind-mount refresh hack.

Open it locally after the stack is running:

```bash
docker compose up -d --build api prometheus grafana
```

Then browse to `http://localhost:3001/d/organuz-qa-dashboard/organuz-qa-dashboard`.

### Hosting Grafana externally (clickable dashboard links)

GitHub Pages **cannot** host Grafana — Pages is static hosting, and Grafana is a live server that queries Prometheus as a backend. To get an interactive dashboard with browser-clickable links (in Slack alerts and the CI report summary), host Grafana somewhere with a backend and point the links at it. The repo is already wired for this — you only supply the host.

**Recommended: Grafana Cloud (free tier, fully managed).**

1. Create a free Grafana Cloud stack. From its Prometheus data source, note the **remote_write URL** and **instance ID** (username), and create a **MetricsPublisher** API token.
2. Save the token to the gitignored file `server/grafana-cloud-token` (one line, no trailing newline). It is mounted into the `prometheus` container and never committed.
3. In `server/prometheus.yml`, uncomment the `remote_write:` block and set the `url` + `username`. In `docker-compose.yml`, uncomment the `grafana-cloud-token` volume on the `prometheus` service. Restart: `docker compose up -d --force-recreate prometheus`. Your local Prometheus now ships all metrics (incl. `qa_playwright_*`) up to Grafana Cloud.
4. In Grafana Cloud, import the dashboards from `server/grafana/provisioning/dashboards/*.json` (keep the same UIDs, e.g. `organuz-system-tests`, so the dashboard URL path matches).
5. Point the links at it:
   - **Local:** set `GRAFANA_URL=https://<your-stack>.grafana.net` in your gitignored `.env`. `run-all-tests.sh` derives `GRAFANA_DASHBOARD_URL` from it, so the Slack "Local test run" message links to the hosted dashboard.
   - **CI:** set the `GRAFANA_URL` repository **variable** (Settings → Secrets and variables → Actions → Variables). The report-summary + Slack notification link to it automatically.

**Self-host instead (Fly.io, a small VM, etc.):** run this same `docker-compose.yml` stack on the host, expose Grafana over HTTPS, and set `GRAFANA_URL` to that origin — no `remote_write` needed since Prometheus and Grafana live together.

## Reports

Docker test runs write reports back to the host through bind mounts:

- `test-results/`
- `playwright-report/`
- `allure-results/`
- `allure-report/`
- `blob-report/`

Open the Playwright HTML report:

```bash
npm run report
```

Generate the Allure report in CI mode:

```bash
npm run report:allure:ci
```

The CLI runner also generates an Allure 3 report after Playwright finishes and starts the local Allure static server:

```bash
./scripts/run-all-tests.sh
```

At the end of the run it prints:

```text
FastAPI:  http://localhost:8000
Scalar:   http://localhost:8080
Grafana:  http://localhost:3001
Allure:   http://localhost:5050
```

The script preserves the Playwright exit code. Even when tests fail, it still attempts to generate and serve the Allure report before exiting.

The UI suite includes `tests/ui/diagnostics/intentionally-failing.spec.ts`, an expected-failure test tagged `@intentionally-failing`. It validates the failure-capture pipeline without making CI red. If you want to skip it locally:

```bash
npx playwright test --grep-invert "@intentionally-failing"
```

Failure artifacts are collected by `src/fixtures/index.ts` and attached to Allure when Playwright records screenshots, videos, traces, or other attachments.

## Configuration

Runtime configuration is read from environment variables with fallbacks in `config.json`.

| Variable | Purpose |
| --- | --- |
| `WEB_BASE_URL` | Base URL for UI tests |
| `QA_TARGET_ENV` | Product target environment (`dev` \| `test` \| `prod`, default `dev`), resolved from `config.json → environments` |
| `APP_BASE_URL` / `APP_ADMIN_URL` | Explicit overrides for the product app / admin URLs |
| `ORGANUZ_API_ANON_KEY` | Overrides the public Supabase anon key used by the `organuz-api` tests |
| `DEV_API_BASE_URL` / `DEV_API_TOKEN` | Base URL and public token for the `dev-api` RPC gateway tests (`organuz.flamiingo.com`) |
| `DEFAULT_TIMEOUT` | Playwright default timeout |
| `NAVIGATION_TIMEOUT` | Navigation timeout |
| `WORKERS` | Playwright worker count |
| `BROWSER` | Browser project selection |
| `INCLUDE_LOW_PRIORITY_TESTS` | Include broad marketing suites tagged `@low-priority` |
| `PRODUCT_E2E_ENABLED` | Enables live product browser flows when credentials are present |
| `QA_PLAYWRIGHT_RESULTS_PATH` | Path read by `scripts/push-qa-metrics.mjs` for the latest Playwright JSON report; defaults to `test-results/results.json` |
| `PUSHGATEWAY_URL` | Prometheus Pushgateway the QA metrics are pushed to; defaults to `http://localhost:9091` |

The Playwright projects are:

| Project | Test files | Target | Typical command |
| --- | --- | --- | --- |
| `chromium` | `tests/ui/**/*.spec.ts` filtered to `@other-smoke` | Marketing site `https://www.organuz.ai` (prod) | `npx playwright test --project=chromium` |
| `product` | Product specs that do not need shared role storage | Product calculator app, environment from `QA_TARGET_ENV` (default dev `https://dev1.app.organize.organuz.com`) | `npx playwright test --project=product` |
| `product-setup` | `tests/product/support/auth.setup.ts` | Logs each product role in once and saves its `storageState` | runs automatically as a `product-authenticated` dependency |
| `product-authenticated` | Per-role product specs that resume saved sessions | Authenticated customer / consultant / company role coverage | `npx playwright test --project=product-authenticated` |
| `organuz-api` | `tests/organuz-api/**/*.spec.ts` filtered to `@other-smoke` | Organuz Supabase/PostgREST backend (`/rest/v1/projects`, edge functions) | `npx playwright test --project=organuz-api` |
| `dev-api` | `tests/dev-api/**/*.spec.ts` filtered to `@other-smoke` | Dev product-app RPC gateway `organuz.flamiingo.com` (`get_arena_types`, `get_remaining_projects`, error envelopes) | `npx playwright test --project=dev-api` |

The `agent` project (`tests/agent/**/*.spec.ts`, filtered to `@other-smoke`) also exists for orchestrator regression coverage but is internal.

Real credentials and local overrides live only in a gitignored `.env` (Restricted). The dev and test product apps sit behind a shared password gate; dev login uses phone + a fixed OTP `7777`. `.env.example` documents every variable with placeholders — never commit `.env` or move secrets into tracked files.

The QA agent reads its own variables (`ADO_PLAN_ID`, `ADO_SUITE_ID`, `ADO_START_READONLY`, `QA_ENVIRONMENT`, `QA_RERUN_FLAKY`, `QA_FLAKY_TAG`, `QA_FILE_BUGS`, `QA_MAX_CASES`, `QA_EVIDENCE_PREFIX`, `QA_REQUIREMENTS_PATH`, `QA_REQUIREMENTS_SOURCE`). They are listed with defaults and purpose in [`src/agent/README.md`](src/agent/README.md) and seeded in `.env.example`. `agent:current-tests` also respects the normal Playwright target variables such as `WEB_BASE_URL`, `QA_TARGET_ENV`, and `APP_BASE_URL`.

Local service URL variables used by `scripts/run-all-tests.sh`:

| Variable | Default |
| --- | --- |
| `FASTAPI_URL` | `http://localhost:8000` |
| `SWAGGER_URL` | `http://localhost:8080` |
| `PROMETHEUS_URL` | `http://localhost:9092` |
| `GRAFANA_URL` | `http://localhost:3001` |
| `ALLURE_URL` | `http://localhost:5050` |
| `AUTO_START_API` | `true` |

## GitHub Actions

The parallel pipeline in `.github/workflows/parallel-tests.yml` runs:

- `typecheck`
- Playwright `chromium`, `organuz-api`, and `dev-api` projects in parallel (matrix), each filtered to its `@other-smoke` default checks
- A credential-free product smoke job (`npx playwright test --project=product --grep @smoke`) against prod
- The 50-test product E2E matrix is available locally via `npm run test:product`; the broader product suite is available via `npm run test:product:all`. Add either to CI separately if you want the pipeline to gate on those flows.
- FastAPI, Scalar API reference, Prometheus, and Grafana service smoke checks
- Allure 3 report generation
- GitHub Pages deployment for the Allure report on `main` or `master`
- GitHub Actions summary links for Allure, FastAPI, Scalar, and Grafana

The workflow summary includes:

| Link | Source |
| --- | --- |
| Allure 3 report | GitHub Pages deploy output, or the repository Pages URL fallback |
| FastAPI server | `FASTAPI_URL` repository variable, or `http://localhost:8000` fallback |
| Scalar API reference | `SWAGGER_URL` repository variable, or `http://localhost:8080` fallback |
| Grafana dashboard | `GRAFANA_URL` repository variable, or `http://localhost:3001` fallback |

Set these repository variables when the summary should point to externally reachable services:

- `FASTAPI_URL`
- `SWAGGER_URL`
- `GRAFANA_URL`

## CLI

```bash
./scripts/run-all-tests.sh
```

## Architecture

Open [Architecture.html](Architecture.html) in a browser for a pastel, single-file visual overview of the Docker Compose services, CLI flow, GitHub Actions pipeline, report publishing, the QA agent orchestrator, product matrix, QA dashboard, and project structure.

The test suite is organized by subject under `tests/`: UI homepage/content/flows/support/diagnostics, Organuz backend API contracts/resources/security/functions, dev product-app RPC contracts/security/support, product smoke/registration/matrix/role flows/API/support, and agent orchestrator coverage.

For the QA agent specifically — its architecture diagram, the orchestration loop, the design decisions it encodes, and how to swap stubs for real connectors — see [`src/agent/README.md`](src/agent/README.md).
