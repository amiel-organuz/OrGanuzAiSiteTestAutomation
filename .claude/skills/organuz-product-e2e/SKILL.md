---
name: organuz-product-e2e
description: Drive or debug the Organuz product calculator (energy/dev app) end-to-end — dev password gate, phone+OTP login, and the multi-step property-characterization wizard. Use when writing/fixing tests/product/** specs or ProductAppPage, or when exploring the dev app with the Playwright MCP.
---

# Organuz product app E2E

The product app is a Hebrew (RTL) Vite SPA. Tests live in `tests/product/**` (Playwright project `product`, baseURL = `config.app.baseUrl`, selected by `QA_TARGET_ENV`, default **dev** = `https://dev1.app.organize.organuz.com`). Page object: `tests/product/support/ProductAppPage.ts`. Env gate helper: `tests/product/support/env-gate.ts`.

## Environments
- **dev** `dev1.app.organize.organuz.com` · **test** `test.organuz.flamiingo.com` · **prod** `energy.organuz.com`. Map lives in `config.json → environments`.
- Dev/Test sit behind a **shared password gate** (single `סיסמה` field + `כנס` button) before the app loads; prod has none. Password `PRODUCT_PLATFORM_PASSWORD` in the gitignored `.env` (Restricted — from the Organuz Environments doc). Gate success redirects to `…/calculator/address`.

## Login (phone + OTP)
Credentials are Restricted; they live only in the gitignored `.env`. Dev customer = phone `0510000000`, **fixed OTP `7777`** (not a live SMS). Company `0531415667`, consultant `0569875332`, all OTP `7777`. `COMPANY_EMPLOYEE` has no phone.

Flow (all Hebrew accessible names):
1. Click `הרשמה / כניסה` to open the login dialog (heading `התחברות`).
2. Fill `textbox "מספר הטלפון הנייד שלך"` with the phone, click `שלחו לי קוד אימות לנייד`.
3. OTP step (heading `הזנת קוד אימות`) has **4 single-digit textboxes** — fill each with one digit of `7777`.
4. Click `אישור והתחברות`. Success: header shows the user (e.g. `אודי כהן, בעל נכס`) + status `ההתחברות עברה בהצלחה!`.

## Calculator wizard (the "characterization" flow)
A 7-step tracker (`list "התקדמות השלבים"`). Heavy lifting is done by AI agents (Solara maps the roof, Kelvin analyses it) — most steps just need the primary **continue button `בוא נמשיך`**. Steps confirmed via the Playwright MCP:

1. **`/calculator/address` — איתור הנכס:** pick a property-type button (`בית פרטי` / `בניין מגורים` / `מבנה מסחרי` / `מבנה חקלאי` / `מבנה ציבורי`); type a Hebrew address into the `combobox` and pick from the `listbox` options (English addresses match loosely — prefer Hebrew, e.g. `הברזל 32 תל אביב`). Then `בוא נמשיך` (disabled until type+address chosen).
2. **`/calculator/address/get-address`:** confirmation `מצאנו את הנכס המבוקש!`; the pin is auto-placed. Click `זהו הנכס המבוקש, אפשר להמשיך` → shows `טוען...` while the satellite roof scan runs (~10–20s), then redirects to `/calculator/roof/<roofId>/marking`. **The `<roofId>` in the URL is a runtime id** (capture it).
3. **`/roof/<id>/marking` — סימון השטח:** AI auto-detects the roof boundary (`הבינה המלאכותית זיהתה את גבול הגג שלך אוטומטית`). Just `בוא נמשיך`.
4. **`/roof/<id>/placement-elements`:** mark roof obstacles (water heaters/AC/chimneys) — optional; `בוא נמשיך` to skip.
5. **(not yet mapped):** roof surface type (concrete/tiles/…), extra questions, results, and quotations. When extending, drive them with the Playwright MCP and update this file + `ProductAppPage`.

Shortcut on every step: `הזמן דוח סולארי עכשיו - הסוכנים שלנו יעשו עבורך הכל` hands the whole flow to Organuz's agents — do NOT click it in tests (it creates a real lead).

## Driving with the Playwright MCP
Load tools once: `ToolSearch "select:mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_click,mcp__playwright__browser_type,mcp__playwright__browser_wait_for"`. Navigate → snapshot → act by ref. Refs change after navigation/login, so re-snapshot. The map is an `iframe` (Israel Mapping Center); don't try to read map internals. Wait on `טוען...` going hidden between heavy steps.

## Reusable flows (keep specs short)
Import `test`/`expect` from `tests/product/support/fixtures.ts` to get the `product` fixture (a `ProductFlows`):
- `product.openCalculator()` — goto `/` + unlock the dev gate (used by the smoke `beforeEach`).
- `product.loginAs('customer'|'company'|'consultant')` — phone+OTP login from env creds (login also opens the calculator + unlocks the gate internally).
- `product.characterizeToRoofType(scenario)` — property type + address → roof scan → auto boundary → obstacles → roof-type step; returns `{ projectId, quotationId(roofId) }`.

`ProductFlows` wraps `ProductAppPage` (the low-level step methods). Add new named flows there, not in specs.

## Gotchas
- Never use `waitForLoadState('networkidle')` — the embedded map iframe keeps the network perpetually busy. Use `domcontentloaded` or `expect` auto-waiting.
- **Phone field:** use `.fill()` (a single set) — it has an input mask that mangles char-by-char typing. **Address combobox:** the opposite — use `pressSequentially` so the autocomplete fires; then pick the first `option`.
- **OTP rate-limiting:** dev limits OTP sends per phone. Repeated logins in a short window (exploration + reruns) stop the OTP step from rendering (`הזנת קוד` never appears) until a cooldown. Don't hammer one number; the login is idempotent (skips if already authenticated) and resends once. Different personas use different numbers.
- Persona `company-employee` cannot log in (no phone in the doc). The characterization/property flow is **customer-only** — `consultant`/`company` land on different home screens (no property-type buttons).
- The full 50-test matrix (`PRODUCT_E2E_ENABLED=true`) creates real projects/quotations on dev; the credential-free `tests/product/smoke` suite is safe and always runnable.
