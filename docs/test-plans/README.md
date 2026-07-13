# Test Plans — OrGanuz AI Site Automation

Written test plans for every automated test group in this repository. Each plan
states the group's **scope**, the **Playwright project / target / environment**
it runs against, its **gating** (when it may legitimately skip), and a table of
its **cases** with what each one asserts.

The grouping mirrors the per-test-group skills in `.claude/skills/` and the
"Test Groups → Skills" map in `Architecture.html`. Keep these plans in sync with
the specs and with the counts in `CLAUDE.md` per the **`test-suite-parity`**
skill whenever a test is added or removed.

## Groups

| # | Plan | Project(s) | Specs | Cases | Target |
|---|------|-----------|-------|-------|--------|
| 1 | [UI Sanity](01-ui-sanity.md) | `chromium` | `tests/ui/**` | 12 | Marketing site (prod `www.organuz.ai`) |
| 2 | [Product Public Sanity](02-product-public-sanity.md) | `product` | `tests/product/api/**` | 8 | Dev calculator (no login) |
| 3 | [Product Matrix & Role Contracts](03-product-matrix-contract.md) | `product` | `tests/product/matrix/**` | 23 | Offline — checked-in fixtures |
| 4 | [Product Roles E2E](04-product-roles-e2e.md) | `product-setup` → `product-authenticated` | `tests/product/flows/**` | 13 | Dev calculator (per-role login) |
| 5 | [Organuz API Contracts](05-organuz-api.md) | `organuz-api` | `tests/organuz-api/**` | 1 | Organuz Supabase / PostgREST |
| 6 | [QA Agent](06-agent.md) | `agent` | `tests/agent/**` | 2 | Offline — stubs, no network/browser |
| 7 | [External API Monitoring](07-monitoring.md) | `monitoring` (opt-in) | `tests/monitoring/**` | 50 | Live third-party maps — Govmap + Ofek |

**Default run** (`npx playwright test`): 59 tests — **46 green** (chromium 12,
product 31, organuz-api 1, agent 2) + **13 credential-gated** role specs
(product-setup 3 + product-authenticated 10) that skip until per-role secrets
exist.

**Opt-in monitoring** (`npm run test:monitoring`, i.e. `MONITORING_ENABLED=true`):
adds the `monitoring` project — 50 live Govmap + Ofek availability checks
(govmap 25 + ofek 25). It is **never** in the default suite, so a Govmap/Ofek
outage can't break the PR gate; it runs on the scheduled **External API
Monitoring** workflow and alerts via an auto-managed issue + Slack. With
monitoring enabled the total is **109**.

## Sanctioned skips (never failures)

- **Group 2 (public sanity):** skips only on a genuine dev outage — the dev
  gateway/password gate is down and no UI token can be extracted. A token that
  *is* observed but malformed still fails as a real regression.
- **Group 4 (roles e2e):** each role skips when it has no `<ROLE>_PHONE`/
  `_OTP_CODE` credential (product-setup) or no saved session (product-authenticated).

Everything else must pass. See `CLAUDE.md` → "Conventions" for the full policy.

## PDFs

A PDF of every plan (and this index) lives in [`pdf/`](pdf/). Regenerate them
after editing any plan:

```bash
npm run test-plans:pdf   # renders docs/test-plans/*.md → docs/test-plans/pdf/*.pdf
```

Markdown → HTML via `marked`, HTML → PDF via Playwright's headless Chromium — no
external tool required.
