# OrGanuz AI Site Test Automation

Playwright TypeScript automation for `www.organuz.ai` and the Organuz product application, with a supporting Docker Compose stack for API documentation, observability, and containerized test execution.

## Stack

- Playwright for marketing UI, product E2E matrix, Organuz Supabase backend API, dev product-app RPC gateway, and agent-orchestrator regression tests
- TypeScript for test and framework code
- FastAPI service for local API endpoints and health checks
- Scalar API reference for external OpenAPI documentation
- Prometheus for metrics scraping
- Grafana for metrics dashboards, including the provisioned OrGanuz QA Dashboard
- Allure and Playwright HTML reports for test results
- A QA agent orchestrator (`src/agent/`) that coordinates Azure DevOps, Playwright, OneDrive, and Google Sheets, can enrich test cases from PDF/DOCX/XLSX requirements documents, and can run the repository's current Playwright projects through a real CLI-backed runner

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
|-- test-requirements-docs/   # sample requirements docs for the QA agent (generated)
|-- src/
|   |-- agent/                # QA agent orchestrator (see src/agent/README.md)
|   |   |-- connectors/       # Azure DevOps, Google Sheets, OneDrive, Playwright (+ stubs)
|   |   |-- utils/            # RequirementsReader (PDF/DOCX/XLSX parsing)
|   |   `-- demo/             # seed data, offline demo, sample-doc generator
|   |-- api/
|   |-- fixtures/
|   |-- pages/
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
    |   |-- flows/             # gated full-flow + per-role specs (roles, areas, session, sanity, logout)
    |   |-- api/               # gated product role backend API checks
    |   |-- smoke/             # credential-free public calculator shell checks
    |   `-- support/           # page helpers, ProductFlows, fixtures, product-setup auth (storageState)
    |-- ui/
    |   |-- content/           # blog, FAQ, agents, projects, static pages
    |   |-- diagnostics/       # expected-failure pipeline checks
    |   |-- flows/             # cross-section critical user journeys
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

`npm test` runs every project configured in `playwright.config.ts`: `chromium`, `product`, `organuz-api`, `dev-api`, and the internal `agent` orchestrator project. Product live browser flows stay gated unless `PRODUCT_E2E_ENABLED=true` and persona credentials are set.

Run the full local automation flow:

```bash
./scripts/run-all-tests.sh
```

This script typechecks the project, starts the local runtime stack when needed, runs the Playwright `chromium`, `organuz-api`, and `dev-api` projects, restarts the `api` container so Grafana picks up fresh results, generates an Allure 3 report, starts the Allure static server, opens the Grafana dashboard, and prints the main service URLs at the end. It intentionally does not run the `product` or `agent` projects by default; run those directly with `npm run test:product` and `npx playwright test --project=agent`, or through `npm run agent:current-tests`.

Run only UI tests:

```bash
npm run test:ui
```

Run the product E2E matrix:

```bash
npm run test:product
```

The product matrix is data-driven from `tests/product/matrix/e2e-matrix.data.ts`. It includes:

- 12 main `CALC-ROOF-*` characterization scenarios from the working document.
- 4 personas per main scenario: customer, consultant, company, and company employee.
- Property types: private house, residential building, commercial, agricultural, and public.
- Polygon behavior: building, parking, sports court, and mixed building + parking/sports-court flows.
- Roof/surface types: concrete, tiles, iscoverit, parking, and sports court.
- Negative coverage for fewer than 5 panels.
- UI-only tracking for the no-panel case, where the request should not be sent.

The `product` project also includes a credential-free smoke spec (`tests/product/smoke/product-app.smoke.spec.ts`) that runs unconditionally. It exercises the public calculator shell served before login — the Organuz title, arena entry points, register/login entry, the four-step characterization stepper, the address step, and the disabled "continue" state — so the project has real runnable coverage even without persona credentials.

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

Under the hood, the `product` project depends on a `product-setup` project (`tests/product/support/auth.setup.ts`) that logs each authenticated role — `customer`, `consultant`, `company` — in once and saves its `storageState` to `playwright/.auth/` (gitignored). The per-role specs (`roles`, `role-areas`, `role-session`, `role-sanity`, `role-backend`) then resume that saved session via `test.use({ authRole })` + `product.resumeSession()` instead of logging in again, so the whole suite performs at most one OTP send per role. Sign-out is verified separately in `role-logout.spec.ts` with its own login, so it can't invalidate the shared sessions. If a role's saved session is missing (setup skipped because the dev gateway rate-limited its OTP), that role's specs skip with a clear reason rather than failing. `company-employee` has no phone and cannot sign in.

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

