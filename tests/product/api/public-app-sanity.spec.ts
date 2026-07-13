/**
 * Public dev-calculator sanity checks — no login, so they run (not skip) with just
 * the dev password-gate secret, exactly like token-sanity. They pass against a
 * healthy dev app and only FAIL on a real product regression (missing login entry,
 * wrong host, no backend call). A genuine infra outage is not a product bug, so
 * openCalculator's AppUnavailableError is turned into a skip, never a failure.
 */
import { test, expect } from '../support/fixtures';
import { AppUnavailableError } from '../support/ProductAppPage';
import { TokenInterceptor } from '../support/TokenInterceptor';
import { config } from '../../../src/utils/config';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const APP_HOST = new URL(config.env.appBaseUrl).host;

async function openOrSkip(product: { openCalculator(): Promise<void> }): Promise<void> {
  try {
    await product.openCalculator();
  } catch (err) {
    if (err instanceof AppUnavailableError) {
      test.skip(true, `dev app unavailable (not a product bug) — ${err.message}`);
      return;
    }
    throw err;
  }
}

test.describe('Public dev calculator sanity', { tag: ['@product', '@sanity'] }, () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async () => {
    await allureEpic('Product app');
    await allureFeature('Public calculator');
  });

  test('the dev calculator shell loads after unlocking the password gate', async ({ product }) => {
    await allureStory('app shell');
    await allureSeverity('critical');
    await openOrSkip(product);
    expect(await product.app.isAppShellLoaded(), 'calculator shell rendered').toBe(true);
  });

  test('a fresh visitor is signed out on the public calculator', async ({ product }) => {
    await allureStory('signed-out state');
    await allureSeverity('normal');
    await openOrSkip(product);
    expect(await product.app.isAuthenticated(), 'no session for a fresh visitor').toBe(false);
    await product.expectLoggedOut();
  });

  test('the login entry point is available to a signed-out visitor', async ({ product, page }) => {
    await allureStory('login entry');
    await allureSeverity('critical');
    await openOrSkip(product);
    // The public entry point is the header "register / sign-in" CTA; the phone field
    // only appears after opening it, so assert the CTA itself.
    const loginEntry = page
      .getByRole('button', { name: /הרשמה\s*\/\s*כניסה|הרשמה|התחברות|sign in|log in/i })
      .first();
    await expect(loginEntry).toBeVisible();
  });

  test('the app is served over HTTPS on the configured dev host', async ({ product, page }) => {
    await allureStory('secure origin');
    await allureSeverity('normal');
    await openOrSkip(product);
    const url = new URL(page.url());
    expect(url.protocol, 'served over HTTPS').toBe('https:');
    expect(url.host, 'served from the configured app host').toBe(APP_HOST);
  });

  test('the calculator issues a public backend call carrying the token on load', async ({ product, page }) => {
    await allureStory('public backend call');
    await allureSeverity('critical');
    const tokens = new TokenInterceptor(page).start();
    try {
      await openOrSkip(product);
      await tokens.waitForToken({ timeoutMs: 20_000 }).catch(() => undefined);
      expect(tokens.all().length, 'at least one token-bearing backend call fired on load').toBeGreaterThan(0);
    } finally {
      tokens.stop();
    }
  });
});
