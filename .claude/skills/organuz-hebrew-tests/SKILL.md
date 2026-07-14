---
name: organuz-hebrew-tests
description: The language split in the Organuz Playwright specs — the report layer (describe/test titles, Allure epic/feature/story/step labels, comments, assertion messages) is ENGLISH, while Hebrew remains only in DOM assertions/selectors, expected on-page content, and data constants that must match the live Hebrew (RTL) site/app. Use when adding/editing specs to keep that split, or when translating a leftover Hebrew report string.
---

# Organuz spec language split (report layer = English, DOM layer = Hebrew)

The Organuz sites are Hebrew (RTL), so DOM assertions and selectors are Hebrew and always will be — the page objects and data files match Hebrew strings (e.g. `HomePage.ts`, `tests/constants.ts`, `tests/product/matrix/matrix-constants.ts`). The **report layer** — the human-readable text that surfaces in the Allure report and the test output — is **English** across the suite.

> **History:** the report layer used to be Hebrew for ~70% of the spec files. It was translated to English everywhere; only the DOM / selector / data layer stays Hebrew. So if you see a Hebrew `describe`/`test` title or an Allure label, treat it as a leftover to translate to English — not a convention to match.

## What is English vs. what stays Hebrew

**English** (report-visible):
- `test.describe(...)` and `test(...)` **titles**
- Allure **`allureEpic` / `allureFeature` / `allureStory`** values and **`allureStep`** labels
- **comments** (doc-comments + inline)
- **assertion messages** — the 2nd arg to `expect(value, 'message')`, plus `test.skip(cond, 'reason')` reasons and `throw new Error('...')` messages

**Hebrew** (must stay — it matches the live Hebrew site/app):
- **selector / locator arguments**: `getByText`, `getByRole({ name })`, `getByLabel`, `getByPlaceholder`, `locator`, `filter({ hasText })`, and regex locators (e.g. `/למה/`)
- **expected on-page content** in assertions: `toContainText`, `toHaveText`, `toHaveAttribute`, `toHaveTitle`, …
- **data constants / fixture values**: e.g. `matrix-constants.ts` property-type names (`'בית פרטי'`), `tests/constants.ts` (`AgentRoles`, `FaqQuestions`, `ContactData`), and registration data (`firstName: 'בדיקה'`)

**Also unchanged** (code + machinery):
- all code: imports, identifiers, variable/function names, control flow
- **`@tags`** (`@ui`, `@product`, `@sanity`, `@other-smoke`, `@en`, …) — grep filters depend on them
- **`allureSeverity`** values (`blocker` / `critical` / `normal` / …) — Allure enum values
- data ids/enums (`CALC-ROOF-022`, `ARENA_TYPE_MAIN`, persona ids `customer`/`consultant`/`company`)
- URLs, hosts, tokens, regex bodies

## Where each layer lives
- **Report layer (English):** every spec file — `tests/ui/**`, `tests/product/**`, `tests/organuz-api/**`, `tests/monitoring/**`, `tests/agent/**`.
- **Hebrew (DOM/data only):** the page objects (`src/pages/HomePage.ts`, `BlogPage.ts`), the product support helpers (`tests/product/support/ProductAppPage.ts`, `ProductFlows.ts`, `RegistrationFlows.ts`, `env-gate.ts`), and the data files (`tests/constants.ts`, `tests/product/matrix/matrix-constants.ts`). The Hebrew there is selectors and data, not report text — leave it.

## Glossary (English → Hebrew)
Reference for the Hebrew DOM/selector strings, and for translating any leftover Hebrew report text back to its English label:

| English | Hebrew |
| --- | --- |
| Homepage | דף הבית |
| Hero section | אזור הכותרת הראשית |
| Heading / Subtitle | כותרת / כותרת משנה |
| Section heading | כותרת מקטע |
| Navigation / Header | ניווט / כותרת עליונה |
| Header CTA | כפתור קריאה לפעולה בכותרת |
| Agents / Agent roster | סוכנים / מצבת הסוכנים |
| Projects | פרויקטים |
| FAQ | שאלות נפוצות |
| Blog | בלוג |
| Contact form / Field presence | טופס יצירת קשר / נוכחות שדות |
| Product app / Public calculator | אפליקציית המוצר / מחשבון ציבורי |
| app shell / signed-out state | מעטפת האפליקציה / מצב מנותק |
| login entry / secure origin | נקודת כניסה להתחברות / מקור מאובטח |
| token / persona / role | טוקן / פרסונה / תפקיד |
| customer / consultant / company | לקוח / יועץ / חברה |
| data contract | חוזה נתונים |
| Verify that … (allureStep) | לוודא ש… |

## Adding or editing a spec
1. Write all four report-visible categories (titles, Allure labels, comments, assertion messages) in **English**.
2. Keep selectors, expected on-page content, and data values in **Hebrew** — they match the live UI, and translating them breaks the test.
3. Run `npx tsc --noEmit`, then the relevant project. Hebrew text (in selectors/data) triggers only **cSpell "Unknown word"** editor warnings — harmless, not TS/lint errors; ignore them.
4. Changing a test **title** resets that test's Allure history / `testCaseId` (new trend key). That is expected for a language change; titles are not used as grep filters (tags are).

## Related skills
`organuz-product-en` (the English product-app specs), `test-suite-parity` (keep the same specs green locally and on CI), and the per-group skills (`ui-sanity-tests`, `product-public-sanity`, `product-matrix-contract`, `product-roles-e2e`).
