---
name: product-matrix-contract
description: Offline data-contract specs for the property-characterization matrix and product roles (tests/product/matrix). Network-free assertions over checked-in fixtures split across data files behind the e2e-matrix.data barrel. Use when editing the matrix/personas/scenarios data or its contract tests.
---

# Product matrix & role data contracts — `tests/product/matrix/**`

> **⚠️ CURRENTLY DISABLED.** The `product` project is commented out in `playwright.config.ts`, so these specs do **not** run in the default suite right now. The spec files under `tests/product/matrix/**` are retained — re-enable by uncommenting the `product` project. While disabled, `npx playwright test tests/product/matrix --project=product` reports "no tests". The how-to/debug content below stays valid once re-enabled.

**Network-free** specs (import `test`/`expect` from `@playwright/test`, no fixtures/browser) that assert the shape of the checked-in matrix data. Part of the `product` project. 23 tests when enabled.

## Data files (split; re-exported through the barrel)
- `matrix-types.ts` — types/interfaces (leaf).
- `matrix-constants.ts` — enums, labels, `RUNTIME_ONLY_FIELDS`, `QUOTABLE_MINIMUM_PANEL_COUNT`.
- `product-personas.data.ts` — `PRODUCT_PERSONAS` (customer, consultant, company, company-employee).
- `property-scenarios.data.ts` — `MAIN_E2E_SCENARIOS` + negative/UI-only/Ramot + legacy.
- `e2e-matrix.data.ts` — **barrel**: `export *` from the above + the cross-cutting aggregations (`ALL_MATRIX_SCENARIOS`, `EXPECTED_PERSONA_SCENARIO_COUNT` pinned to `48`, etc.). Keep it an acyclic DAG (types is the only leaf everyone imports; the barrel imports downward only).

## Spec files
- `product-matrix-data-contract.spec.ts` (13) — runtime-only fields excluded, matrix size, `CALC-ROOF` ids, property/polygon/roof coverage, empty roof placeholders, UI-only scenario, unique ids, arena consistency, negative < `QUOTABLE_MINIMUM_PANEL_COUNT`, elevated-rights, panel-count↔mode.
- `product-roles-contract.spec.ts` (10) — the three sign-in roles' post-funding destination, quotations/pricing/management rights, identity.

## Rules
- Assert **invariants and relationships**, not restatements — pin counts to independent literals (e.g. `EXPECTED_PERSONA_SCENARIO_COUNT = 48`) so drift trips the test instead of comparing a value to itself.
- Keep runtime-only fields (`projectId`, `token`, …) out of committed data; the roof-payload placeholders must be empty `{}`.
- These need no network/secrets, so they always run (never skip).

## Run
```bash
npx playwright test tests/product/matrix --project=product
```
Bump the product count in CLAUDE.md + `test-suite-parity` when adding tests. The live role e2e that consumes these roles lives in `product-roles-e2e`.
