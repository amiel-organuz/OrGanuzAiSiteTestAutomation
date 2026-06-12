# OrGanuz AI Site Test Automation

Playwright TypeScript automation for `www.organuz.ai`, with a supporting Docker Compose stack for API documentation, observability, and containerized test execution.

## Stack

- Playwright for UI and API tests
- TypeScript for test and framework code
- FastAPI service for local API endpoints and health checks
- Swagger UI for OpenAPI documentation
- Prometheus for metrics scraping
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

Run all tests locally:

```bash
npm test
```

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

Start API, Swagger UI, and Prometheus:

```bash
docker compose up --build api swagger prometheus
```

Run all tests in Docker:

```bash
docker compose run --rm tests
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

## Architecture

Open [Architecture.html](Architecture.html) in a browser for a visual overview of the Docker Compose services and test flow.
