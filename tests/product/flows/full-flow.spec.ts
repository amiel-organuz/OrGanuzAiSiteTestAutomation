/**
 * Product app — full-flow E2E sanity (dev).
 *
 * Drives the authenticated characterization wizard through its deterministic,
 * AI-automated portion: password gate → phone+OTP login → property type + address
 * → satellite roof scan → AI-detected roof boundary → obstacles → roof-type step.
 *
 * The roof-type step requires manual map-canvas drawing (non-deterministic), so
 * the sanity flow asserts we reach it and stops. Gated behind PRODUCT_E2E_ENABLED
 * + persona OTP (dev fixed OTP 7777). See the organuz-product-e2e skill.
 */
import { test, expect } from '../support/fixtures';
import { MAIN_E2E_SCENARIOS } from '../matrix/e2e-matrix.data';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

test.describe('Product full-flow sanity (dev)', { tag: ['@product', '@sanity', '@e2e'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to run the authenticated full flow.');
  // The wizard is long (login + OTP + satellite roof scan). Give it room.
  test.describe.configure({ timeout: 150_000 });

  test('customer characterizes a property up to the roof-type step', { tag: '@critical' }, async ({ page, product }) => {
    await allureEpic('Product app');
    await allureFeature('Characterization wizard');
    await allureStory('Full flow (automated portion)');
    await allureSeverity('critical');

    await product.loginAs('customer'); // opens the calculator + unlocks the dev gate internally

    await expect(page.getByRole('button', { name: /הרשמה\s*\/\s*כניסה|הרשמה/ })).toBeHidden();

    const ids = await product.characterizeToRoofType(MAIN_E2E_SCENARIOS[0]);

    expect(ids.projectId, 'projectId parsed from URL').toBeTruthy();
    expect(ids.quotationId, 'roof id parsed from URL').toBeTruthy();
    await expect(page).toHaveURL(/\/roof\/[^/]+\/type/i);
    await expect(page.getByText('מיקום המערכת ובחירת סוג הגג')).toBeVisible();
  });
});
