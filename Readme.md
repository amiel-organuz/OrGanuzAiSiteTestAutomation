# OrGanuz AI Site Test Automation

Playwright TypeScript automation for `www.organuz.ai`, with a supporting Docker Compose stack for API documentation, observability, and containerized test execution.

## Stack

- Playwright for UI, API, and agent-orchestrator regression tests
- TypeScript for test and framework code
- FastAPI service for local API endpoints and health checks
- In-memory JSONPlaceholder mock for deterministic API tests in CI
- Swagger UI for OpenAPI documentation
- Prometheus for metrics scraping
- Grafana for metrics dashboards
- Allure and Playwright HTML reports for test results
- A QA agent orchestrator (`src/agent/`) that coordinates Azure DevOps, Playwright, OneDrive, and Google Sheets, can enrich test cases from PDF/DOCX/XLSX requirements documents, and can run the repository's current Playwright projects through a real CLI-backed runner

## Project Structure

```text
.
|-- Dockerfile
|-- docker-compose.yml
|-- playwright.config.ts
|-- mocks/
|   |-- jsonplaceholder-db.json
|   `-- jsonplaceholder-mock.mjs
|-- scripts/
|   `-- run-all-tests.sh
|-- server/
|   |-- Dockerfile
|   |-- grafana/
|   |   `-- provisioning/
|   |-- prometheus.yml
|   |-- requirements.txt
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
    |-- agent/                # orchestrator specs (Playwright `agent` project)
    |-- api/
    `-- ui/
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

`npm test` runs every project configured in `playwright.config.ts`: `chromium`, `api`, and `agent`.

Run the full local automation flow:

```bash
./scripts/run-all-tests.sh
```

This script typechecks the project, starts the local runtime stack when needed, runs the Playwright `chromium` and `api` projects, generates an Allure 3 report, starts the Allure static server, and prints the main service URLs at the end. It intentionally does not run the `agent` project; run that directly with `npx playwright test --project=agent`.

Run only UI tests:

```bash
npm run test:ui
```

Run API tests against a local JSONPlaceholder-compatible mock:

```bash
MOCK_PORT=3001 node mocks/jsonplaceholder-mock.mjs
API_BASE_URL=http://127.0.0.1:3001 npx playwright test --project=api
```

The mock is in-memory and does not persist writes. It returns JSONPlaceholder-style fake write responses for `POST`, `PUT`, `PATCH`, and `DELETE`.

Run the agent regression tests:

```bash
npx playwright test --project=agent
```

Run type checking:

```bash
npm run typecheck
```

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
| `PW-API` | `npx playwright test --project=api` |
| `PW-CHROMIUM` | `npx playwright test --project=chromium` |
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
| External Swagger UI | `http://localhost:8080` |
| Prometheus | `http://localhost:9092` |
| Grafana | `http://localhost:3001` |
| Allure report server | `http://localhost:5050` |

Grafana is mapped to host port `3001` because port `3000` is commonly used by local frontend dev servers. Inside Docker Compose, Grafana still listens on `grafana:3000`.

