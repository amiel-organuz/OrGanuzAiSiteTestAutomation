import { test, expect } from '../support/fixtures';
import { resumeOrSkip } from '../support/envGate';

/**
 * English-version per-role sanity e2e for the 6-step calculator site — the customer,
 * advisor (consultant) and company roles, in the ENGLISH UI.
 *
 * Table-driven: each role resumes its saved session (from `product-setup`), switches the
 * app to English via the header language menu (`resumeOrSkip(..., { english: true })`),
 * and asserts the authenticated app renders in English. Skip-safe exactly like the Hebrew
 * role specs: a role with no saved session skips with a reason instead of failing — so the
 * suite stays green on CI without per-role secrets. Locally, with all three roles' phones
 * in .env (dev OTP 7777), product-setup authenticates every role and these run for real.
 *
 * Read-only on purpose: no logout/writes, so a shared saved session is never invalidated
 * for the parallel specs reusing it. See the organuz-product-en skill.
 */
const EN_ROLES = [
  { id: 'customer', label: 'customer' },
  { id: 'consultant', label: 'advisor (consultant)' },
  { id: 'company', label: 'company' },
] as const;

for (const { id, label } of EN_ROLES) {
  test.describe(`English role session: ${label}`, { tag: ['@product', '@roles', '@e2e', '@en'] }, () => {
    test.use({ authRole: id });

    test(`${id} resumes its session and sees the app in English`, async ({ product }) => {
      await resumeOrSkip(product, id, { english: true });
      expect(await product.app.isAuthenticated()).toBe(true);
      expect(await product.app.currentLanguage()).toBe('en');
    });

    if (id === 'company') {
      test('company keeps its English session across a reload', async ({ product, page }) => {
        await resumeOrSkip(product, 'company', { english: true });
        await page.reload();
        expect(await product.app.isAuthenticated()).toBe(true);
        expect(await product.app.currentLanguage()).toBe('en');
      });
    }
  });
}
