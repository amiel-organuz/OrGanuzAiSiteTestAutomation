---
name: organuz-monitoring
description: Build or debug the Grafana/Prometheus monitoring stack for the Organuz QA suite — dashboards from Playwright metrics, plus the CPU/memory/network process metrics. Use when editing server/grafana, server/prometheus.yml, or diagnosing empty/stale dashboards.
---

# Organuz QA monitoring (Grafana + Prometheus)

The local Docker stack (compose project `organuzaisitetestautomation`) turns Playwright results into a QA dashboard. Services: FastAPI `api` (8000, `/metrics`), Prometheus (host 9092→9090), Grafana (host 3001, admin/admin, anon Viewer), Scalar (8080), Allure (5050). Start via `./scripts/run-all-tests.sh`.

## Metrics available
Prometheus (`server/prometheus.yml`) scrapes only **two** targets: `prometheus` and `fastapi` (`api:8000`). No cAdvisor/node-exporter/pushgateway in this stack, so CPU/mem/network are **process-level only**: `process_cpu_seconds_total` (rate → cores), `process_resident_memory_bytes`, `process_virtual_memory_bytes`, `process_network_receive/transmit_bytes_total`, labelled by `job` (`fastapi`, `prometheus`). For true container/host metrics you'd add cAdvisor + node-exporter + scrape jobs.

QA test metrics come from the FastAPI app (`server/app/main.py`), which reads `test-results/results.json`: `qa_playwright_tests_total{project,status}`, `qa_playwright_duration_seconds{project}`, `qa_playwright_last_run_timestamp_seconds`, `qa_playwright_report_present`.

## Dashboards
File-provisioned from `server/grafana/provisioning/dashboards/` (provider polls every 30s; folder "OrGanuz QA"). Datasource uid `Prometheus`. Existing: `qa-dashboard.json` and `system-and-tests-dashboard.json` (uid `organuz-system-tests` — current results, history, CPU/mem/network, with `$project`/`$job` template vars). To add a panel, edit the JSON (validate with `python3 -m json.tool`), wait ~30s, verify via `curl -s http://localhost:3001/api/dashboards/uid/<uid>`.
- When a status has no rows the series is absent → stat panels show "No data"; use `sum(...) or vector(0)`.

## Gotchas (both bite often)
- **Port 8000 conflict:** a leftover `ai_automation_testing` compose stack also binds 8000. If startup fails with "port is already allocated": `docker stop ai_automation_testing-automation-server-1`.
- **Stale test data / empty test panels:** Playwright wipes & recreates `test-results/` each run, changing the host dir inode; on macOS Docker Desktop the long-running `api` container stays bound to the old (empty) inode → reports `qa_playwright_report_present 0` with no test metrics. Fix: `docker compose restart api` (already added to `run-all-tests.sh` after tests write results).
