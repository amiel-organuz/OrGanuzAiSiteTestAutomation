/**
 * Product app — per-role session & shell sanity (dev).
 *
 * Complements roles.spec.ts / role-areas.spec.ts (identity, nav, role pages, logout)
 * with the authenticated *session* behaviour, per role, in a single login each:
 *   1. Auth      — the public login CTA disappears once signed in.
 *   2. Shell     — the post-login calculator (property-type entry + step tracker) renders.
 *   3. Persistence — a full page reload keeps the session ("זכרו אותי").
 *   4. Deep link — navigating straight to /pricing/my-offers lands in the role's area.
 *
 * Each role resumes the session the product-setup project logged in once, so no
 * per-spec login is needed (dev rate-limits OTP sends per phone).
 * Selectors/URLs mapped live via the Playwright MCP; see the organuz-product-e2e skill.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true + persona OTP (dev fixed OTP 7777).
 */
import { test, expect } from '../support/fixtures';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

interface RoleSession {
  persona: ProductPersonaId;
  label: string;      // display name for the test
  roleName: RegExp;   // header user-menu role label
  primaryNav: string; // a personal-area entry every instance of this role has
}

const ROLES: readonly RoleSession[] = [
  { persona: 'customer', label: 'user (property owner)', roleName: /בעל נכס/, primaryNav: 'ההצעות שלי' },
  { persona: 'consultant', label: 'consultant', roleName: /יועץ/, primaryNav: 'ההצעות שלי' },
  { persona: 'company', label: 'contractor (EPC)', roleName: /קבלן|חברת EPC/, primaryNav: 'ההצעות שלי' },
];

test.describe('Product role session sanity (dev)', { tag: ['@product', '@sanity', '@e2e', '@roles', '@session'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to run the authenticated session flows.');
  test.describe.configure({ timeout: 180_000 });

  for (const role of ROLES) {
   test.describe(role.label, () => {
    test.use({ authRole: role.persona });
    test(`stays signed in across reload and deep-links to its area`, { tag: '@critical' }, async ({ page, product }) => {
      await allureEpic('Product app');
      await allureFeature('Role session');
      await allureStory(role.label);
      await allureSeverity('critical');

      await product.resumeSession(role.persona);

      const loginCta = page.getByRole('button', { name: /הרשמה\s*\/\s*כניסה|הרשמה/ });

      // 1. Auth — the public login entry point is gone once signed in.
      await expect(loginCta, 'login CTA still present after login').toHaveCount(0);

      // 2. Shell — the post-login calculator renders (property-type entry + step tracker).
      // Every role lands on /calculator/address with the property-type buttons.
      await expect(page.getByRole('button', { name: /בית פרטי/ }).first()).toBeVisible();
      await expect(page.getByRole('list', { name: 'התקדמות השלבים' })).toBeVisible();

      // 3. Persistence — a full reload keeps the session (זכרו אותי).
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await expect(loginCta, 'session lost after reload').toHaveCount(0);

      // 4. Deep link — navigating straight to the personal area lands in the role's area.
      await page.goto('/pricing/my-offers');
      await expect(page).toHaveURL(/\/pricing\//i);
      await expect(page.getByRole('button', { name: role.primaryNav }).first()).toBeVisible();
    });
   });
  }
});
