#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Running TypeScript typecheck..."
npx tsc --noEmit

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
AUTO_START_API="${AUTO_START_API:-true}"

api_ready() {
  curl -fsS "${API_BASE_URL}/health" >/dev/null 2>&1
}

if [ "$AUTO_START_API" = "true" ] && [ "$API_BASE_URL" = "http://localhost:8000" ] && ! api_ready; then
  echo "Starting local FastAPI server with Docker Compose..."
  docker compose up -d --build api
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
npx playwright test --project=chromium --project=api

if [ -d allure-results ] && [ "$(find allure-results -mindepth 1 -print -quit)" ]; then
  echo "Generating Allure 3 report..."
  rm -rf allure-report
  npx -y -p allure@3 allure generate allure-results --output allure-report
fi

echo "Test run complete."
