import { test, expect } from '../support/fixtures';
import { resumeOrSkip } from '../support/envGate';
import { productChrome } from '../../../src/i18n/product';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

/**
 * Long, high-priority e2e tests for the "company" role (contractor/EPC) — the only role with
 * the elevated company privileges: contractor pricing, entrepreneur pricing, and company details management.
 *
 * Each test resumes the "company" role's saved session (from the product-setup project), enters
 * the personal area, and navigates deep into one of the company areas — a multi-step chain (resume → user menu
 * → personal area → sidebar → dedicated page). Skip-safe: without a saved session (product-setup skipped
 * due to missing credentials/OTP cooldown) the test skips with a reason instead of failing, so the suite stays
 * green on CI. Locally, with the "company" credentials in .env (fixed OTP 7777), these actually run.
 *
 * Intentionally read-only: we navigate to the pricing/management forms and verify they load — we never
 * save/submit, so as not to create real data in dev and not to invalidate a shared session. See the
 * organuz-product-roles skill.
 */
test.describe('Company role e2e (high priority)', { tag: ['@product', '@roles', '@e2e', '@company'] }, () => {
  test.describe.configure({ timeout: 120_000 });

  test.use({ authRole: 'company' });

  test.beforeEach(async () => {
    await allureEpic('Product app');
    await allureFeature('Company role — elevated privileges');
  });

  test('company enters the personal area and sees its elevated sidebar entries', async ({ product, page }) => {
    await allureStory('Company personal area');
    await allureSeverity('blocker');
    await resumeOrSkip(product, 'company');

    await allureStep('Open the menu → personal area', async () => {
      await product.openPersonalArea();
      await expect(page).toHaveURL(/\/pricing\//i);
    });

    await allureStep('Verify the company-unique sidebar entries are shown', async () => {
      await expect(page.getByRole('button', { name: productChrome.contractorPricing }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: productChrome.entrepreneurPricing }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: productChrome.companyManagement }).first()).toBeVisible();
    });
  });

  test('company opens the contractor price simulator', async ({ product, page }) => {
    await allureStory('Contractor pricing');
    await allureSeverity('critical');
    await resumeOrSkip(product, 'company');

    await allureStep('Personal area → contractor pricing', async () => {
      await product.openPersonalArea();
      await product.openSidebarEntry(productChrome.contractorPricing);
    });

    await allureStep('Verify navigation to the contractor pricing page and that the price simulator is shown', async () => {
      await expect(page).toHaveURL(/\/pricing-contractor\//i, { timeout: 20_000 });
      await expect(page.getByText(productChrome.priceSimulator).first()).toBeVisible();
    });
  });

  test('company opens the entrepreneur investment simulator', async ({ product, page }) => {
    await allureStory('Entrepreneur pricing');
    await allureSeverity('critical');
    await resumeOrSkip(product, 'company');

    await allureStep('Personal area → entrepreneur pricing', async () => {
      await product.openPersonalArea();
      await product.openSidebarEntry(productChrome.entrepreneurPricing);
    });

    await allureStep('Verify navigation to the entrepreneur pricing page and that the investment simulator is shown', async () => {
      await expect(page).toHaveURL(/\/pricing-entrepreneur/i, { timeout: 20_000 });
      await expect(page.getByText(productChrome.investmentSimulator).first()).toBeVisible();
    });
  });

  test('company opens the company details management form (without saving)', async ({ product, page }) => {
    await allureStory('Company details management');
    await allureSeverity('blocker');
    await resumeOrSkip(product, 'company');

    await allureStep('Personal area → company details management', async () => {
      await product.openPersonalArea();
      await product.openSidebarEntry(productChrome.companyManagement);
    });

    await allureStep('Verify navigation to the management form and that the "Save as draft" action is shown — without clicking it', async () => {
      await expect(page).toHaveURL(/\/management/i, { timeout: 20_000 });
      await expect(page.getByRole('button', { name: productChrome.saveDraft }).first()).toBeVisible();
    });
  });
});
