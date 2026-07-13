---
name: organuz-monitoring
description: Build or debug the Grafana/Prometheus/Pushgateway monitoring stack for the Organuz QA suite — dashboards from pushed Playwright metrics, plus the CPU/memory/network process metrics. Use when editing server/grafana, server/prometheus.yml, scripts/push-qa-metrics.mjs, or diagnosing empty dashboards.
---

# Organuz QA monitoring (Grafana + Prometheus + Pushgateway)

The local Docker stack (compose project `organuzaisitetestautomation`) turns Playwright results into a QA dashboard. Services: FastAPI `api` (8000, `/metrics`), Prometheus (host 9092→9090), **Pushgateway (host 9091)**, Grafana (host 3001, admin/admin, anon Viewer), Scalar (8080), Allure (5050). Start via `./scripts/run-all-tests.sh`.

## Metrics available
Prometheus (`server/prometheus.yml`) scrapes **three** targets: `prometheus`, `fastapi` (`api:8000`), and `pushgateway` (`pushgateway:9091`, `honor_labels: true`). CPU/mem/network are **process-level** from the FastAPI process: `process_cpu_seconds_total` (rate → cores), `process_resident_memory_bytes`, `process_virtual_memory_bytes`, `process_network_receive/transmit_bytes_total`, labelled by `job` (`fastapi`, `prometheus`). For true container/host metrics you'd add cAdvisor + node-exporter + scrape jobs.

QA test metrics are **pushed** to the Pushgateway by `scripts/push-qa-metrics.mjs` (a PUT to `/metrics/job/qa-playwright`, run at the end of `run-all-tests.sh`), which parses `test-results/results.json`: `qa_playwright_tests_total{project,status}`, `qa_playwright_duration_seconds{project}`, `qa_playwright_last_run_timestamp_seconds`, `qa_playwright_report_present`. The API no longer reads the results file — this is what removed the old stale-bind-mount bug. To refresh QA numbers by hand: `PUSHGATEWAY_URL=http://localhost:9091 node scripts/push-qa-metrics.mjs`.

## Dashboards
File-provisioned from `server/grafana/provisioning/dashboards/` (provider polls every 30s; folder "OrGanuz QA"). Datasource uid `Prometheus`. Existing: `qa-dashboard.json` and `system-and-tests-dashboard.json` (uid `organuz-system-tests` — current results, history, CPU/mem/network, with `$project`/`$job` template vars). To add a panel, edit the JSON (validate with `python3 -m json.tool`), wait ~30s, verify via `curl -s http://localhost:3001/api/dashboards/uid/<uid>`.
- When a status has no rows the series is absent → stat panels show "No data"; use `sum(...) or vector(0)`.

## Gotchas
- **Port 8000 conflict:** a leftover `ai_automation_testing` compose stack also binds 8000. If startup fails with "port is already allocated": `docker stop ai_automation_testing-automation-server-1`.
- **Empty test panels:** if `qa_playwright_*` is missing, the push didn't happen. Check the Pushgateway has the group (`curl -s http://localhost:9091/metrics | grep qa_playwright`) and that Prometheus scrapes it (`pushgateway` target healthy at `http://localhost:9092/targets`). Re-push with `node scripts/push-qa-metrics.mjs`. (The old "restart api to unstick a stale bind mount" fix is gone — the API no longer reads the results file.)
- **Editing `server/prometheus.yml` doesn't take effect:** the config is a read-only bind mount, so a running Prometheus keeps the old config. Force it: `docker compose up -d --force-recreate prometheus` (or hit `/-/reload`).
