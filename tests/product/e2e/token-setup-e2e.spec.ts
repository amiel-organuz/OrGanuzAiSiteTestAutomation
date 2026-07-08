/**
 * Product web-UI e2e tests whose SETUP is the token extractor.
 *
 * Every test requests the `productToken` fixture (tests/product/support/fixtures.ts):
 * it attaches a TokenInterceptor, opens the dev calculator (unlocking the password
 * gate), and captures the token the SPA sends to the backend on load — all before the
 * test body runs. So each test starts on a ready calculator with the UI token already
 * extracted, then drives and asserts the public product web UI (shell, property types,
 * step tracker, address autocomplete, login/registration dialogs, RTL), while the live
 * interceptor keeps proving the UI transmits that same token as the user navigates.
 *
 * These stay on the pre-login calculator surface (no OTP), so they're safe to run on
 * dev without tripping the OTP rate-limit. openCalculator() skips when the app/backend
 * is unavailable, so the whole file skips cleanly on an environmental outage.
 *
 * Run:  npx playwright test tests/product/e2e/token-setup-e2e.spec.ts --project=product --workers=1
 */
import { test, expect } from '../support/fixtures';
import { PROPERTY_TYPE_LABELS } from '../matrix/e2e-matrix.data';
import { config } from '../../../src/utils/config';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
} from '../../../src/utils/allure';

const PROPERTY_TYPE_NAMES = Object.values(PROPERTY_TYPE_LABELS);

test.describe('Product web-UI e2e (token-extractor setup)', { tag: ['@product', '@e2e'] }, () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async () => {
    await allureEpic('Product app');
    await allureFeature('Token-driven web-UI e2e');
  });

  test('1. setup extracts a well-formed UI token before the calculator loads', { tag: '@critical' }, async ({ productToken }) => {
    await allureStory('setup token');
    await allureSeverity('critical');

    expect(productToken.token, 'setup fixture captured no UI token').toBeTruthy();
    expect(productToken.token as string).toMatch(/^[a-f0-9]{24}-[a-f0-9]{32}$/);
    expect(productToken.token).toBe(config.devApi.token);
  });

  test('2. the calculator shell renders after setup', { tag: '@critical' }, async ({ productToken, product }) => {
    await allureStory('shell render');
    await allureSeverity('critical');

    // productToken already opened the calculator; the shell must be present.
    expect(await product.app.isAppShellLoaded(), 'calculator shell did not render').toBe(true);
    void productToken.token;
  });

  test('3. all five property-type options are offered', async ({ productToken, page }) => {
    await allureStory('property types');
    await allureSeverity('normal');
    void productToken;

    for (const label of PROPERTY_TYPE_NAMES) {
      await expect(page.getByRole('button', { name: new RegExp(label) }).first()).toBeVisible();
    }
  });

  test('4. the step-progress tracker is visible', async ({ productToken, page }) => {
    await allureStory('step tracker');
    await allureSeverity('minor');
    void productToken;

    await expect(page.getByRole('list', { name: 'התקדמות השלבים' })).toBeVisible();
  });

  test('5. the primary continue button is disabled until a property + address are chosen', async ({ productToken, page }) => {
    await allureStory('continue gating');
    await allureSeverity('normal');
    void productToken;

    const cont = page.getByRole('button', { name: 'בוא נמשיך' }).last();
    await expect(cont).toBeVisible();
    await expect(cont).toBeDisabled();
  });

  test('6. selecting a property type and typing an address surfaces autocomplete options', async ({ productToken, page }) => {
    await allureStory('address autocomplete');
    await allureSeverity('critical');
    void productToken;

    await page.getByRole('button', { name: new RegExp(PROPERTY_TYPE_LABELS.PROPERTY_TYPE_PRIVATE_HOUSE) }).first().click();
    const address = page.getByRole('combobox').first();
    await address.click();
    await address.pressSequentially('הברזל 32 תל אביב', { delay: 60 });
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 20_000 });
  });

  test('7. the login dialog opens with a phone field', async ({ productToken, page }) => {
    await allureStory('login dialog');
    await allureSeverity('critical');
    void productToken;

    await page.getByRole('button', { name: /הרשמה\s*\/\s*כניסה|הרשמה|התחברות/ }).first().click();
    await expect(page.getByRole('heading', { name: 'התחברות' })).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('textbox', { name: /טלפון|נייד|phone|mobile/i }).first(),
    ).toBeVisible();
  });

  test('8. the property-owner registration form opens with its fields', async ({ productToken, product }) => {
    await allureStory('owner registration');
    await allureSeverity('normal');
    void productToken;

    await product.app.openCustomerRegistration();
    await expect(product.app.registrationSubmitButton()).toBeVisible();
  });

  test('9. the solar-company CTA opens the marketing-site contact page in a new tab', async ({ productToken, product }) => {
    await allureStory('solar-company lead');
    await allureSeverity('normal');
    void productToken;

    const popup = await product.app.openSolarCompanyRegistration();
    expect(popup.url()).toMatch(/organuz\.ai/i);
    await popup.close();
  });

  test('10. the UI keeps sending the extracted token as the user navigates the app', { tag: '@security' }, async ({ productToken, page }) => {
    await allureStory('token transport');
    await allureSeverity('critical');

    // Drive some UI to trigger more backend calls, then confirm every token the UI sent
    // matches the one captured at setup, always in the body over HTTPS (never the URL).
    await page.getByRole('button', { name: new RegExp(PROPERTY_TYPE_LABELS.PROPERTY_TYPE_PRIVATE_HOUSE) }).first().click();
    await page.waitForTimeout(2_000);

    const calls = productToken.interceptor.all();
    expect(calls.length, 'no backend calls captured from the UI').toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.token, 'UI sent a token that differs from the setup token').toBe(productToken.token);
      expect(call.url.startsWith('https:'), `backend call not over HTTPS: ${call.url}`).toBe(true);
      expect(new URL(call.url).searchParams.get('token'), `token leaked into the URL: ${call.url}`).toBeNull();
    }
  });
});
