/**
 * Product app — per-role personal-area sanity flows (dev).
 *
 * Extends flows/roles.spec.ts (which only checks the header role label + personal-area
 * nav visibility). Each role resumes its session and, in a single journey, exercises:
 *   1. Identity      — the header user menu shows the correct role.
 *   2. User menu     — exposes "איזור אישי" (personal area) + "התנתק" (logout).
 *   3. Navigation    — the personal area lists the role's distinctive sidebar entries.
 *   4. Role pages    — each role-specific pricing/management page opens and renders.
 * (Sign-out lives in role-logout.spec.ts — it uses its own login so it can't invalidate
 *  the shared session this spec reuses.)
 *
 * Each role resumes the session the product-setup project logged in once, so no
 * per-spec login is needed (dev rate-limits OTP sends per phone).
 * Selectors/URLs mapped live via the Playwright MCP; see the organuz-product-e2e skill.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true + persona OTP (dev fixed OTP 7777). consultant
 * and company use their own phone numbers; the customer number is OTP-rate-limited easily,
 * so its page set is intentionally minimal (its wizard is covered by full-flow.spec.ts).
 */
import { test, expect } from '../support/fixtures';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

interface RolePage {
  nav: string;         // personal-area sidebar entry to click
  url: RegExp;         // URL it navigates to
  markers: RegExp[];   // texts unique to the opened page
}

interface RoleArea {
  persona: ProductPersonaId;
  label: string;       // display name for the test
  roleName: RegExp;    // header user-menu role label
  nav: string[];       // distinctive personal-area entries for this role
  content: RegExp[];   // texts expected on the personal-area landing (my-offers)
  pages: RolePage[];   // role-specific pages reachable from the personal area
}

// Common personal-area chrome, confirmed live for consultant + company.
const QUOTA = /נותרו לך עוד .*איתורי נכס/;
const SORTING = /סידור הצעות לפי/;

const ROLE_AREAS: readonly RoleArea[] = [
  {
    persona: 'customer',
    label: 'user (property owner)',
    roleName: /בעל נכס/,
    nav: ['ההצעות שלי'],
    content: [], // customer number is OTP-rate-limited; keep its assertions minimal
    pages: [], // customer's personal area is just "my offers"; its wizard is in full-flow.spec.ts
  },
  {
    persona: 'consultant',
    label: 'consultant',
    roleName: /יועץ/,
    nav: ['ההצעות שלי', 'הצעות שגריר', 'בדיקת נכס'],
    content: [QUOTA, SORTING, /אלו הנכסים שלך/],
    pages: [
      { nav: 'הצעות שגריר', url: /\/pricing\/ambassador-offers/i, markers: [/אלו הנכסים שהגיעו דרכך/] },
    ],
  },
  {
    persona: 'company',
    label: 'contractor (EPC)',
    roleName: /קבלן|חברת EPC/,
    nav: ['ההצעות שלי', 'מחירון קבלני', 'מחירון יזמי', 'ניהול פרטי החברה'],
    content: [QUOTA, SORTING, /אלו ההצעות שלך/],
    pages: [
      { nav: 'מחירון קבלני', url: /\/pricing\/pricing-contractor\//i, markers: [/מערכות סולאריות/, /סימולטור מחיר/] },
      { nav: 'מחירון יזמי', url: /\/pricing\/pricing-entrepreneur/i, markers: [/סימולטור השקעה/] },
      { nav: 'ניהול פרטי החברה', url: /\/pricing\/management/i, markers: [/ברוכים הבאים ל/, /שמירה כטיוטה/] },
    ],
  },
];

test.describe('Product role personal areas (dev)', { tag: ['@product', '@sanity', '@e2e', '@roles'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to run the authenticated role flows.');
  // Login + OTP + navigation make these slow.
  test.describe.configure({ timeout: 180_000 });

  for (const role of ROLE_AREAS) {
   test.describe(role.label, () => {
    test.use({ authRole: role.persona });
    test(`personal area, role pages, and logout`, { tag: '@critical' }, async ({ page, product }) => {
      await allureEpic('Product app');
      await allureFeature('Role personal areas');
      await allureStory(role.label);
      await allureSeverity('critical');

      await product.resumeSession(role.persona);

      // 1. Identity — the header shows the correct role.
      await expect(page.getByRole('button', { name: role.roleName }).first()).toBeVisible();

      // 2. User menu exposes the personal area + logout, then open the personal area.
      await product.openUserMenu();
      await expect(page.getByRole('menuitem', { name: 'איזור אישי' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'התנתק' })).toBeVisible();
      await page.getByRole('menuitem', { name: 'איזור אישי' }).click();
      await expect(page).toHaveURL(/\/pricing\//i);

      // 3. Personal-area navigation — the role's distinctive sidebar entries are present.
      for (const entry of role.nav) {
        await expect(page.getByRole('button', { name: entry }).first(), `"${entry}" visible for ${role.label}`).toBeVisible();
      }

      // 3b. Personal-area chrome — quota, sorting, and the role's landing heading.
      for (const marker of role.content) {
        await expect(page.getByText(marker).first(), `personal-area content for ${role.label}`).toBeVisible();
      }

      // 4. Role-specific pages open and render their distinctive content.
      // (Sign-out is covered independently by role-logout.spec.ts with its own login, so
      //  this reused-session spec never logs out and can't invalidate the shared session.)
      for (const rolePage of role.pages) {
        await product.openSidebarEntry(rolePage.nav);
        await expect(page, `${rolePage.nav} navigates to its page`).toHaveURL(rolePage.url);
        for (const marker of rolePage.markers) {
          await expect(page.getByText(marker).first(), `${rolePage.nav} renders`).toBeVisible();
        }
      }
    });
   });
  }
});
