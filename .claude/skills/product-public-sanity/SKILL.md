---
name: product-public-sanity
description: Public (no-login) dev-calculator sanity tests under tests/product/api — token-sanity and public-app-sanity. They open the dev app through the password gate and skip on a genuine dev outage while failing on real product regressions. Use when adding or fixing public product checks.
---

# Product public sanity — `tests/product/api/**`

Live checks of the dev calculator that need **no role login** — only the dev password-gate (`PRODUCT_PLATFORM_PASSWORD`). Part of the `product` project (no grep). 8 tests today.

## Files
- `tests/product/api/token-sanity.spec.ts` (3) — extracts the UI token off the wire with `TokenInterceptor`, then checks token shape, config-bundle parity, and body-only-over-HTTPS transport.
- `tests/product/api/public-app-sanity.spec.ts` (5) — shell loads, fresh visitor is signed out, header sign-in/register entry visible, HTTPS on the configured dev host, at least one token-bearing backend call on load.

## The skip-vs-fail contract
- **Environmental outage is not a product bug.** `ProductFlows.openCalculator()` / the token extraction throw `AppUnavailableError` (or capture no token) when the dev app/gateway is down; the spec turns that into `test.skip(...)`, never a failure.
- **Real regressions fail.** A malformed/drifted token, a missing login entry, a wrong host, or no backend call is a genuine failure.
- Pattern: wrap `openCalculator()` in an `openOrSkip` helper that `test.skip`s on `AppUnavailableError` and rethrows anything else.

## Gotchas
- The login **entry point** is the header `הרשמה / כניסה` CTA button — the phone/email field only appears after opening it. Assert the CTA, not the field.
- Never `waitForLoadState('networkidle')` — the map iframe keeps the network busy. Use `openCalculator()` / `expect` auto-waiting.
- `isAppShellLoaded()` keys on calculator content (property-type buttons / step tracker), not the header, which renders even when the backend is down.

## Run
```bash
npx playwright test tests/product/api --project=product --workers=1
```
Needs `PRODUCT_PLATFORM_PASSWORD` in the gitignored `.env` (dev gate). On a dev outage these skip; bump the product count in CLAUDE.md + `test-suite-parity` when adding tests. See also `organuz-product-e2e`.
