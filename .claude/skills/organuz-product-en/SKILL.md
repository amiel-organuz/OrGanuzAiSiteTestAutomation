---
name: organuz-product-en
description: Write, run, and debug the ENGLISH-version sanity e2e tests for the Organuz product app (the 6-step calculator wizard site) — the language switch, the EN page-object helpers, the public EN wizard spec, and the per-role (customer/advisor/company) EN specs. Use when editing tests/product/en/**, tests/product/flows/roles-en.spec.ts, or the language-switch code in ProductAppPage/ProductFlows.
---

# Organuz product app — English (EN) version tests

> **⚠️ These specs are CURRENTLY DISABLED** — the EN public sanity spec runs under the
> `product` project and the EN role spec under `product-authenticated`, and **both projects are
> commented out in `playwright.config.ts`** (together with `product-setup`). So the English
> product specs under `tests/product/en/**` and `tests/product/flows/roles-en.spec.ts` **do not
> run in the default suite** right now. The spec files are kept; re-enable by uncommenting the
> `product` / `product-setup` / `product-authenticated` project blocks. All the content below
> stays valid once re-enabled.

The product app (the 6-step "characterization" calculator wizard — see the
**organuz-product-e2e** skill) is a Hebrew (RTL) SPA by default, but it ships a full
**English (LTR) UI**. These tests exercise that English version. They complement the
Hebrew product specs; the marketing site's own EN toggle is a *different* thing and is
**not** what this skill covers.

## How the app exposes English
- The header carries a **language menu**: a trigger button whose accessible name is the
  **current** language (`עברית` while in Hebrew). Opening it exposes an **`English`**
  option. Selecting it switches the whole app.
- On switch: `document.documentElement` becomes **`lang="en" dir="ltr"`**, the title
  becomes `Organuz | …`, and the choice **persists** in
  `localStorage["organuz_selected_language"]` (a wrapped `{"data":"en",…}` value), so it
  survives reloads within a run. It round-trips he↔en.
- Confirmed English strings (stable, safe to assert):
  - primary continue button **`Let's continue`** (Hebrew `בוא נמשיך`)
  - step tracker list, `aria-label` **`Wizard progress`** (Hebrew `התקדמות השלבים`)
  - signed-out entry **`Login / Register`** (Hebrew `הרשמה / כניסה`)
  - `Order Your Solar Report Now …` (the agent-handoff shortcut — never click it; it
    creates a real lead)
- **Not** reliably assertable: the `Search by Address` / `Search by Block/Plot` labels
  render as tabs, not always as `button` role, and the property-type labels
  (Private House, …) render conditionally. Prefer the stable strings above.

## The code
- **`ProductAppPage.switchToEnglish()`** — opens the language menu (`getByRole('button',
  { name: 'עברית' })`), clicks the `English` option, waits for `html[lang="en"]`.
  Idempotent (no-op when already English). `ProductAppPage.currentLanguage()` reads
  `<html lang>`. Exposed on the high-level flow as **`product.switchToEnglish()`**.
- **`ProductAppPage.isLoggedIn()`** regex matches the signed-out entry in **both**
  languages (`… | login | register`), so `isAuthenticated()` is correct in English too.
  Don't narrow it back to Hebrew-only.
- **`login()` already-on-calculator guard** — `login()` skips its opening `goto('/')` +
  gate-unlock when the page is already on a `…/calculator/…` route (as in
  `product-setup`, which calls `openCalculator()` first). Once the dev gate is unlocked, a
  second `goto('/')` lands on a bare `/` that no longer auto-routes to `/calculator`, so
  the shell guard would wrongly report the backend as down and skip. Keep this guard.

## The specs
- **`tests/product/en/public-app-en-sanity.spec.ts`** (project `product`, tags
  `@product @sanity @en`) — no-login EN wizard sanity: switch to English, then assert
  LTR, the `Wizard progress` tracker, the `Let's continue` control, signed-out state, the
  language persists across a reload, and HTTPS on the configured host. Skip-on-outage like
  the Hebrew `public-app-sanity` (AppUnavailableError → `test.skip`, never a failure).
  Runs with just the `PRODUCT_PLATFORM_PASSWORD` gate secret. **6 tests, always runnable.**
- **`tests/product/flows/roles-en.spec.ts`** (project `product-authenticated`, tags
  `@product @roles @e2e @en`) — per-role EN sanity for **customer / advisor (consultant) /
  company**: resume the role's saved session, switch to English, assert authenticated +
  `currentLanguage() === 'en'`. **Skip-safe**: a role with no saved session skips with a
  reason (green on CI without per-role secrets). **4 tests.**

## Running & the credential/skip story
- EN public sanity: `npx playwright test tests/product/en --project=product --workers=1`.
- EN roles: `npx playwright test tests/product/flows/roles-en.spec.ts --project=product-authenticated --workers=1`
  (auto-runs the `product-setup` dependency).
- **Not skipping the role tests locally** needs all three roles' phones in the gitignored
  `.env` (`CUSTOMER_PHONE` / `CONSULTANT_PHONE` / `COMPANY_PHONE`; dev OTP is the fixed
  `7777`). With them present, `product-setup` authenticates each role once, saves its
  `storageState`, and the EN (and Hebrew) role specs **run** instead of skipping. The skip
  is purely credential/session-gated, never hardcoded.
- **Gotcha — dev OTP per-phone rate-limit.** `product-setup` sends one real OTP per role;
  dev limits sends per number, so back-to-back runs (or exploration) put a phone into a
  cooldown where the OTP step never renders → `OtpUnavailableError` → the role skips (a
  sanctioned environmental skip). Wait out the cooldown, then a single clean
  `product-setup` run authenticates all three; the saved sessions are then reused (that's
  why the suite logs in once and resumes, rather than logging in per spec).
- Never traverse all 6 wizard steps in these sanity specs — a full traversal creates real
  projects/leads on dev (see organuz-product-e2e). EN coverage here stays at shell/
  language/entry level.

## Related skills
`organuz-product-e2e` (the app, gate, login, wizard), `organuz-product-roles` (the roles,
`product-setup`/`storageState`, personal areas), `test-suite-parity` (keep the EN specs
running identically locally and on CI).
