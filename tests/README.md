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

The Playwright project globs remain recursive:

- `chromium`: `tests/ui/**/*.spec.ts`, default-filtered to `@other-smoke`
- `product`: product specs that do not need shared role storage (smoke, registration, full-flow, matrix, sign-out)
- `product-setup`: `tests/product/support/auth.setup.ts`
- `product-authenticated`: per-role specs that resume saved sessions (depends on `product-setup`)
- `organuz-api`: `tests/organuz-api/**/*.spec.ts`, default-filtered to `@other-smoke`
- `agent`: `tests/agent/**/*.spec.ts`, default-filtered to `@other-smoke`
- `monitoring` *(opt-in)*: `tests/monitoring/**/*.spec.ts` — live Govmap + Ofek availability
  checks; registered only when `MONITORING_ENABLED=true`, so it is never in the default suite
  (it runs on a schedule via `.github/workflows/monitoring.yml`)

Non-product projects run only their default `@other-smoke` checks: 12 UI checks (`chromium`),
one Organuz API contract, and two agent tests (the orchestrator regression and the
`TestPlanAgent` URL→plan generator). The broader non-product specs remain in the repo but are
not selected by the default project config.

The `product-authenticated` project depends on `product-setup`, which logs each
authenticated role (`customer`, `consultant`, `company`) in once and saves its
`storageState` to `playwright/.auth/` (gitignored). Per-role specs then resume that
session via `test.use({ authRole })` + `product.resumeSession()` instead of logging in
again, keeping OTP sends to one per role per run. Sign-out is isolated in
`role-logout.spec.ts` (its own login) so it can't invalidate the shared sessions. When a
role's saved session is missing (setup skipped on OTP cooldown), the dependent specs skip
with a reason rather than failing.

Registration coverage lives in the plain `product` project so it does not trigger shared
role auth setup. Most registration tests are no-submit validation checks; only the full
property-owner signup test completes OTP and creates a fresh account.
