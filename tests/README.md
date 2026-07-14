# Test Layout

Tests are grouped by subject so each Playwright project stays easy to scan.

| Area | Folder | Purpose |
| --- | --- | --- |
| UI homepage | `tests/ui/homepage/` | Hero, navigation, contact, and homepage shell checks (`chromium` project — currently disabled). |
| UI content | `tests/ui/content/` | Blog, FAQ, agents, projects, and static page coverage (disabled). |
| UI flows | `tests/ui/flows/` | Cross-section critical user journeys (disabled). |
| UI diagnostics | `tests/ui/diagnostics/` | Expected-failure checks for artifact capture (disabled). |
| Local web | `tests/local-web/` | Local-only marketing-site e2e vs prod `www.organuz.ai`; every spec self-skips on CI (`local-web` project). |
| Security | `tests/security/` | Authorized non-destructive backend penetration tests (`SEC-01…SEC-20`, `security` project). |
| Organuz API contracts | `tests/organuz-api/contracts/` | Supabase/PostgREST `projects` schema and response contract coverage. |
| Organuz API resources | `tests/organuz-api/resources/` | `projects` query behaviours (select, order, filter, count). |
| Organuz API security | `tests/organuz-api/security/` | Anon-key auth, RLS, and negative cases. |
| Organuz API functions | `tests/organuz-api/functions/` | Edge-function CORS preflight checks (no live POSTs). |
| Product smoke | `tests/product/smoke/` | Credential-free public calculator shell checks. |
| Product API | `tests/product/api/` | Public product token sanity + public-app-sanity checks. |
| Product matrix | `tests/product/matrix/` | Offline persona/role data-contract specs over checked-in matrix fixtures. |
| Product flows | `tests/product/flows/` | Live per-role browser specs (`product-authenticated` project — currently disabled). |
| Product support | `tests/product/support/` | Product app page helpers, `ProductFlows`, fixtures, and the `product-setup` auth (`auth.setup.ts` + `auth.ts` save each role's `storageState` for reuse). |
| UI support | `tests/ui/support/` | UI-only fixture extensions, including `siteFlows`, layered on top of the shared `src/fixtures`. |
| Agent orchestrator | `tests/agent/orchestrator/` | QA agent orchestration regression specs. |
| Agent test-plan | `tests/agent/test-plan/` | `TestPlanAgent` spec — URL → Playwright-MCP exploration → generated `TestSuite`. |
| External monitoring | `tests/monitoring/` | Live Govmap + Ofek third-party availability checks (opt-in `monitoring` project, `MONITORING_ENABLED=true`). |

Each Playwright project (a named group of tests in the config) picks up its files
with a recursive glob (a folder-matching pattern that also reaches into
sub-folders). `product`, `organuz-api`, `agent`, `security`, and `local-web` are
**active** by default today; the `chromium`, `product-setup`, and `product-authenticated`
projects are **currently disabled** — commented out in `playwright.config.ts`, with their
spec files retained. Re-enable one by uncommenting its block. The projects and their globs
are:

- `product` *(active, 37 tests)*: `tests/product/**/*.spec.ts` excluding `flows/**` — smoke, registration, and the offline matrix/role data-contract specs. Targets the calculator app for the selected `QA_TARGET_ENV` (default dev).
- `organuz-api` *(active, 1 test)*: `tests/organuz-api/**/*.spec.ts`, default-filtered to `@other-smoke`
- `agent` *(active, 2 tests)*: `tests/agent/**/*.spec.ts`, default-filtered to `@other-smoke`
- `security` *(active, 20 tests)*: `tests/security/**/*.spec.ts` — authorized, non-destructive penetration testing of the Organuz Supabase backend with the public anon key (browserless `APIRequestContext`). `SEC-01…SEC-20` span auth, RLS, injection/XSS, transport, CORS, key/JWT hygiene, and edge-function auth. A failure is a real security finding.
- `local-web` *(active, 50 tests, but self-skips on CI)*: `tests/local-web/**/*.spec.ts` — local-only marketing-site e2e (real chromium vs prod `www.organuz.ai`). Every spec calls `localOnly()` (`tests/local-web/support.ts`), which `test.skip`s the file when `process.env.CI` is set, and the CI matrix does not list the project — an intentional local/CI divergence (a sanctioned skip).
- `chromium` *(disabled — commented out; specs kept, 12 tests when enabled)*: `tests/ui/**/*.spec.ts`, default-filtered to `@other-smoke`
- `product-setup` *(disabled — commented out; specs kept, 3 tests when enabled)*: `tests/product/support/auth.setup.ts`
- `product-authenticated` *(disabled — commented out; specs kept, 10 tests when enabled)*: `tests/product/flows/**/*.spec.ts` — per-role specs that resume saved sessions (depends on `product-setup`)
- `monitoring` *(opt-in, 50 tests)*: `tests/monitoring/**/*.spec.ts` — live Govmap + Ofek availability
  checks; registered only when `MONITORING_ENABLED=true`, so it is never in the default suite
  (it runs on a schedule via `.github/workflows/monitoring.yml`, plus a non-blocking job in
  `parallel-tests.yml`). It **skips** (not fails) when the runner is served an HTML
  block/challenge page — a geo/bot block rather than a real outage — via the `beforeEach`
  canary in `tests/monitoring/support/availability.ts`.

The default suite is therefore **110 tests** (`product` 37 + `organuz-api` 1 + `agent` 2 +
`security` 20 + `local-web` 50), all green — or **160** with `MONITORING_ENABLED=true`.
Because the 50 `local-web` specs self-skip on CI (and the project is absent from the CI
matrix), CI runs the other 60 active tests plus the non-blocking `monitoring` job. The
`organuz-api` and `agent` projects run only their `@other-smoke`-tagged checks (a tag that
marks the lightweight sanity subset). The disabled `chromium` / `product-setup` /
`product-authenticated` specs still live in the repo, but the default config does not select
them.

The product session-sharing described below applies once the `product-setup` /
`product-authenticated` projects are re-enabled (they are currently commented out in
`playwright.config.ts`; the specs are kept).

The `product-authenticated` project depends on `product-setup`. That setup project logs
each authenticated role (`customer`, `consultant`, `company`) in once and saves its
`storageState` (the saved browser session) to `playwright/.auth/` (gitignored). The
per-role specs then resume that saved session via `test.use({ authRole })` +
`product.resumeSession()` rather than logging in again. This keeps OTP (one-time passcode)
sends down to one per role per run. When a role's saved session is missing (for example,
setup was skipped because of an OTP cooldown), the dependent specs skip with a stated reason
instead of failing.

Per-role credentials are **env-aware** and split per target under `env/` (`env/.dev.env`
default, `env/.prod.env`, selected by `QA_TARGET_ENV`). For each role the runner reads
`<ROLE>_PHONE` / `<ROLE>_OTP_CODE` (`CUSTOMER`, `CONSULTANT`, `COMPANY`), resolved in
`tests/product/support/roleCredentials.ts`, which also accepts a legacy `<ENV>_<ROLE>_PHONE`
form (e.g. `DEV_CUSTOMER_PHONE`); dev uses the fixed OTP `7777`. The real env files are
gitignored; only the `*.example` templates are committed.

Registration coverage lives in the plain `product` project so that it does not trigger the
shared role auth setup. Most registration tests are no-submit validation checks. Only the
full property-owner signup test completes OTP and creates a fresh account.
