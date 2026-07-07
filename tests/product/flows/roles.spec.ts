/**
 * Product app — full E2E flow for all three user roles (dev).
 *
 * Each role resumes the session the product-setup project logged in once (phone +
 * fixed dev OTP 7777), is verified by its header role label, opens its personal area
 * (…/pricing/my-offers), and sees the navigation that is distinctive to that role.
 * Mapped live via the Playwright MCP; see the organuz-product-e2e skill.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true + persona OTP. Note: consultant and
 * company use their own phone numbers (customer's 0510000000 is easily OTP
 * rate-limited). company-employee has no phone and is intentionally excluded.
 */
import { test, expect } from '../support/fixtures';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

interface RoleFlow {
  persona: ProductPersonaId;
  label: string;      // display name for the test
  roleName: RegExp;   // header user-menu role label
  nav: string[];      // personal-area entries distinctive to this role
}

const ROLES: readonly RoleFlow[] = [
  { persona: 'customer',   label: 'user (property owner)', roleName: /בעל נכס/,       nav: ['ההצעות שלי'] },
  { persona: 'consultant', label: 'consultant',            roleName: /יועץ/,          nav: ['ההצעות שלי', 'הצעות שגריר', 'בדיקת נכס'] },
  { persona: 'company',    label: 'contractor (EPC)',      roleName: /קבלן|חברת EPC/, nav: ['מחירון קבלני', 'מחירון יזמי', 'ניהול פרטי החברה'] },
];

test.describe('Product role flows (dev)', { tag: ['@product', '@sanity', '@e2e', '@roles'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to run the authenticated role flows.');
  // Login + OTP make these slow.
  test.describe.configure({ timeout: 150_000 });

  for (const role of ROLES) {
   test.describe(role.label, () => {
    test.use({ authRole: role.persona });
    test(`reaches its personal area`, { tag: '@critical' }, async ({ page, product }) => {
      await allureEpic('Product app');
      await allureFeature('Role flows');
      await allureStory(role.label);
      await allureSeverity('critical');

      await product.resumeSession(role.persona);

      // Header shows the correct role.
      await expect(page.getByRole('button', { name: role.roleName }).first()).toBeVisible();

      // Personal area is role-appropriate.
      await product.openPersonalArea();
      await expect(page).toHaveURL(/\/pricing\//i);
      for (const entry of role.nav) {
        await expect(page.getByText(entry).first(), `"${entry}" visible for ${role.label}`).toBeVisible();
      }
    });
   });
  }
});
