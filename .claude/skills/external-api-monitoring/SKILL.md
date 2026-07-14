---
name: external-api-monitoring
description: Write, run, and debug the live external-API monitoring tests for Govmap + Ofek (tests/monitoring/**) — the browserless APIRequestContext health checks that alert when the product's critical map dependencies break. Use when editing tests/monitoring/**, config.json → monitoring, the endpoints helper, or the monitoring CI/cron/alerting.
---

# External-API monitoring (Govmap + Ofek)

The Organuz product characterizes a property on a live national-GIS map, so two Survey-of-Israel services are on the critical path and have caused product incidents when they broke. This group is dedicated, browserless availability + contract monitoring for them — it is *meant to fail* when a dependency is down (that IS the alert), so it stays out of the blocking test count.

- **Govmap** — `www.govmap.gov.il`: map API, address search/geocoding, embed viewer, layers-catalog auth.
- **Ofek** — `basemaps.govmap.gov.il`: the national orthophoto ("אופק") aerial tiles the roof scan runs on, plus label overlay tiles.

## Files
- `tests/monitoring/govmap.spec.ts` — 25 checks. `tests/monitoring/ofek.spec.ts` — 25 checks. Both `test.describe(..., { tag: '@monitoring' })`.
- `tests/monitoring/support/endpoints.ts` — the single source of hosts/tokens/layers/coords + URL builders (`orthoTileUrl`, `labelTileUrl`, `autocompleteBody`, `TILE_HEADERS`, `LATENCY_BUDGET_MS`). Every value reads `config.json → monitoring` with an **env override**.
- Playwright project `monitoring` (`playwright.config.ts`) — registered ONLY when `MONITORING_ENABLED=true`; `testMatch: tests/monitoring/**`.

## Auth model (why no secret is needed)
Three tiers, all testable today with zero private credentials:
1. **Govmap search/geocoding** (`POST /api/search-service/autocomplete`, `getTypes`) — **no token**, plain JSON body (`autocompleteBody()` → `{searchText, language:'he', isAccurate:false, maxResults:10}`). This is the critical path.
2. **Govmap embed + layers-catalog auth** (`POST /api/layers-catalog/api/auth` with `{token, hostUrl}`) — a **public embed token bound to the app origin**. Govmap tokens are domain-bound and *not valid on another domain*, so the handshake test (#20) must send `hostUrl = GOVMAP.embedHostUrl` (`dev1.app.organize.organuz.com`). A protected catalog endpoint (`baseLayers`) is used as an auth-enforcement check (expects 400/401/403), not a data check.
3. **Ofek tiles** — **no token; referer-gated.** `/tms/<orthoLayer>/{z}/{x}/{y}.jpg` and `/backgroundMaps/<labelsLayer>/{z}/{x}/{y}.png` require `Referer: https://www.govmap.gov.il/` (`TILE_HEADERS`). Any other/no referer → 401.

## Block-page → skip (not fail) — geo/bot-blocked runners
The `govmap.gov.il` edge (CDN/WAF) sometimes answers with an **HTML block/challenge page**
(HTTP 200 + `text/html`) instead of the real asset, typically when the requesting IP is
geo/bot-blocked — e.g. a CI runner outside Israel. In that state the dependency is
environmentally unavailable *from this runner*: it's neither a Govmap/Ofek outage nor a
product regression, so the specs **SKIP** rather than fail (the same "environmental
unavailability → skip" rule the product suite uses).

- Implemented in **`tests/monitoring/support/availability.ts`**: a per-worker (memoised)
  canary probes a URL that should return a **non-HTML** asset — `govmapBlockReason()` hits the
  Govmap API loader (`…/govmap/api/govmap.api.js`), `ofekBlockReason()` hits a sample ortho tile
  (with `TILE_HEADERS`). If the body/content-type **looks like an HTML page** it returns a clear
  skip reason string; otherwise `null`.
- Each spec calls it in `test.beforeEach` and skips the whole file when blocked:
  ```ts
  test.beforeEach(async ({ request }) => {
    const reason = await govmapBlockReason(request); // ofekBlockReason in ofek.spec.ts
    test.skip(reason !== null, reason ?? '');
  });
  ```
- **Skip vs fail rule.** Only an HTML block/challenge page counts as "blocked" → skip. A
  **genuine break still FAILS as intended**: a 5xx, a connection/TLS error, or a real-but-wrong
  non-HTML payload does not look like an HTML page (network errors return `null`), so the health
  checks run and fail — the alert. Net: **a red monitoring run now means a genuine Govmap/Ofek
  break, not a blocked runner.**

## Config + env overrides
Values live in `config.json → monitoring`; each is overridable via env (in the gitignored `.env` locally, or GitHub secrets/vars on CI) so you never edit committed config to point at your own token/domain or track a layer rename:

| Env | Overrides |
|---|---|
| `GOVMAP_API_URL` | Govmap host |
| `GOVMAP_EMBED_TOKEN` | embed/auth token (set your own domain-bound token here — keep it out of git) |
| `GOVMAP_EMBED_HOST` | origin the token is bound to (the `hostUrl` in the auth handshake) |
| `OFEK_TILES_URL` | tile host |
| `OFEK_ORTHO_LAYER` / `OFEK_LABELS_LAYER` | current layer names (renamed yearly/monthly — drift is a real signal) |
| `OFEK_REFERER` | the required tile Referer |
| `MONITORING_LATENCY_MS` | per-request latency ceiling (default 6000) |

**Getting your own Govmap token:** request one from Govmap (Survey of Israel) via the [Govmap API portal](https://api.govmap.gov.il/docs/intro). It is bound to a domain you control; drop it in `GOVMAP_EMBED_TOKEN` + set `GOVMAP_EMBED_HOST` to that origin. No token exists or is needed for Ofek or Govmap search.

## Running
```bash
npm run test:monitoring          # MONITORING_ENABLED=true playwright test --project=monitoring (50 live checks)
npx playwright test --project=monitoring -g "autocomplete"   # one area (needs MONITORING_ENABLED=true)
```
On GitHub Actions it runs two ways, both defined outside the blocking gate:
- **`monitoring.yml`** — 30-min cron; on failure opens/refreshes one auto-managed `monitoring-alert` issue and pings both Slack webhooks; next green run closes it. `force_fail` dispatch input exercises the alert path.
- **non-blocking `monitoring` job in `parallel-tests.yml`** — every push/PR, `continue-on-error: true`, folds results into the Allure report but never reds the pipeline. See the **`test-suite-parity`** skill.

## Efficient patterns (keep new checks cheap + honest)
- **`APIRequestContext` only** — use the `request` fixture, never a browser/page. No `playwright install` needed; a check is ~10–200ms. This is what keeps 50 live checks fast.
- **Latency** — wrap in the `timed()` helper and assert `ms < LATENCY_BUDGET_MS`; don't hard-code ms.
- **Binary payloads** — verify tiles by **magic bytes** (JPEG `ff d8 ff`, PNG `89 50 4e 47`) + `content-type`, not just status, so a 200-that-serves-an-error-page is caught.
- **Contract drift** — assert the shape you depend on (`results[0].shape` matches `/^POINT\s*\(/`, `type === 'address'`), and add explicit **layer-rename guard** checks so a silent yearly ortho/monthly-label rename fails loudly.
- **Enforcement, not data** — for auth-protected endpoints assert the *rejection* (400/401/403), which is stable, rather than a body that needs a session.
- **One concern per test**, numbered + `allureStory(...)`, so a failure names the exact broken endpoint.

## Adding a check
1. Add the host/layer/coord to `config.json → monitoring` (+ an env override in `endpoints.ts` if it should be tunable) — never inline a URL in a spec.
2. Add a numbered `test(...)` with `allureStory`, using `request` + a `timed()` latency guard where relevant.
3. Bump the per-file count in comments/docs if you change the 25+25 total, and keep CLAUDE.md / `test-suite-parity` in sync.
4. Endpoints were discovered by capturing the dev app's network on the calculator address/roof step (see **`organuz-product-e2e`**); re-capture there if an endpoint moves.

## Gotchas
- **Tile 401** = wrong/missing `Referer` (`OFEK_REFERER`), not an outage. **Auth-handshake 401** = token not authorized for `GOVMAP_EMBED_HOST` (token is origin-bound).
- **Layer names drift** (ortho yearly, labels monthly) — a rename surfaces as a tile 404; that's a real signal, update `OFEK_ORTHO_LAYER`/`OFEK_LABELS_LAYER`.
- CI runners reach the public internet, so both APIs are reachable from GitHub-hosted jobs — a red run here means the dependency is actually degraded. A runner that Govmap geo/bot-blocks with an HTML page **skips** (see "Block-page → skip" above), it does not red.

See [[organuz-monitoring]] (the Grafana/Prometheus stack that graphs these), [[test-suite-parity]] (how monitoring sits in CI), and the `govmap-ofek-monitoring` memory.