`agent:current-tests` generates one orchestrator case per current Playwright project:

| Case | Command |
| --- | --- |
| `PW-ORGANUZ-API` | `npx playwright test --project=organuz-api` |
| `PW-CHROMIUM` | `npx playwright test --project=chromium` |
| `PW-PRODUCT` | `npx playwright test --project=product` |
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
| Grafana | `http://localhost:3001` |
| Grafana QA dashboard | `http://localhost:3001/d/organuz-qa-dashboard/organuz-qa-dashboard` |
| Allure report server | `http://localhost:5050` |

Grafana is mapped to host port `3001` because port `3000` is commonly used by local frontend dev servers. Inside Docker Compose, Grafana still listens on `grafana:3000`.

## Grafana QA Dashboard

The provisioned QA dashboard reads Prometheus metrics from the FastAPI `/metrics` endpoint. FastAPI parses the latest Playwright JSON report at `test-results/results.json` and exposes:

| Metric | Query example |
| --- | --- |
| Test totals by project/status | `sum by(project, status)(qa_playwright_tests_total)` |
| Failed tests | `sum(qa_playwright_tests_total{status="failed"})` |
| Pass rate by project | `100 * sum by(project)(qa_playwright_tests_total{status="passed"}) / sum by(project)(qa_playwright_tests_total)` |
| Run duration by project | `qa_playwright_duration_seconds` |
| Report age | `time() - qa_playwright_last_run_timestamp_seconds` |
| Report loaded flag | `qa_playwright_report_present` |

The API container reads `test-results/results.json` through a read-only Docker volume. Run any Playwright project before opening the dashboard if you want fresh numbers.

Open it locally after the stack is running:

```bash
docker compose up -d --build api prometheus grafana
```

Then browse to `http://localhost:3001/d/organuz-qa-dashboard/organuz-qa-dashboard`.

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
| `QA_PLAYWRIGHT_RESULTS_PATH` | Path read by FastAPI for the latest Playwright JSON report; defaults to `test-results/results.json` |

The Playwright projects are:

| Project | Test files | Target | Typical command |
| --- | --- | --- | --- |
| `chromium` | `tests/ui/**/*.spec.ts` | Marketing site `https://www.organuz.ai` (prod) | `npx playwright test --project=chromium` |
| `product` | `tests/product/**/*.spec.ts` | Product calculator app, environment from `QA_TARGET_ENV` (default dev `https://dev1.app.organize.organuz.com`) | `npx playwright test --project=product` |
| `product-setup` | `tests/product/support/auth.setup.ts` | Logs each product role in once and saves its `storageState`; the `product` project depends on it | runs automatically as a `product` dependency |
| `organuz-api` | `tests/organuz-api/**/*.spec.ts` | Organuz Supabase/PostgREST backend (`/rest/v1/projects`, edge functions) | `npx playwright test --project=organuz-api` |
| `dev-api` | `tests/dev-api/**/*.spec.ts` | Dev product-app RPC gateway `organuz.flamiingo.com` (`get_arena_types`, `get_remaining_projects`, error envelopes) | `npx playwright test --project=dev-api` |

The `agent` project (`tests/agent/**/*.spec.ts`) also exists for orchestrator regression coverage but is internal.

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
- Playwright `chromium`, `organuz-api`, and `dev-api` projects in parallel (matrix)
- A credential-free product smoke job (`npx playwright test --project=product --grep @smoke`) against prod
- The full product persona matrix and agent orchestrator regression tests are available locally as the `product` and `agent` projects; add them to CI separately if you want the pipeline to gate on those flows.
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

The test suite is organized by subject under `tests/`: UI homepage/content/flows/diagnostics, Organuz backend API contracts/resources/security/functions, dev product-app RPC contracts/security/support, product matrix/flows/api/smoke/support, and agent orchestrator coverage.

For the QA agent specifically — its architecture diagram, the orchestration loop, the design decisions it encodes, and how to swap stubs for real connectors — see [`src/agent/README.md`](src/agent/README.md).
