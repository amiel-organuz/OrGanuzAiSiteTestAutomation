# Test Plan 7 — External API Monitoring (Govmap + Ofek)

| | |
|---|---|
| **Project** | `monitoring` (opt-in — registered only when `MONITORING_ENABLED=true`) |
| **Specs** | `tests/monitoring/govmap.spec.ts`, `tests/monitoring/ofek.spec.ts` |
| **Default filter** | none — every matched spec runs |
| **Target** | Live third-party map dependencies: **Govmap** (`www.govmap.gov.il`) and **Ofek** (`basemaps.govmap.gov.il`) |
| **Client** | `APIRequestContext` only (no browser); endpoints from `tests/monitoring/support/endpoints.ts` (`config.json → monitoring`, env-overridable) |
| **Cases** | 50 (Govmap 25 + Ofek 25) |
| **Skips** | Block page → skip: a spec skips when the govmap.gov.il edge serves an HTML block/challenge page to the runner (a geo/bot block). Otherwise none — not in the default suite; runs only when opted in, and a real break IS the alert. |
| **Skill** | `organuz-monitoring` |

## Scope

Dedicated availability and contract monitoring for the two external map services
the product relies on when it characterizes a property. Both are
Survey-of-Israel / national GIS (geographic information system) services:

- **Govmap** (`www.govmap.gov.il`) — the map API and the address
  search/geocoding ("geocoding" means turning an address into map coordinates).
- **Ofek** (`basemaps.govmap.gov.il`) — the national orthophoto "אופק" aerial
  tiles that the roof scan runs on, plus the label/line overlay tiles.
  ("Orthophoto" tiles are aerial photos corrected so they can be used like a
  map.)

Both services have caused product incidents when they broke, so this group acts
as the early-warning signal.

These tests are **health checks**: when a dependency breaks, they fail, and that
failure is itself the alert. Because they hit live third-party APIs — and would
go red on someone else's outage — the group is **opt-in**
(`MONITORING_ENABLED=true`) and runs on a schedule. It is **never** part of the
PR green gate. The default `npx playwright test` never registers the
`monitoring` project, so a Govmap or Ofek outage can't break the PR suite.

## Gating (sanctioned skip — block page)

The one sanctioned skip is a **block/challenge page**. The `govmap.gov.il` edge
sometimes serves an HTML block or challenge page to the runner — a geo/bot block,
for example when a CI runner sits outside Israel. That is not a Govmap outage and
must not read as one, so a blocked run **skips** instead of failing.

- A per-worker canary in `tests/monitoring/support/availability.ts`
  (`govmapBlockReason` / `ofekBlockReason`) runs from each spec's `beforeEach`.
  When it detects an HTML block/challenge page, the spec calls `test.skip` with a
  clear reason.
- A **real break still FAILS**: a 5xx, a connection error, or a real-but-wrong
  payload (a JSON/tile response with the wrong shape — *not* an HTML page) all go
  red. So a red monitoring run now means a genuine Govmap/Ofek break, not a
  blocked runner.

## Preconditions

- `MONITORING_ENABLED=true` in the environment. Otherwise the project is not
  registered at all (see `playwright.config.ts`).
