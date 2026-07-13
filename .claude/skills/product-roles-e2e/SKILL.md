---
name: product-roles-e2e
description: Live per-role browser e2e — the product-setup project authenticates each role once (saved storageState) and the product-authenticated project resumes it for read-only role checks under tests/product/flows. Skip-safe without per-role credentials. Use when adding or fixing the live role specs, auth.setup, or the two projects.
---

# Live per-role e2e — `product-setup` → `product-authenticated`

Live browser coverage that signs each product role into the dev app once and reuses the session. **Skip-safe:** without per-role credentials (or a saved session), the specs skip so the suite stays green. 10 role specs + 3 setup tests today.

For the deeper auth/session/personal-area design (login UI, OTP, `resumeSession`, roles), see the **`organuz-product-roles`** skill — this skill is the test-group how-to for the two projects.

## Shape
- **`product-setup`** → `tests/product/support/auth.setup.ts`: for each role in `AUTH_ROLES` (customer, consultant, company) logs in via `product.loginAs(role)` (phone + fixed dev OTP) and saves `storageState` to `playwright/.auth/product-<role>.json` (gitignored). Skips a role when `<ROLE>_PHONE` is unset or the dev app/OTP is down — no session written.
- **`product-authenticated`** → `tests/product/flows/**` (`dependencies: ['product-setup']`): specs set `test.use({ authRole })`; the `product` fixture loads the saved `storageState`; `resumeSession()` restores it (or the test skips). Read-only checks only — no logout/writes, so a shared session is never invalidated.

## Skip-safe pattern
```ts
async function resumeOrSkip(product, role) {
  test.skip(!hasSavedSession(role), `no saved session for "${role}"`);
  try { await product.resumeSession(role); }
  catch (e) { test.skip(true, `"${role}" session could not resume — ${e.message}`); }
}
```

## Config & CI (parity)
- Two projects in `playwright.config.ts`; the plain `product` project sets `testIgnore: 'tests/product/flows/**'`.
- The CI matrix names **`product-authenticated`** only (its `dependencies` pull in `product-setup` — don't shard setup separately or it double-logs-in).
- Per-role secrets: `<ROLE>_PHONE` / `<ROLE>_OTP_CODE` for `CUSTOMER`/`CONSULTANT`/`COMPANY`, wired in the workflow `env:`; unset ⇒ that role skips.

## Run
```bash
npx playwright test --project=product-authenticated   # runs product-setup first
```
Without creds: all 13 skip (green). Keep counts in CLAUDE.md + `test-suite-parity` in sync.
