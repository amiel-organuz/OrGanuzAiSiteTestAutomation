import { TestType, Fixtures, PlaywrightTestArgs } from '@playwright/test';
import { TokenInterceptor } from '../../tests/product/support/TokenInterceptor';
import { config } from '../utils/config';
import type { TokenFixtureDeps, TokenFixtures } from '../types/token.types';

export type {
  ProductAuthTokenSetup,
  ProductTokenSetup,
  TokenFixtureDeps,
  TokenFixtures,
} from '../types/token.types';

/**
 * Token-extractor fixtures library.
 *
 * Reusable Playwright fixtures that run the TokenInterceptor as test SETUP: they open
 * the product app and capture the token the UI sends to the backend before the test
 * body runs. Compose them onto any product test that already exposes `product`
 * (ProductFlows) and the `authRole` option via `withTokenFixtures(baseTest)` — see
 * tests/product/support/fixtures.ts. Kept in the shared fixtures library so the
 * extraction wiring is a self-contained, reusable unit.
 */

/**
 * The token-extractor fixture implementations, typed against the concrete deps they
 * need from the base test (product + authRole, plus Playwright's built-in `page`).
 */
const tokenFixtureImpl: Fixtures<TokenFixtures, object, TokenFixtureDeps & PlaywrightTestArgs, object> = {
  /**
   * Token-extractor setup: attaches a TokenInterceptor, opens the calculator
   * (unlocking the dev gate), and captures the token the SPA sends to the backend on
   * load — before the test body runs. Tests that request `productToken` therefore
   * start on a ready calculator with the UI token already extracted. Skips (via
   * openCalculator) when the dev app/backend is unavailable.
   */
  productToken: async ({ page, product }, use) => {
    const interceptor = new TokenInterceptor(page).start();
    await product.openCalculator(); // goto '/' + unlock gate (fires the UI's backend calls)
    const token = await interceptor.waitForToken({ timeoutMs: 20_000 }).catch(() => undefined);
    await use({ token, interceptor });
    interceptor.stop();
  },

  /**
   * Authenticated token-extractor setup: resumes the role's saved session (from
   * `test.use({ authRole })`), then extracts the per-user SESSION token the
   * authenticated UI sends to the backend — before the test body runs. Skips when
   * no authRole is set or the role has no saved session (product-setup skipped on the
   * dev OTP cooldown), so it never logs in itself and can't trip the rate-limit.
   */
  productAuthToken: async ({ page, product, authRole }, use) => {
    const interceptor = new TokenInterceptor(page).start();
    if (!authRole) {
      throw new Error('productAuthToken requires test.use({ authRole: <persona> }).');
    }
    // Resumes the saved session (opens calculator + unlocks gate); skips if not authenticated.
    await product.resumeSession(authRole);
    // Navigate to the personal area so the authenticated UI makes a backend call carrying
    // the session token (by URL, not the header menu, so the profile need not have loaded).
    await page.goto('/pricing/my-offers').catch(() => undefined);
    await page.waitForURL(/\/pricing\//i, { timeout: 30_000 }).catch(() => undefined);
    const sessionToken = await interceptor
      .waitForToken({ sessionOnly: true, timeoutMs: 15_000 })
      .catch(() => undefined);
    await use({ sessionToken, publicToken: config.devApi.token, interceptor });
    interceptor.stop();
  },
};

/**
 * Extend a product base test (one exposing `product` + the `authRole` option) with the
 * token-extractor fixtures. Returns a new test object with `productToken` and
 * `productAuthToken` available. The cast bridges the concrete fixture deps to the
 * caller's generic base-test args (which always include product/authRole + page).
 */
export function withTokenFixtures<
  TArgs extends TokenFixtureDeps & PlaywrightTestArgs,
  TWorker extends object,
>(baseTest: TestType<TArgs, TWorker>): TestType<TArgs & TokenFixtures, TWorker> {
  return baseTest.extend<TokenFixtures>(
    tokenFixtureImpl as Fixtures<TokenFixtures, object, TArgs, TWorker>,
  );
}
