# Test Layout

Tests are grouped by subject so each Playwright project stays easy to scan.

| Area | Folder | Purpose |
| --- | --- | --- |
| UI homepage | `tests/ui/homepage/` | Hero, navigation, contact, and homepage shell checks. |
| UI content | `tests/ui/content/` | Blog, FAQ, agents, projects, and static page coverage. |
| UI flows | `tests/ui/flows/` | Cross-section critical user journeys. |
| UI diagnostics | `tests/ui/diagnostics/` | Expected-failure checks for artifact capture. |
| Organuz API contracts | `tests/organuz-api/contracts/` | Supabase/PostgREST `projects` schema and response contract coverage. |
| Organuz API resources | `tests/organuz-api/resources/` | `projects` query behaviours (select, order, filter, count). |
| Organuz API security | `tests/organuz-api/security/` | Anon-key auth, RLS, and negative cases. |
| Organuz API functions | `tests/organuz-api/functions/` | Edge-function CORS preflight checks (no live POSTs). |
| Product smoke | `tests/product/smoke/` | Credential-free public calculator shell checks. |
| Product flows | `tests/product/flows/` | Registration, gated full-flow, sign-out, and per-role specs (`registration`, `full-flow`, `roles`, `role-areas`, `role-session`, `role-sanity`, `role-logout`). |
| Product API | `tests/product/api/` | Public product token sanity checks. |
| Product matrix | `tests/product/matrix/` | Persona E2E matrix data and specs (gated by `PRODUCT_E2E_ENABLED`). |
| Product support | `tests/product/support/` | Product app page helpers, `ProductFlows`, fixtures, and the `product-setup` auth (`auth.setup.ts` + `auth.ts` save each role's `storageState` for reuse). |
| UI support | `tests/ui/support/` | UI-only fixture extensions, including `siteFlows`, layered on top of the shared `src/fixtures`. |
| Agent orchestrator | `tests/agent/orchestrator/` | QA agent orchestration regression specs. |
| Agent test-plan | `tests/agent/test-plan/` | `TestPlanAgent` spec — URL → Playwright-MCP exploration → generated `TestSuite`. |
| External monitoring | `tests/monitoring/` | Live Govmap + Ofek third-party availability checks (opt-in `monitoring` project, `MONITORING_ENABLED=true`). |

Each Playwright project (a named group of tests in the config) picks up its files
with a recursive glob (a folder-matching pattern that also reaches into
sub-folders). Only `organuz-api` and `agent` are **active** by default today; the
`chromium` and `product*` projects are **currently disabled** — commented out in
`playwright.config.ts`, with their spec files retained. Re-enable one by uncommenting
its block (and re-add `devices` to the config's import). The projects and their globs
are:

- `chromium` *(disabled — commented out; specs kept, 12 tests when enabled)*: `tests/ui/**/*.spec.ts`, default-filtered to `@other-smoke`
- `product` *(disabled — commented out; specs kept, 31 tests when enabled)*: product specs that do not need shared role storage (smoke, registration, full-flow, matrix, sign-out)
- `product-setup` *(disabled — commented out; specs kept, 3 tests when enabled)*: `tests/product/support/auth.setup.ts`
- `product-authenticated` *(disabled — commented out; specs kept, 10 tests when enabled)*: per-role specs that resume saved sessions (depends on `product-setup`)
- `organuz-api` *(active, 1 test)*: `tests/organuz-api/**/*.spec.ts`, default-filtered to `@other-smoke`
- `agent` *(active, 2 tests)*: `tests/agent/**/*.spec.ts`, default-filtered to `@other-smoke`
- `monitoring` *(opt-in, 50 tests)*: `tests/monitoring/**/*.spec.ts` — live Govmap + Ofek availability
  checks; registered only when `MONITORING_ENABLED=true`, so it is never in the default suite
  (it runs on a schedule via `.github/workflows/monitoring.yml`). It **skips** (not fails)
  when the runner is served an HTML block/challenge page — a geo/bot block rather than a real
  outage — via the `beforeEach` canary in `tests/monitoring/support/availability.ts`.

The default suite is therefore **3 tests** (`organuz-api` 1 + `agent` 2), all green — or
**53** with `MONITORING_ENABLED=true`. Both active projects run only their
`@other-smoke`-tagged checks (a tag that marks the lightweight sanity subset): one Organuz API
contract and two agent tests (the orchestrator regression and the `TestPlanAgent`
URL→plan generator). The broader non-product specs (and, while disabled, the `chromium` /
`product*` specs) still live in the repo, but the default project config does not select them.

The product session-sharing described below applies once the `product` / `product-setup` /
`product-authenticated` projects are re-enabled (they are currently commented out in
`playwright.config.ts`; the specs are kept).

The `product-authenticated` project depends on `product-setup`. That setup project logs
each authenticated role (`customer`, `consultant`, `company`) in once and saves its
`storageState` (the saved browser session) to `playwright/.auth/` (gitignored). The
per-role specs then resume that saved session via `test.use({ authRole })` +
`product.resumeSession()` rather than logging in again. This keeps OTP (one-time passcode)
sends down to one per role per run. Sign-out is isolated in `role-logout.spec.ts`, which
does its own login, so it can't invalidate the shared sessions. When a role's saved session
is missing (for example, setup was skipped because of an OTP cooldown), the dependent specs
skip with a stated reason instead of failing.

Registration coverage lives in the plain `product` project so that it does not trigger the
shared role auth setup. Most registration tests are no-submit validation checks. Only the
full property-owner signup test completes OTP and creates a fresh account.
