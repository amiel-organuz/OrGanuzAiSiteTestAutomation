/**
 * Product app — extra per-role sanity battery (dev).
 *
 * Adds 10 focused sanity checks per role on top of roles.spec.ts / role-areas.spec.ts /
 * role-session.spec.ts. Each role resumes the session the product-setup project logged
 * in once (via test.use({ authRole }) + product.resumeSession()), so no per-spec login
 * is needed. The checks run as ordered test.steps in a single authenticated journey:
 *
 *   1.  Identity          — the header user menu shows the correct role label.
 *   2.  Auth              — the public "register / sign in" CTA is gone once signed in.
 *   3.  Calculator landing — every role lands on the calculator address step (/calculator/).
 *   4.  Step tracker      — the calculator progress list ("התקדמות השלבים") renders.
 *   5.  Wizard entry      — the property-type buttons ("בית פרטי") render on the shell.
 *   6.  User menu         — exposes "איזור אישי" (personal area) + "התנתק" (logout).
 *   7.  Personal area     — opens under /pricing/ with the role's primary nav ("ההצעות שלי").
 *   8.  My-offers landing — the personal-area URL resolves to the my-offers route.
 *   9.  Reload persistence — a full reload on the personal area keeps the session.
 *   10. Deep link       — direct-URL routing (calculator → /pricing/my-offers) lands in the area.
 *
 * All checks are customer-safe: the customer number is easily OTP-rate-limited and its
 * personal area is intentionally minimal, so nothing here asserts role-specific content.
 * Selectors/URLs mapped live via the Playwright MCP; see the organuz-product-e2e skill.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true + persona OTP (dev fixed OTP 7777).
 */
import { test, expect } from '../support/fixtures';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

interface RoleSanity {
  persona: ProductPersonaId;
  label: string;      // display name for the test
  roleName: RegExp;   // header user-menu role label
  primaryNav: string; // a personal-area entry every instance of this role has
}

const ROLES: readonly RoleSanity[] = [
  { persona: 'customer', label: 'user (property owner)', roleName: /בעל נכס/, primaryNav: 'ההצעות שלי' },
  { persona: 'consultant', label: 'consultant', roleName: /יועץ/, primaryNav: 'ההצעות שלי' },
  { persona: 'company', label: 'contractor (EPC)', roleName: /קבלן|חברת EPC/, primaryNav: 'ההצעות שלי' },
];

// Selectors shared with the other role specs.
const LOGIN_CTA = /הרשמה\s*\/\s*כניסה|הרשמה/;

test.describe('Product role sanity battery (dev)', { tag: ['@product', '@sanity', '@e2e', '@roles'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to run the authenticated sanity checks.');
  // Login + OTP + the personal-area round trip make these slow.
  test.describe.configure({ timeout: 180_000 });

  for (const role of ROLES) {
   test.describe(role.label, () => {
    test.use({ authRole: role.persona });
    test(`10-point authenticated sanity battery`, { tag: '@critical' }, async ({ page, product }) => {
      await allureEpic('Product app');
      await allureFeature('Role sanity');
      await allureStory(role.label);
      await allureSeverity('critical');

      await product.resumeSession(role.persona);

      const loginCta = page.getByRole('button', { name: LOGIN_CTA });

      // 1. Identity — the header user menu shows the correct role label.
      await test.step('1. header shows the correct role', async () => {
        await expect(page.getByRole('button', { name: role.roleName }).first()).toBeVisible();
      });

      // 2. Auth — the public login entry point is gone once signed in.
      await test.step('2. public login CTA is gone', async () => {
        await expect(loginCta, 'login CTA still present after login').toHaveCount(0);
      });

      // 3. Calculator landing — every role lands on the calculator address step.
      await test.step('3. post-login lands on the calculator', async () => {
        await expect(page).toHaveURL(/\/calculator\//i);
      });

      // 4. Step tracker — the calculator progress list renders.
      await test.step('4. calculator step tracker renders', async () => {
        await expect(page.getByRole('list', { name: 'התקדמות השלבים' })).toBeVisible();
      });

      // 5. Wizard entry — the property-type buttons render on the calculator shell.
      await test.step('5. property-type entry renders', async () => {
        await expect(page.getByRole('button', { name: /בית פרטי/ }).first()).toBeVisible();
      });

      // 6. User menu — exposes the personal area + logout entries.
      await test.step('6. user menu exposes personal area + logout', async () => {
        await product.openUserMenu();
        await expect(page.getByRole('menuitem', { name: 'איזור אישי' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'התנתק' })).toBeVisible();
      });

      // 7. Personal area — opens under /pricing/ with the role's primary nav.
      await test.step('7. personal area opens with primary nav', async () => {
        await page.getByRole('menuitem', { name: 'איזור אישי' }).click();
        await expect(page).toHaveURL(/\/pricing\//i);
        await expect(page.getByRole('button', { name: role.primaryNav }).first()).toBeVisible();
      });

      // 8. My-offers landing — the personal area resolves to the my-offers route.
      await test.step('8. personal area lands on my-offers', async () => {
        await expect(page).toHaveURL(/\/pricing\/my-offers/i);
      });

      // 9. Reload persistence — a full reload keeps the session on the personal area.
      await test.step('9. session persists across reload', async () => {
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await expect(page, 'reload left the personal area').toHaveURL(/\/pricing\//i);
        await expect(loginCta, 'session lost after reload').toHaveCount(0);
      });

      // 10. Deep link — direct-URL routing into the personal area works (no menu click).
      // (Sign-out is covered by role-logout.spec.ts, which uses its own login so it can't
      //  invalidate the shared session this battery resumes.)
      await test.step('10. deep link routes to the personal area', async () => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/calculator\//i);
        await page.goto('/pricing/my-offers');
        await expect(page).toHaveURL(/\/pricing\//i);
        await expect(page.getByRole('button', { name: role.primaryNav }).first()).toBeVisible();
      });
    });
   });
  }
});
