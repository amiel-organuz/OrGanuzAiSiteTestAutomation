/**
 * Credential-free calculator-shell sanity, per property type.
 *
 * No login, no OTP, no password — role-independent coverage that always runs in CI
 * (point it at prod via QA_TARGET_ENV=prod, which has no dev/test password gate).
 * Complements product-app.smoke.spec.ts (which checks the shell once) by exercising
 * every property-type option and the address/parcel search tabs.
 *
 * Confirmed live on prod (energy.organuz.com) via the Playwright MCP.
 */
import { expect, test } from '../support/fixtures';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from '../matrix/e2e-matrix.data';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

test.describe('Product calculator shell — property types (credential-free)', { tag: ['@product', '@smoke'] }, () => {
  test.beforeEach(async ({ product }) => {
    await product.openCalculator(); // lands on /calculator/address; unlocks the dev/test gate (no-op on prod)
  });

  for (const type of PROPERTY_TYPES) {
    const label = PROPERTY_TYPE_LABELS[type];

    test(`"${label}" is selectable and keeps continue gated until an address is chosen`, { tag: '@critical' }, async ({ page }) => {
      await allureEpic('Product app');
      await allureFeature('Calculator shell');
      await allureStory(label);
      await allureSeverity('critical');

      const typeButton = page.getByRole('button', { name: label });
      await expect(typeButton).toBeVisible();
      await typeButton.click();

      // Selecting a type alone neither advances the wizard nor enables "continue" —
      // an address is still required.
      await expect(page).toHaveURL(/calculator\/address/i);
      await expect(page.getByRole('button', { name: /בוא נמשיך/ })).toBeDisabled();
    });
  }

  test('address and parcel search tabs toggle', async ({ page }) => {
    await allureEpic('Product app');
    await allureFeature('Calculator shell');
    await allureStory('Address / parcel tabs');
    await allureSeverity('normal');

    const addressTab = page.getByRole('tab', { name: /חפש לפי כתובת/ });
    const parcelTab = page.getByRole('tab', { name: /גוש.*חלקה/ });
    await expect(addressTab).toBeVisible();
    await expect(parcelTab).toBeVisible();

    await parcelTab.click();
    await expect(page.getByRole('tab', { name: /גוש.*חלקה/, selected: true })).toBeVisible();

    await addressTab.click();
    await expect(page.getByRole('tab', { name: /חפש לפי כתובת/, selected: true })).toBeVisible();
  });
});
