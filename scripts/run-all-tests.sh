#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Running TypeScript typecheck..."
npx tsc --noEmit

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
AUTO_START_API="${AUTO_START_API:-true}"
FASTAPI_URL="${FASTAPI_URL:-http://localhost:8000}"
SWAGGER_URL="${SWAGGER_URL:-http://localhost:8080}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9092}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
GRAFANA_DASHBOARD_URL="${GRAFANA_DASHBOARD_URL:-${GRAFANA_URL}/d/organuz-system-tests/organuz-system-and-test-monitor}"
ALLURE_URL="${ALLURE_URL:-http://localhost:5050}"

api_ready() {
  curl -fsS "${API_BASE_URL}/health" >/dev/null 2>&1
}

stack_ready() {
  api_ready \
    && curl -fsS "${SWAGGER_URL}" >/dev/null 2>&1 \
    && curl -fsS "${PROMETHEUS_URL}/-/ready" >/dev/null 2>&1 \
    && curl -fsS "${GRAFANA_URL}/api/health" >/dev/null 2>&1
}

if [ "$AUTO_START_API" = "true" ] && [ "$API_BASE_URL" = "http://localhost:8000" ] && ! stack_ready; then
  echo "Starting local FastAPI, Scalar, Prometheus, and Grafana servers with Docker Compose..."
  docker compose up -d --build api swagger prometheus grafana
fi

echo "Waiting for FastAPI server at ${API_BASE_URL}/health..."
for i in $(seq 1 30); do
  if api_ready; then
    echo "FastAPI server is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "FastAPI server did not become ready in time." >&2
    echo "Start it manually with: docker compose up -d --build api" >&2
    exit 1
  fi
  sleep 1
done

echo "Running all Playwright tests..."
set +e
npx playwright test --project=chromium --project=organuz-api --project=dev-api
TEST_EXIT_CODE=$?
set -e

if [ -d allure-results ] && [ "$(find allure-results -mindepth 1 -print -quit)" ]; then
  echo "Generating Allure 3 report..."
  mkdir -p allure-report
  find allure-report -mindepth 1 -delete
  npx -y -p allure@3 allure generate allure-results --output allure-report
fi

if [ "$AUTO_START_API" = "true" ] && [ "$API_BASE_URL" = "http://localhost:8000" ]; then
  echo "Starting local Allure report server..."
  docker compose up -d --force-recreate allure || echo "Allure report server could not start on ${ALLURE_URL}."

  # Refresh the API container so it re-reads the freshly written test-results/results.json.
  # Playwright wipes and recreates test-results/ each run, which changes the host directory's
  # inode; on macOS Docker Desktop the long-running api container stays bound to the old (now
  # empty) inode and would otherwise report qa_playwright_report_present=0 with no test metrics.
  echo "Refreshing FastAPI container so QA metrics reload..."
  docker compose restart api >/dev/null 2>&1 || echo "Could not restart api container; Grafana test panels may show stale data."
  for i in $(seq 1 30); do
    api_ready && break
    [ "$i" -eq 30 ] && echo "FastAPI did not come back after refresh." >&2
    sleep 1
  done
fi

echo
echo "Local servers:"
echo "  FastAPI:     ${FASTAPI_URL}"
echo "  Scalar:      ${SWAGGER_URL}"
echo "  Prometheus:  ${PROMETHEUS_URL}"
echo "  Grafana:     ${GRAFANA_URL}"
echo "  Allure:      ${ALLURE_URL}"
echo

OPEN_BROWSER="${OPEN_BROWSER:-auto}"
if [ "$OPEN_BROWSER" = "auto" ]; then
  if [ -n "${CI:-}" ] || [ -f /.dockerenv ]; then
    OPEN_BROWSER="false"
  else
    OPEN_BROWSER="true"
  fi
fi

if [ "$OPEN_BROWSER" = "true" ]; then
  if command -v open >/dev/null 2>&1; then
    OPENER="open"
  elif command -v xdg-open >/dev/null 2>&1; then
    OPENER="xdg-open"
  else
    OPENER=""
  fi

  if [ -n "$OPENER" ]; then
    echo "Opening servers in browser..."
    for url in "${FASTAPI_URL}/docs" "${SWAGGER_URL}" "${PROMETHEUS_URL}" "${GRAFANA_DASHBOARD_URL}" "${ALLURE_URL}"; do
      "$OPENER" "$url" >/dev/null 2>&1 || true
    done
  else
    echo "No browser opener found (set OPEN_BROWSER=false to silence)."
  fi
fi

echo "Test run complete."
exit "$TEST_EXIT_CODE"
