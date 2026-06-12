# OrGanuz AI Site Test Automation

Playwright TypeScript automation for `www.organuz.ai`, with a supporting Docker Compose stack for API documentation, observability, and containerized test execution.

## Stack

- Playwright for UI and API tests
- TypeScript for test and framework code
- FastAPI service for local API endpoints and health checks
- Swagger UI for OpenAPI documentation
- Prometheus for metrics scraping
- Grafana for metrics dashboards
- Allure and Playwright HTML reports for test results

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
|   `-- app/
|       `-- main.py
|-- src/
|   |-- api/
|   |-- fixtures/
|   |-- pages/
|   `-- utils/
`-- tests/
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

Run the full local automation flow:

```bash
./scripts/run-all-tests.sh
```

This script typechecks the project, starts the local runtime stack when needed, runs the Playwright `chromium` and `api` projects, generates an Allure 3 report, starts the Allure static server, and prints the main service URLs at the end.

Run only UI tests:

```bash
npm run test:ui
```

Run type checking:

```bash
npm run typecheck
```

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
| FastAPI metrics | `http://localhost:8000/metrics` |
| FastAPI built-in Swagger | `http://localhost:8000/docs` |
| External Swagger UI | `http://localhost:8080` |
| Prometheus | `http://localhost:9092` |
| Grafana | `http://localhost:3001` |
| Allure report server | `http://localhost:5050` |

Grafana is mapped to host port `3001` because port `3000` is commonly used by local frontend dev servers. Inside Docker Compose, Grafana still listens on `grafana:3000`.

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

Inside Docker Compose, the `tests` service points `API_BASE_URL` to `http://api:8000`.

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
- Playwright `api` and `chromium` projects in parallel
- FastAPI, Swagger, Prometheus, and Grafana service smoke checks
- Allure 3 report generation
- GitHub Pages deployment for the Allure report on `main` or `master`
- GitHub Actions summary links for Allure, FastAPI, Swagger, and Grafana

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

Open [Architecture.html](Architecture.html) in a browser for a pastel, single-file visual overview of the Docker Compose services, CLI flow, GitHub Actions pipeline, report publishing, and project structure.
