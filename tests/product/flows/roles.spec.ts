import { test, expect } from '../support/fixtures';
import { resumeOrSkip } from '../support/envGate';
import { productChrome } from '../../../src/i18n/product';

/**
 * Live-browser e2e sanity tests for each sign-in role (product-authenticated project).
 *
 * Table-driven: the shared checks are generated once per role, so adding a role or a check
 * is a single edit. Each role resumes the session saved by the `product-setup` project and
 * runs read-only checks against the dev calculator. Skip-safe via `resumeOrSkip`: when a
 * role has no saved session (product-setup skipped because its credentials or the dev app
 * were unavailable) the test skips with a reason instead of failing — so the suite stays
 * green on CI without per-role secrets.
 *
 * Intentionally read-only: no sign-out/writes, so a shared saved session is never
 * invalidated for the parallel tests that reuse it.
 */
const SIGN_IN_ROLES = ['customer', 'consultant', 'company'] as const;

for (const role of SIGN_IN_ROLES) {
  test.describe(`Live role session: ${role}`, { tag: ['@product', '@roles', '@e2e'] }, () => {
    test.use({ authRole: role });

    test(`${role} resumes its saved session into the calculator shell`, async ({ product }) => {
      await resumeOrSkip(product, role);
      expect(await product.app.isAuthenticated()).toBe(true);
    });

    test(`${role} can open its personal area`, async ({ product }) => {
      await resumeOrSkip(product, role);
      await product.openPersonalArea();
    });

    test(`the ${role} session persists after a reload`, async ({ product, page }) => {
      await resumeOrSkip(product, role);
      await page.reload();
      expect(await product.app.isAuthenticated()).toBe(true);
    });

    // Only the company (contractor) role has the elevated pricing areas.
    if (role === 'company') {
      test('company can open the contractor pricing area', async ({ product }) => {
        await resumeOrSkip(product, 'company');
        await product.openPersonalArea();
        await product.openSidebarEntry(productChrome.contractorPricing);
      });
    }
  });
}
