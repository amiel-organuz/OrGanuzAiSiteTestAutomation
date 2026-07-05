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
| Product flows | `tests/product/flows/` | Gated full-flow sanity spec (`full-flow.spec.ts`). |
| Product matrix | `tests/product/matrix/` | Persona E2E matrix data and specs (gated by `PRODUCT_E2E_ENABLED`). |
| Product support | `tests/product/support/` | Product app page helpers, `ProductFlows`, and fixtures. |
| Agent orchestrator | `tests/agent/orchestrator/` | QA agent orchestration regression specs. |

The Playwright project globs remain recursive:

- `chromium`: `tests/ui/**/*.spec.ts`
- `product`: `tests/product/**/*.spec.ts`
- `organuz-api`: `tests/organuz-api/**/*.spec.ts`
- `agent`: `tests/agent/**/*.spec.ts`
