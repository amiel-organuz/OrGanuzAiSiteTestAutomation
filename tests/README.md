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
| Dev API contracts | `tests/dev-api/contracts/` | `organuz.flamiingo.com` RPC gateway envelope + invariant contracts (`get_arena_types`, `get_remaining_projects`). |
| Dev API security | `tests/dev-api/security/` | RPC negative/security, input-validation, and token-hardening cases. |
| Dev API support | `tests/dev-api/support/` | `FlamiingoApi` RPC client and fixtures. |
| Product smoke | `tests/product/smoke/` | Credential-free public calculator shell checks. |
| Product flows | `tests/product/flows/` | Gated full-flow + per-role specs (`full-flow`, `roles`, `role-areas`, `role-session`, `role-sanity`, `role-logout`). |
| Product API | `tests/product/api/` | Gated product role backend API checks (`role-backend.spec.ts`). |
| Product matrix | `tests/product/matrix/` | Persona E2E matrix data and specs (gated by `PRODUCT_E2E_ENABLED`). |
| Product support | `tests/product/support/` | Product app page helpers, `ProductFlows`, fixtures, and the `product-setup` auth (`auth.setup.ts` + `auth.ts` save each role's `storageState` for reuse). |
| Agent orchestrator | `tests/agent/orchestrator/` | QA agent orchestration regression specs. |

The Playwright project globs remain recursive:

- `chromium`: `tests/ui/**/*.spec.ts`
- `product`: `tests/product/**/*.spec.ts` (depends on `product-setup`)
- `product-setup`: `tests/product/support/auth.setup.ts`
- `organuz-api`: `tests/organuz-api/**/*.spec.ts`
- `dev-api`: `tests/dev-api/**/*.spec.ts`
- `agent`: `tests/agent/**/*.spec.ts`

The `product` project depends on `product-setup`, which logs each authenticated role
(`customer`, `consultant`, `company`) in once and saves its `storageState` to
`playwright/.auth/` (gitignored). Per-role specs then resume that session via
`test.use({ authRole })` + `product.resumeSession()` instead of logging in again, keeping
OTP sends to one per role per run. Sign-out is isolated in `role-logout.spec.ts` (its own
login) so it can't invalidate the shared sessions. When a role's saved session is missing
(setup skipped on OTP cooldown), the dependent specs skip with a reason rather than failing.