In GitHub Actions, the API matrix job also uses port `3001` for the JSONPlaceholder mock. That does not conflict with Grafana because the mock and Grafana run in separate jobs.

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
Swagger:  http://localhost:8080
Grafana:  http://localhost:3001
Allure:   http://localhost:5050
```

The script preserves the Playwright exit code. Even when tests fail, it still attempts to generate and serve the Allure report before exiting.

The UI suite includes `tests/ui/intentionally-failing.spec.ts`, an expected-failure test tagged `@intentionally-failing`. It validates the failure-capture pipeline without making CI red. If you want to skip it locally:

```bash
npx playwright test --grep-invert "@intentionally-failing"
```

Failure artifacts are collected by `src/fixtures/index.ts` and attached to Allure when Playwright records screenshots, videos, traces, or other attachments.

## Configuration

Runtime configuration is read from environment variables with fallbacks in `config.json`.

| Variable | Purpose |
| --- | --- |
| `WEB_BASE_URL` | Base URL for UI tests |
| `API_BASE_URL` | Base URL for API tests |
| `API_TIMEOUT` | API request timeout |
| `DEFAULT_TIMEOUT` | Playwright default timeout |
| `NAVIGATION_TIMEOUT` | Navigation timeout |
| `WORKERS` | Playwright worker count |
| `BROWSER` | Browser project selection |

The default Playwright projects are:

| Project | Test files | Typical command |
| --- | --- | --- |
| `chromium` | `tests/ui/**/*.spec.ts` | `npx playwright test --project=chromium` |
| `api` | `tests/api/**/*.spec.ts` | `npx playwright test --project=api` |
| `agent` | `tests/agent/**/*.spec.ts` | `npx playwright test --project=agent` |

Inside Docker Compose, the `tests` service points `API_BASE_URL` to `http://api:8000`.

The QA agent reads its own variables (`ADO_PLAN_ID`, `ADO_SUITE_ID`, `ADO_START_READONLY`, `QA_ENVIRONMENT`, `QA_RERUN_FLAKY`, `QA_FLAKY_TAG`, `QA_FILE_BUGS`, `QA_MAX_CASES`, `QA_EVIDENCE_PREFIX`, `QA_REQUIREMENTS_PATH`, `QA_REQUIREMENTS_SOURCE`). They are listed with defaults and purpose in [`src/agent/README.md`](src/agent/README.md) and seeded in `.env.example`. `agent:current-tests` also respects the normal Playwright target variables such as `WEB_BASE_URL` and `API_BASE_URL`.

Local service URL variables used by `scripts/run-all-tests.sh`:

| Variable | Default |
| --- | --- |
| `FASTAPI_URL` | `http://localhost:8000` |
| `SWAGGER_URL` | `http://localhost:8080` |
| `PROMETHEUS_URL` | `http://localhost:9092` |
| `GRAFANA_URL` | `http://localhost:3001` |
| `ALLURE_URL` | `http://localhost:5050` |
| `AUTO_START_API` | `true` |
| `MOCK_HOST` | `127.0.0.1` |
| `MOCK_PORT` | `3001` |
| `MOCK_DB_PATH` | `mocks/jsonplaceholder-db.json` |

## GitHub Actions

The parallel pipeline in `.github/workflows/parallel-tests.yml` runs:

- `typecheck`
- Playwright `api` and `chromium` projects in parallel
- Agent orchestrator regression tests are available locally as the `agent` project; add them to CI separately if you want the pipeline to gate on orchestrator behavior.
- JSONPlaceholder mock startup for the `api` matrix job
- FastAPI, Swagger, Prometheus, and Grafana service smoke checks
- Allure 3 report generation
- GitHub Pages deployment for the Allure report on `main` or `master`
- GitHub Actions summary links for Allure, FastAPI, Swagger, and Grafana

The `api` matrix job starts `mocks/jsonplaceholder-mock.mjs`, waits for `http://127.0.0.1:3001/posts/1`, then runs with `API_BASE_URL=http://127.0.0.1:3001`. The mock log is uploaded as `jsonplaceholder-mock-log`.

The workflow summary includes:

| Link | Source |
| --- | --- |
| Allure 3 report | GitHub Pages deploy output, or the repository Pages URL fallback |
| FastAPI server | `FASTAPI_URL` repository variable, or `http://localhost:8000` fallback |
| Swagger server | `SWAGGER_URL` repository variable, or `http://localhost:8080` fallback |
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

Open [Architecture.html](Architecture.html) in a browser for a pastel, single-file visual overview of the Docker Compose services, CLI flow, GitHub Actions pipeline, report publishing, the QA agent orchestrator, and project structure.

For the QA agent specifically — its architecture diagram, the orchestration loop, the design decisions it encodes, and how to swap stubs for real connectors — see [`src/agent/README.md`](src/agent/README.md).
