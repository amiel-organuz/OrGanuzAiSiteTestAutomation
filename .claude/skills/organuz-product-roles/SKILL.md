---
name: organuz-product-roles
description: Per-role authentication, session reuse, and personal-area coverage for the Organuz product app (dev). Covers the product-setup storageState flow, resumeSession, the customer/consultant/company roles and their personal areas, and the role specs under tests/product/flows. Use when writing/fixing per-role product tests, the auth setup, or the product fixtures.
---

# Organuz product roles & sessions

Three roles authenticate against the dev product app; each per-role spec reuses one saved
session. For the login UI, the dev password gate, the calculator wizard, and driving with
the Playwright MCP, see the **organuz-product-e2e** skill.

## Roles
| Role | Persona id | Phone (dev, OTP `7777`) | Header label | Personal-area landing |
| --- | --- | --- | --- | --- |
| customer | `customer` | `0510000000` | `בעל נכס` | my-offers (minimal — number is easily OTP-rate-limited) |
| consultant | `consultant` | `0569875332` | `יועץ` | `אלו הנכסים שלך` |
| company | `company` | `0531415667` | `קבלן…, חברת EPC` | `אלו ההצעות שלך` |
| company-employee | `company-employee` | (none) | — | cannot sign in (no phone) |

Credentials are Restricted — only in the gitignored `.env` as `<ROLE>_PHONE` / `<ROLE>_OTP_CODE`.

## Per-role sessions (storageState reuse)
Dev rate-limits OTP sends per phone, so each role logs in **once per run** and every spec
reuses that session:
- The `product-setup` project (`tests/product/support/auth.setup.ts`) logs each role in and
  saves `storageState` to `playwright/.auth/product-<role>.json` (gitignored). The `product`
  project has `dependencies: ['product-setup']`, so it runs automatically first.
- Per-role specs wrap each role in its own describe and resume the session:
  ```ts
  test.describe(role, () => {
    test.use({ authRole: role });          // maps to the saved storageState (fixtures.ts)
    test('…', async ({ product }) => {
      await product.resumeSession(role);    // opens the calculator on the restored session
      // …assertions…
    });
  });
  ```
- `resumeSession()` **skips with a reason** if the saved session is missing (setup skipped on
  OTP cooldown). `ProductAppPage.login()` throws `OtpUnavailableError` on a rate-limit; keep
  test-lifecycle logic in `ProductFlows` — it turns that (and a missing session) into `test.skip`.
- Sign-out is isolated in `role-logout.spec.ts`, which does its **own** `loginAs`, so logging
  out can't invalidate the shared sessions the other specs reuse.
- Specs run fully parallel (`fullyParallel`, 4 workers); reused sessions are read-only, so it's safe.
- To force a fresh login, delete `playwright/.auth/product-*.json`.

## Personal areas (confirmed live via the Playwright MCP)
Header user-menu button (accessible name `<name>, <role>`) → menu with `איזור אישי` (personal
area) + `התנתק` (logout). `product.openPersonalArea()` lands on `…/pricing/my-offers`;
`openSidebarEntry(name)` clicks a sidebar button. Logout returns to `…/calculator/address`
(login re-gated). Common chrome: quota line `נותרו לך עוד N איתורי נכס` + sort `סידור הצעות לפי:`.

| Role | Sidebar entries | Role-specific pages |
| --- | --- | --- |
| customer | `ההצעות שלי` | (property wizard) |
| consultant | `ההצעות שלי`, `הצעות שגריר`, `בדיקת נכס` | `הצעות שגריר` → `/pricing/ambassador-offers`; `בדיקת נכס` → `/calculator/address` |
| company | `ההצעות שלי`, `בדיקת נכס והפקת הצעה`, `מחירון קבלני`, `מחירון יזמי`, `ניהול פרטי החברה` | `מחירון קבלני` → `/pricing/pricing-contractor/<id>/solar` (system-type tabs + `סימולטור מחיר`); `מחירון יזמי` → `/pricing/pricing-entrepreneur` (`סימולטור השקעה`); `ניהול פרטי החברה` → `/pricing/management` (10-step form + `שמירה כטיוטה`) |

## Role specs (`tests/product/flows/`, gated by `PRODUCT_E2E_ENABLED`)
- `roles.spec.ts` — identity (header role label) + role-appropriate personal area.
- `role-areas.spec.ts` — user menu, sidebar nav, role-specific pricing/management pages.
- `role-session.spec.ts` — calculator shell, reload persistence, deep-link.
- `role-sanity.spec.ts` — 10-point per-role sanity battery (identity, auth, calculator, area, deep-link).
- `role-logout.spec.ts` — sign-out, with its own login (isolated).
- `api/role-backend.spec.ts` — backend-call health: JSON over HTTPS, no 5xx.

All except `role-logout` resume a saved session. Reusable flows (`resumeSession`, `loginAs`,
`openPersonalArea`, `openSidebarEntry`, `logout`) live on `ProductFlows`; add new named flows
there, not in specs.
