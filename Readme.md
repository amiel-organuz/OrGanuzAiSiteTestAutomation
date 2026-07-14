# OrGanuz AI Site Test Automation

## What this is

This repository holds the automated tests for two websites — the OrGanuz marketing site (`www.organuz.ai`) and the OrGanuz product application (the solar calculator) — plus a small set of local servers that turn the test results into a live QA dashboard.

The tests are written with [Playwright](https://playwright.dev/) (a browser-automation tool) in TypeScript. The supporting servers run in Docker and give you API documentation, metrics, and dashboards on your own machine.

**New here? Jump to [Local Setup](#local-setup).** It has everything you need to install and run the tests.

## Stack

Each part of the system and what it does:

- **Playwright** — runs the actual tests. The active default suite is the Organuz backend API contract check and the QA-agent regression tests; the marketing UI checks and the product smoke/registration/matrix/role flows are **currently disabled** in `playwright.config.ts` (their spec files under `tests/ui/**` and `tests/product/**` are kept — re-enable by uncommenting the project blocks).
- **TypeScript** — the language the tests and framework code are written in.
- **FastAPI** — a small local web service that exposes health checks and metadata endpoints.
- **Scalar** — a nice API-reference page for the external OpenAPI docs.
- **Prometheus** — collects metrics.
- **Grafana** — displays those metrics as dashboards, including the ready-made *OrGanuz QA Dashboard*.
- **Allure and Playwright HTML reports** — human-readable test reports.
- **QA agent orchestrator** (`src/agent/`) — an automation program that ties together Azure DevOps, Playwright, OneDrive, and Google Sheets. It can also read requirements documents (PDF/DOCX/XLSX) to enrich test cases, and run the repo's Playwright projects through a real command-line runner. It includes a `TestPlanAgent` that generates a test plan from a URL by driving the Playwright MCP server.

## Project Structure

```text
.
|-- Dockerfile
|-- docker-compose.yml
|-- playwright.config.ts
|-- scripts/
|   |-- run-all-tests.sh        # typecheck -> start stack -> run suite -> push QA metrics -> Slack links
|   |-- push-qa-metrics.mjs      # push qa_playwright_* metrics from results.json to the Pushgateway
|   `-- slack-alert-test.sh      # local smoke test that posts a marked TEST message to each webhook
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

You need **Node.js 22**. (The CI workflows pin `node-version: 22`; Node 20 is no longer supported for this repo.)

Install dependencies:

```bash
npm ci
```

Run all tests with the default settings:

```bash
npm test
```

### What `npm test` runs

`npm test` runs the Playwright projects that are currently **active** in `playwright.config.ts`: `organuz-api` and the internal `agent` orchestrator project.

The default suite is **3 tests**, all green:

- `organuz-api` runs one `@other-smoke` API contract.
- `agent` runs two `@other-smoke` tests (the orchestrator regression and the URL-driven test-plan generator).

The marketing-site (`chromium`) and product-app (`product`, `product-setup`, `product-authenticated`) projects are **currently disabled** — commented out in `playwright.config.ts`. Their spec files under `tests/ui/**` and `tests/product/**` are kept; re-enable a project by uncommenting its block (also re-add `devices` to the config's import). When enabled the former counts are: `chromium` 12, `product` 31, `product-setup` 3, `product-authenticated` 10 (13 of those product-* tests are credential-gated per-role specs that *skip* without persona secrets).

The opt-in `monitoring` project is never part of this default green gate. Enabling it (`MONITORING_ENABLED=true`, see [External API monitoring](#external-api-monitoring-govmap--ofek)) adds 50 more tests, for **53 total**.

A couple more defaults worth knowing:

- Product live browser flows stay gated (they don't run) unless `PRODUCT_E2E_ENABLED=true` **and** persona credentials are set — and moot while the product projects are disabled.

### Run the full local automation flow

```bash
./scripts/run-all-tests.sh
```

This one script does everything end to end. In order, it:

1. Typechecks the project.
2. Starts the local server stack when needed.
3. Runs the active Playwright projects in a single invocation — currently `organuz-api` and `agent` (the `chromium` and `product` projects run too once they are re-enabled in `playwright.config.ts`). Results go into a freshly cleaned `allure-results/`, so the report aggregates all of them.
4. Generates an Allure 3 report.
5. Brings up all local servers (FastAPI, Scalar, Prometheus, Pushgateway, Grafana, Allure).
6. Pushes the run's QA metrics to the Pushgateway, so Grafana shows fresh numbers.
7. Opens the Grafana dashboard.
8. Posts the Allure + Grafana links to every configured Slack webhook (`SLACK_WEBHOOK_URL` / `SLACK_WEBHOOK_BOT_URL`). Each message is labeled by its source — *Local* vs *GitHub Actions*.
9. Prints the main service URLs at the end.

The credential-gated role flows (`product-setup` → `product-authenticated`) stay out of this run. Run them directly instead:

```bash
npx playwright test --project=product-authenticated
```

To smoke-test the Slack webhooks without doing a full run, use `./scripts/slack-alert-test.sh`. It posts a clearly-marked TEST message to each webhook and never prints the URLs.

### Run only UI tests

```bash
npm run test:ui
```

> The `chromium` project is **currently disabled** in `playwright.config.ts`, so this command runs nothing until you re-enable it (uncomment the `chromium` block). The `tests/ui/**` specs are kept.

### Run the product E2E matrix (50 tests when enabled)

```bash
npm run test:product
```

> The `product` project is **currently disabled** in `playwright.config.ts` (specs under `tests/product/**` are kept). Re-enable the `product` / `product-setup` / `product-authenticated` blocks to run the flows below.

The product suite is split into two Playwright projects: the plain `product` project and the role-session `product-authenticated` project.

The matrix is **data-driven** — it's generated from `tests/product/matrix/e2e-matrix.data.ts` rather than being hand-written test by test. It covers:

- 12 main `CALC-ROOF-*` characterization scenarios from the working document.
- 4 personas per main scenario: customer, consultant, company, and company employee.
- Property types: private house, residential building, commercial, agricultural, and public.
- Polygon behavior: building, parking, sports court, and mixed building + parking/sports-court flows.
- Roof/surface types: concrete, tiles, iscoverit, parking, and sports court.
- Negative coverage for fewer than 5 panels.
- UI-only tracking for the no-panel case, where the request should *not* be sent.

`npm run test:product` is scoped to exactly the 50 live E2E matrix tests in `Product calculator and quotation E2E matrix`: 48 main scenario/persona combinations, one insufficient-panels negative case, and one company-employee access-blocking case.

To run the broader product suite instead:

```bash
npm run test:product:all
```

### External API monitoring (Govmap + Ofek)

The product depends on two outside map services. This group checks that they're up and behaving:

- **Govmap** (`www.govmap.gov.il`) — the map API and address geocoding.
- **Ofek** (`basemaps.govmap.gov.il`) — the Survey-of-Israel national orthophoto (aerial) tiles the roof scan runs on.

There are 25 checks each (50 total). They use `APIRequestContext` only — no browser.

```bash
npm run test:monitoring
```

Two things make this group different from the rest:

- **It's opt-in locally.** The project is registered only when `MONITORING_ENABLED=true`, so it never runs in the default suite.
- **It's *meant* to fail when a dependency is down.** A failure here is the alert, not a bug in our code. The one exception: when the Govmap edge serves this runner an HTML block/challenge page (an HTTP 200 geo/bot block, common from CI IPs outside Israel) the checks **skip** rather than fail — that's an environmental block, not a real outage. A real-but-wrong payload still fails as the alert. The detection lives in `tests/monitoring/support/availability.ts` (a `beforeEach` canary).

On GitHub Actions it runs two ways:

1. A **scheduled workflow** (`.github/workflows/monitoring.yml`) every 30 minutes, with GitHub-issue + Slack alerting.
2. A **non-blocking `monitoring` job** inside the main `parallel-tests.yml` pipeline, on every push/PR. It's marked `continue-on-error: true`, so a Govmap/Ofek outage shows the job as red and folds into the Allure report but **never fails the code pipeline / green PR gate**.

When it fails, the scheduled workflow:

- Opens a single auto-managed `monitoring-alert` GitHub issue (and auto-closes it on the next green run).
- Posts a Slack alert to every configured webhook — `SLACK_WEBHOOK_URL` and/or `SLACK_WEBHOOK_BOT_URL` (repository secrets in CI, gitignored `.env` locally).

The `force_fail` `workflow_dispatch` input lets you exercise the alert path on demand. Endpoints, tokens, and tile coordinates live in `config.json → monitoring`.

### More about the `product` project

Beyond the matrix, the `product` project also carries credential-free smoke specs and registration coverage, so it has real runnable coverage even without persona credentials:

- **Smoke checks** exercise the public calculator shell served before login — the Organuz title, arena entry points, register/login entry, the four-step characterization stepper, the address step, and the disabled "continue" state.
- **Registration specs** cover property-owner form validation, required terms consent, invalid-mobile gating, optional-consent behavior, full property-owner signup, and company/consultant lead-form redirects.

### Run the live persona browser flows

These are opt-in until live-app credentials and stable selectors are available:

```bash
PRODUCT_E2E_ENABLED=true \
CUSTOMER_PHONE=... CUSTOMER_OTP_CODE=... \
CONSULTANT_PHONE=... CONSULTANT_OTP_CODE=... \
COMPANY_PHONE=... COMPANY_OTP_CODE=... \
COMPANY_EMPLOYEE_PHONE=... COMPANY_EMPLOYEE_OTP_CODE=... \
npm run test:product
```

Email/password variables are still supported as a fallback, but the live app currently uses a phone/OTP login path.

**How the sessions are shared:** only the `product-authenticated` project depends on `product-setup` (`tests/product/support/auth.setup.ts`). Setup logs each authenticated role — `customer`, `consultant`, `company` — in once and saves its `storageState` (the saved browser session) to `playwright/.auth/` (gitignored). The per-role specs (`roles`, `role-areas`, `role-session`, `role-sanity`, `role-backend`) then resume that saved session via `test.use({ authRole })` + `product.resumeSession()` instead of logging in again — so those specs send at most one OTP per role. Registration, smoke, matrix, full-flow, and sign-out stay in the plain `product` project so they don't trigger the shared auth setup unnecessarily. The `company-employee` role has no phone and cannot sign in.

By default, broad lower-priority marketing suites tagged `@low-priority` are excluded. Set `INCLUDE_LOW_PRIORITY_TESTS=true` to include them.

### Run the Organuz backend API tests

```bash
npx playwright test --project=organuz-api
```

The `organuz-api` project targets the Organuz Supabase/PostgREST backend (`config.json → organuzApi`). It exercises the `/rest/v1/projects` REST resource — its contracts, query behaviours, and anon-key auth/RLS (row-level security) — plus the edge-function CORS preflights. It uses the public `anon` key that's already baked into the site bundle. These tests are read-only; they never POST to the edge functions.

### Run the agent regression tests

```bash
npx playwright test --project=agent
```

### Type checking and linting

```bash
npm run typecheck
```

```bash
npm run lint
```

Linting uses ESLint's flat config (`eslint.config.mjs`) with the `typescript-eslint` recommended ruleset over `src/` and `tests/`.

## QA Agent

The repository includes a QA agent orchestrator under `src/agent/`. It coordinates four systems:

- **Azure DevOps** — the system of record.
- **Playwright** — execution.
- **OneDrive** — the evidence store.
- **Google Sheets** — test data and the results log.

It runs the suite end-to-end: read cases, optionally enrich acceptance criteria from requirements docs, pull data, execute, push evidence, write results back, file bugs idempotently (without creating duplicates), re-run flaky failures once, and emit a summary.

Run the offline demo (everything wired to in-memory stubs, no credentials needed):

```bash
npm run agent:demo
```

Run the repository's real Playwright projects through the agent (Azure DevOps / Sheets / OneDrive are stubbed; Playwright is real):

```bash
npm run agent:current-tests
```

Generate a test plan from a URL. The `TestPlanAgent` explores a page and produces a `TestSuite` (page-load, headings, per-link, and form cases) in the same shape the orchestrator consumes. It's offline by default; `--live` drives the real **Playwright MCP CLI server** (`npx @playwright/mcp`) to explore a live browser:

```bash
npm run agent:plan -- https://www.organuz.ai          # offline stub
npm run agent:plan -- https://www.organuz.ai --live   # real browser via Playwright MCP
```

Written test plans for every test group live in [`docs/test-plans/`](docs/test-plans/) (one per group, plus an index). Render them to PDF (`docs/test-plans/pdf/`) with:

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

`scripts/run-all-tests.sh` pushes these after each run (Prometheus then scrapes the Pushgateway with `honor_labels: true`). To refresh the numbers by hand after a run:

```bash
PUSHGATEWAY_URL=http://localhost:9091 node scripts/push-qa-metrics.mjs
```

The FastAPI `/metrics` endpoint still provides the `process_*` / `up` metrics the system dashboard uses, but it no longer reads the results file — which is what removed the old stale-bind-mount refresh hack.

Open the dashboard locally after the stack is running:

```bash
docker compose up -d --build api prometheus grafana
```

Then browse to `http://localhost:3001/d/organuz-qa-dashboard/organuz-qa-dashboard`.

### Hosting Grafana externally (clickable dashboard links)

GitHub Pages **cannot** host Grafana. Pages is static hosting, and Grafana is a live server that queries Prometheus as its backend. To get an interactive dashboard with browser-clickable links (in Slack alerts and the CI report summary), host Grafana somewhere that has a backend, and point the links at it. The repo is already wired for this — you only supply the host.

**Recommended: Grafana Cloud (free tier, fully managed).**

1. Create a free Grafana Cloud stack. From its Prometheus data source, note the **remote_write URL** and **instance ID** (username), and create a **MetricsPublisher** API token.
2. Save the token to the gitignored file `server/grafana-cloud-token` (one line, no trailing newline). It's mounted into the `prometheus` container and never committed.
3. In `server/prometheus.yml`, uncomment the `remote_write:` block and set the `url` + `username`. In `docker-compose.yml`, uncomment the `grafana-cloud-token` volume on the `prometheus` service. Restart: `docker compose up -d --force-recreate prometheus`. Your local Prometheus now ships all metrics (including `qa_playwright_*`) up to Grafana Cloud.
4. In Grafana Cloud, import the dashboards from `server/grafana/provisioning/dashboards/*.json` (keep the same UIDs, e.g. `organuz-system-tests`, so the dashboard URL path matches).
5. Point the links at it:
   - **Local:** set `GRAFANA_URL=https://<your-stack>.grafana.net` in your gitignored `.env`. `run-all-tests.sh` derives `GRAFANA_DASHBOARD_URL` from it, so the Slack "Local test run" message links to the hosted dashboard.
   - **CI:** set the `GRAFANA_URL` repository **variable** (Settings → Secrets and variables → Actions → Variables). The report summary + Slack notification link to it automatically.

**Self-host instead (Fly.io, a small VM, etc.):** run this same `docker-compose.yml` stack on the host, expose Grafana over HTTPS, and set `GRAFANA_URL` to that origin. No `remote_write` needed, since Prometheus and Grafana live together.

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

The CLI runner also generates an Allure 3 report after Playwright finishes, and starts the local Allure static server:

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

The script preserves the Playwright exit code. Even when tests fail, it still tries to generate and serve the Allure report before exiting.

The UI suite includes `tests/ui/diagnostics/intentionally-failing.spec.ts`, an expected-failure test tagged `@intentionally-failing`. It validates the failure-capture pipeline without turning CI red. To skip it locally:

```bash
npx playwright test --grep-invert "@intentionally-failing"
```

Failure artifacts are collected by `src/fixtures/index.ts` and attached to Allure whenever Playwright records screenshots, videos, traces, or other attachments.

## Configuration

Runtime configuration is read from environment variables, with fallbacks in `config.json`.

| Variable | Purpose |
| --- | --- |
| `WEB_BASE_URL` | Base URL for UI tests |
| `QA_TARGET_ENV` | Product target environment (`dev` \| `test` \| `prod`, default `dev`), resolved from `config.json → environments` |
| `APP_BASE_URL` / `APP_ADMIN_URL` | Explicit overrides for the product app / admin URLs |
| `ORGANUZ_API_ANON_KEY` | Overrides the public Supabase anon key used by the `organuz-api` tests |
| `DEFAULT_TIMEOUT` | Playwright default timeout |
| `NAVIGATION_TIMEOUT` | Navigation timeout |
| `WORKERS` | Playwright worker count |
| `BROWSER` | Browser project selection |
| `INCLUDE_LOW_PRIORITY_TESTS` | Include broad marketing suites tagged `@low-priority` |
| `PRODUCT_E2E_ENABLED` | Enables live product browser flows when credentials are present |
| `QA_PLAYWRIGHT_RESULTS_PATH` | Path read by `scripts/push-qa-metrics.mjs` for the latest Playwright JSON report; defaults to `test-results/results.json` |
| `PUSHGATEWAY_URL` | Prometheus Pushgateway the QA metrics are pushed to; defaults to `http://localhost:9091` |

The Playwright projects are (only `organuz-api` and `agent` are active by default today; the four `chromium` / `product*` projects are commented out in `playwright.config.ts` with their specs retained):

| Project | Status | Test files | Target | Typical command |
| --- | --- | --- | --- | --- |
| `chromium` | disabled (commented out; specs kept) | `tests/ui/**/*.spec.ts` filtered to `@other-smoke` | Marketing site `https://www.organuz.ai` (prod) | `npx playwright test --project=chromium` |
| `product` | disabled (commented out; specs kept) | Product specs that do not need shared role storage | Product calculator app, environment from `QA_TARGET_ENV` (default dev `https://dev1.app.organize.organuz.com`) | `npx playwright test --project=product` |
| `product-setup` | disabled (commented out; specs kept) | `tests/product/support/auth.setup.ts` | Logs each product role in once and saves its `storageState` | runs automatically as a `product-authenticated` dependency |
| `product-authenticated` | disabled (commented out; specs kept) | Per-role product specs that resume saved sessions | Authenticated customer / consultant / company role coverage | `npx playwright test --project=product-authenticated` |
| `organuz-api` | active | `tests/organuz-api/**/*.spec.ts` filtered to `@other-smoke` | Organuz Supabase/PostgREST backend (`/rest/v1/projects`, edge functions) | `npx playwright test --project=organuz-api` |

The `agent` project (`tests/agent/**/*.spec.ts`, filtered to `@other-smoke`) is also active for orchestrator regression coverage, but it's internal. Re-enable a disabled project by uncommenting its block in `playwright.config.ts` (and re-add `devices` to the config's import).

Real credentials and local overrides live only in a gitignored `.env` (Restricted). The dev and test product apps sit behind a shared password gate; dev login uses a phone number plus a fixed OTP, `7777`. `.env.example` documents every variable with placeholders. **Never commit `.env` or move secrets into tracked files.**

The QA agent reads its own variables (`ADO_PLAN_ID`, `ADO_SUITE_ID`, `ADO_START_READONLY`, `QA_ENVIRONMENT`, `QA_RERUN_FLAKY`, `QA_FLAKY_TAG`, `QA_FILE_BUGS`, `QA_MAX_CASES`, `QA_EVIDENCE_PREFIX`, `QA_REQUIREMENTS_PATH`, `QA_REQUIREMENTS_SOURCE`). They're listed with defaults and purpose in [`src/agent/README.md`](src/agent/README.md) and seeded in `.env.example`. `agent:current-tests` also respects the normal Playwright target variables such as `WEB_BASE_URL`, `QA_TARGET_ENV`, and `APP_BASE_URL`.

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
- The Playwright `chromium` and `organuz-api` projects in parallel (a matrix), each filtered to its `@other-smoke` default checks.
- A credential-free product smoke job (`npx playwright test --project=product --grep @smoke`) against prod.
- The FastAPI, Scalar API reference, Prometheus, and Grafana service smoke checks.
- Allure 3 report generation.
- GitHub Pages deployment for the Allure report on `main` or `master`.
- GitHub Actions summary links for Allure, FastAPI, Scalar, and Grafana.

> **Parity note:** the workflow's `strategy.matrix.project` has been trimmed to `organuz-api, agent` so it matches the currently active projects — the `chromium`, `product`, and `product-authenticated` shards are commented out there (and the credential-free product smoke job produces no tests while `product` is disabled). Keeping the local config and the workflow in sync is the job of the **`test-suite-parity`** skill — re-enable the projects in **both** `playwright.config.ts` and the workflow matrix together.

The 50-test product E2E matrix is available locally via `npm run test:product` (once the `product` project is re-enabled), and the broader product suite via `npm run test:product:all`. Add either to CI separately if you want the pipeline to gate on those flows.

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

Open [Architecture.html](Architecture.html) in a browser for a pastel, single-file visual overview of the Docker Compose services, the CLI flow, the GitHub Actions pipeline, report publishing, the QA agent orchestrator, the product matrix, the QA dashboard, and the project structure.

The test suite is organized by subject under `tests/`: UI homepage/content/flows/support/diagnostics, Organuz backend API contracts/resources/security/functions, product smoke/registration/matrix/role flows/API/support, and agent orchestrator coverage.

For the QA agent specifically — its architecture diagram, the orchestration loop, the design decisions it encodes, and how to swap stubs for real connectors — see [`src/agent/README.md`](src/agent/README.md).