- Public internet access to `www.govmap.gov.il` and `basemaps.govmap.gov.il`.
- No credentials, no browser, and no password gate — the specs use
  `APIRequestContext` (Playwright's plain HTTP client) directly. The endpoint
  hosts, the public embed token, the known address, the tile layer names, the
  sample tile coordinate, and the latency budget all come from
  `config.json → monitoring`, and each can be overridden by an environment
  variable.

## Cases

### `govmap.spec.ts` — "Govmap API monitoring" (`@monitoring`)

Epic: External API monitoring · Feature: Govmap (`www.govmap.gov.il`)

| ID | Case | Asserts |
|----|------|---------|
| GOV-01 | `govmap.api.js` loader is reachable | Loader script returns 200 |
| GOV-02 | `govmap.api.js` is served as JavaScript | `content-type` matches `javascript` |
| GOV-03 | `govmap.api.js` is a non-trivial bundle | Body > 100 KB and contains `govmap` |
| GOV-04 | Loader responds within the latency budget | `res.ok()` and elapsed < `LATENCY_BUDGET_MS` |
| GOV-05 | Govmap is served over HTTPS | API base URL starts with `https://` |
| GOV-06 | The embed viewer document loads for the public token | Embed URL returns 200 |
| GOV-07 | The embed viewer document is HTML | `content-type` matches `text/html` |
| GOV-08 | Address autocomplete responds 200 | POST autocomplete returns 200 |
| GOV-09 | Address autocomplete returns JSON | `content-type` matches `application/json` |
| GOV-10 | A known address returns at least one result | `resultsCount > 0` and `results` is a non-empty array |
| GOV-11 | Top result matches the queried street | `results[0].text` contains the known street |
| GOV-12 | Top result carries a POINT geometry (geocoded) | `results[0].shape` matches `POINT(...)` |
| GOV-13 | Top result is typed as an address | `results[0].type === 'address'` |
| GOV-14 | Autocomplete respects `maxResults` | `results.length <= 10` |
| GOV-15 | Autocomplete responds within the latency budget | `res.ok()` and elapsed < `LATENCY_BUDGET_MS` |
| GOV-16 | A nonsense query is handled gracefully | No 5xx; `results` is an array; `resultsCount === 0` |
| GOV-17 | Address search is HTTPS-only | Autocomplete URL starts with `https://` |
| GOV-18 | `getTypes` responds 200 with a JSON array | 200 and body is an array |
| GOV-19 | `getTypes` exposes the known search types | Type names include `settlement` and `layer` |
| GOV-20 | The embed token is still authorized for the app host | Auth handshake (token + host URL) returns 200 |
| GOV-21 | A protected layers-catalog endpoint enforces auth | `baseLayers` without a session returns 400/401/403 |
| GOV-22 | Anonymous `users-management/me` is unauthorized | Returns 401 |
| GOV-23 | The Hebrew translations bundle is available | Returns 200 with a JSON `content-type` |
| GOV-24 | No critical Govmap endpoint returns a 5xx | Loader, embed, autocomplete, getTypes all < 500 |
| GOV-25 | The Govmap host is reachable over TLS | A valid-cert HTTPS request to the base URL returns < 500 |

### `ofek.spec.ts` — "Ofek orthophoto tiles monitoring" (`@monitoring`)

Epic: External API monitoring · Feature: Ofek / Survey-of-Israel orthophoto (`basemaps.govmap.gov.il`)

The Ofek tile server only serves requests that come from the Govmap origin, so
every tile request carries that origin in its `Referer` header (set via
`TILE_HEADERS`).

| ID | Case | Asserts |
|----|------|---------|
| OFK-01 | An orthophoto tile responds 200 (with the Govmap referer) | Ortho tile returns 200 |
| OFK-02 | The orthophoto tile is served as `image/jpeg` | `content-type` matches `image/jpeg` |
| OFK-03 | The orthophoto tile body is non-empty | Body length > 1000 |
| OFK-04 | The orthophoto tile has valid JPEG magic bytes | Body starts with `FF D8 FF` |
| OFK-05 | The orthophoto tile responds within the latency budget | `res.ok()` and elapsed < `LATENCY_BUDGET_MS` |
| OFK-06 | Orthophoto tiles are served over HTTPS | Tiles base URL starts with `https://` |
| OFK-07 | The tile server requires the Govmap referer | Request without a referer returns 401 |
| OFK-08 | The tile server rejects a foreign referer | A foreign `Referer` returns 401 |
| OFK-09 | Adjacent orthophoto tiles are available | `(x+1,y)` and `(x,y+1)` both return 200 |
| OFK-10 | A 2×2 orthophoto tile grid is fully available | All four tiles return 200 |
| OFK-11 | A deeper-zoom orthophoto tile (roof-scan detail) is available | The `z+2` child tile returns 200 |
| OFK-12 | The orthophoto tile size is within a sane range | Body between 1 KB and 2 MB (not an error page) |
| OFK-13 | The orthophoto tile advertises CDN caching | One of `cache-control`/`etag`/`age`/`expires` present |
| OFK-14 | A label overlay tile responds 200 (with the referer) | Label tile returns 200 |
| OFK-15 | The label tile is served as `image/png` | `content-type` matches `image/png` |
| OFK-16 | The label tile has valid PNG magic bytes | Body starts with `89 50 4E 47` |
| OFK-17 | The label tile body is non-empty | Body length > 200 |
| OFK-18 | The label tile responds within the latency budget | `res.ok()` and elapsed < `LATENCY_BUDGET_MS` |
| OFK-19 | The label tile also requires the Govmap referer | Request without a referer returns 401 |
| OFK-20 | Ortho and label tiles are both available for the same coordinate | Both return 200 |
| OFK-21 | The Ofek tiles host is reachable over TLS | A valid-cert HTTPS tile request returns < 500 |
| OFK-22 | Orthophoto tiles return no server errors across a sample | Four sampled zoom/coords all < 500 |
| OFK-23 | The configured orthophoto layer still serves imagery | Ortho tile 200 — guards a silent layer rename |
| OFK-24 | The configured labels layer still serves tiles | Label tile 200 — guards a silent layer rename |
| OFK-25 | A batch of orthophoto tiles are all `image/jpeg` | All four tiles' `content-type` match `image/jpeg` |

## Run

```bash
# Opt in explicitly (the project is unregistered otherwise):
npm run test:monitoring
# equivalently:
MONITORING_ENABLED=true npx playwright test --project=monitoring
```

## Scheduling & alerting

This group runs on its own GitHub Actions workflow, **`External API
Monitoring`** (`.github/workflows/monitoring.yml`). It is kept separate from the
PR suite (`parallel-tests.yml`) so that an outage alerts here without ever
failing the green PR gate:

- **Schedule:** cron `*/30 * * * *` (every 30 minutes). The `concurrency`
  setting cancels an in-flight run so a newer pass supersedes it.
- **Runner:** `ubuntu-latest`, Node 22, `npm ci`, and no browser install (the
  specs use `APIRequestContext` only). It runs
  `npx playwright test --project=monitoring` with `MONITORING_ENABLED=true`.
- **Alert issue:** on failure, the workflow opens a single auto-managed GitHub
  issue (label `monitoring-alert`) — or, if one is already open, comments "still
  failing" on it. That way a sustained outage doesn't spam a new issue on every
  run. The next green run comments on the issue and closes it (auto-recovery).
- **Slack:** on failure, it posts to every configured webhook —
  `SLACK_WEBHOOK_URL` and `SLACK_WEBHOOK_BOT_URL` (GitHub repo secrets). Each is
  independent and optional: an unset webhook is skipped, and a failed post is
  non-fatal, so one bad webhook never masks the alert.
- **Alert-path test:** a `workflow_dispatch` run with `force_fail=true` fails on
  purpose. This exercises the issue + Slack path without hitting the live APIs;
  the next green run auto-closes the resulting issue.

## Notes

- This group is **never** in the default suite. It either runs (when opted in)
  or is unregistered. Its one sanctioned skip is a **block/challenge page** from
  the govmap.gov.il edge (a geo/bot block — see "Gating" above): the per-worker
  canary in `tests/monitoring/support/availability.ts` skips the spec via each
  `beforeEach`. Every other red is a real signal that a critical map dependency
  is degraded — a 5xx, a connection error, or a real-but-wrong (non-HTML) payload
  is a break, not a flake to skip.
- The endpoint hosts, the public embed token, the tile layer names, the sample
  tile, the known address, and the latency budget all live in
  `config.json → monitoring`. Each can be overridden by an environment variable
  (`GOVMAP_API_URL`, `OFEK_TILES_URL`, `OFEK_ORTHO_LAYER`, `OFEK_LABELS_LAYER`,
  `MONITORING_LATENCY_MS`, and so on). The layer-drift guards (OFK-23/24) exist
  because the national orthophoto layer is renamed every year; a rename is a real
  signal, and it is fixed with a one-line config update.
- Adding or removing a monitoring spec changes the documented count (50);
  update `CLAUDE.md`, this plan, and the `test-suite-parity` skill.
