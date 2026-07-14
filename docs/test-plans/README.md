# Test Plans — OrGanuz AI Site Automation

This folder holds a written test plan for every automated test group in the
repository. Each plan describes four things:

- **Scope** — what the group covers.
- **Project / target / environment** — the Playwright project it runs as, and
  the site or backend it runs against.
- **Gating** — the specific conditions under which a test is allowed to skip.
- **Cases** — a table of every test in the group and what each one checks.

The grouping matches the per-test-group skills in `.claude/skills/` and the
"Test Groups → Skills" map in `Architecture.html`. Whenever a test is added or
removed, keep these plans in sync with the specs and with the counts in
`CLAUDE.md`, following the **`test-suite-parity`** skill.

## Groups

| # | Plan | Project(s) | Specs | Cases | Target |
|---|------|-----------|-------|-------|--------|
| 1 | [UI Sanity](01-ui-sanity.md) | `chromium` **(disabled)** | `tests/ui/**` | 12 | Marketing site (prod `www.organuz.ai`) |
| 2 | [Product Public Sanity](02-product-public-sanity.md) | `product` **(disabled)** | `tests/product/api/**` | 8 | Dev calculator (no login) |
| 3 | [Product Matrix & Role Contracts](03-product-matrix-contract.md) | `product` **(disabled)** | `tests/product/matrix/**` | 23 | Offline — checked-in fixtures |
| 4 | [Product Roles E2E](04-product-roles-e2e.md) | `product-setup` → `product-authenticated` **(disabled)** | `tests/product/flows/**` | 13 | Dev calculator (per-role login) |
| 5 | [Organuz API Contracts](05-organuz-api.md) | `organuz-api` | `tests/organuz-api/**` | 1 | Organuz Supabase / PostgREST |
| 6 | [QA Agent](06-agent.md) | `agent` | `tests/agent/**` | 2 | Offline — stubs, no network/browser |
| 7 | [External API Monitoring](07-monitoring.md) | `monitoring` (opt-in) | `tests/monitoring/**` | 50 | Live third-party maps — Govmap + Ofek |

Plans **1–4 are currently DISABLED** — their projects are commented out in
`playwright.config.ts` (spec files retained; re-enable by uncommenting). Their
case counts above describe the specs as written, not the current default run.

**Default run** (`npx playwright test`): **3 tests**, all green — `agent` 2 +
`organuz-api` 1. Plans **1–4 are disabled** (their projects are commented out in
`playwright.config.ts`), so the marketing UI, product public-sanity, product
matrix/role contracts, and product roles e2e do not run in the default suite.
Re-enable a group by uncommenting its project; the plan for each group documents
which project to uncomment and the specs it covers.

**Opt-in monitoring** (`npm run test:monitoring`, i.e. `MONITORING_ENABLED=true`):
this adds the `monitoring` project — 50 live availability checks against Govmap
and Ofek (govmap 25 + ofek 25). It is **never** part of the default suite, so an
outage at Govmap or Ofek can't break the PR gate. Instead it runs on the
scheduled **External API Monitoring** workflow and alerts through an
auto-managed GitHub issue plus Slack. With monitoring enabled, the total is
**53** (default 3 + monitoring 50).

## Sanctioned skips (never failures)

- **Group 7 (external API monitoring):** a spec skips when the govmap.gov.il edge
  serves an HTML block/challenge page to the runner (a geo/bot block — e.g. a CI
  runner outside Israel). A per-worker canary in
  `tests/monitoring/support/availability.ts` detects it and skips via each
  `beforeEach`. A **real** break — a 5xx, a connection error, or a real-but-wrong
  (non-HTML) payload — still fails; that failure is the alert.
- **Group 2 (public sanity) — disabled:** would skip only during a genuine dev
  outage (dev gateway or password gate down, no UI token extractable). A token
  that *is* observed but comes back malformed is a real regression and fails.
- **Group 4 (roles e2e) — disabled:** each role skips on its own — no
  `<ROLE>_PHONE`/`_OTP_CODE` credential (product-setup) or no saved session
  (product-authenticated).

Everything else must pass. See `CLAUDE.md` → "Conventions" for the full policy.

## PDFs

A PDF of every plan (and of this index) lives in [`pdf/`](pdf/). Regenerate them
after editing any plan:

```bash
npm run test-plans:pdf   # renders docs/test-plans/*.md → docs/test-plans/pdf/*.pdf
```

The conversion runs in two steps: Markdown → HTML via `marked`, then HTML → PDF
via Playwright's headless Chromium. No external tool is required.
