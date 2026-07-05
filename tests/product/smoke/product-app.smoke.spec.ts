import { expect, test } from '../support/fixtures';

/**
 * Credential-free smoke coverage for the Organuz product app.
 *
 * Runs against whichever environment QA_TARGET_ENV selects (dev by default →
 * dev1.app.organize.organuz.com; prod → energy.organuz.com). `product.openCalculator()`
 * lands on the calculator and unlocks the dev/test password gate (no-op on prod).
 * The full persona E2E lives in flows/full-flow.spec.ts (gated).
 */
test.describe('Product app public smoke', { tag: ['@product', '@smoke'] }, () => {
  test.beforeEach(async ({ product }) => {
    await product.openCalculator();
  });

  test('loads the calculator shell with the Organuz title', { tag: '@critical' }, async ({ page }) => {
    await expect(page).toHaveTitle(/organuz/i);
    await expect(page).toHaveURL(/calculator/i);
  });

  test('exposes a register / login entry point', async ({ page }) => {
    await expect(page.getByRole('button', { name: /הרשמה/ }).first()).toBeVisible();
  });

  test('offers the property-type options', async ({ page }) => {
    for (const label of ['בית פרטי', 'בניין מגורים', 'מבנה מסחרי', 'מבנה חקלאי', 'מבנה ציבורי']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('shows the multi-step progress tracker starting at property location', async ({ page }) => {
    const steps = page.getByRole('list', { name: 'התקדמות השלבים' });
    await expect(steps).toBeVisible();
    await expect(steps.getByText('איתור הנכס')).toBeVisible();
    expect(await steps.getByRole('listitem').count()).toBeGreaterThanOrEqual(4);
  });

  test('starts on the address step with address and parcel search tabs', async ({ page }) => {
    await expect(page.getByText(/היכן נמצא הנכס שלך/).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /חפש לפי כתובת/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /גוש.*חלקה/ })).toBeVisible();
  });

  test('keeps the continue button disabled until an address is chosen', async ({ page }) => {
    await expect(page.getByRole('button', { name: /בוא נמשיך/ })).toBeDisabled();
  });
});
