import { TestType, Fixtures, PlaywrightTestArgs, test as pwTest } from '@playwright/test';
import { ProductFlows } from '../../tests/product/support/ProductFlows';
import { TokenInterceptor } from '../../tests/product/support/TokenInterceptor';
import { config } from '../utils/config';
import type { ProductPersonaId } from '../../tests/product/matrix/e2e-matrix.data';

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
 * Setup handed to token-driven e2e tests: the calculator is already open (dev gate
 * unlocked) and the token the UI put on the wire has been captured. `interceptor`
 * keeps recording, so tests can assert on tokens the UI sends as they drive the app.
 */
export interface ProductTokenSetup {
  /** The token the UI sent to the backend during setup (undefined only if the gateway was down). */
  readonly token: string | undefined;
  /** The live interceptor — still capturing as the test drives the UI. */
  readonly interceptor: TokenInterceptor;
}

/**
 * Setup handed to authenticated token-driven e2e tests: the role's saved session has
 * been resumed and the per-user SESSION token the authenticated UI sends has been
 * captured (the token that differs from the public bundle token). Requires
 * `test.use({ authRole })`; skips when the role has no saved session (product-setup
 * skipped on the dev OTP cooldown).
 */
export interface ProductAuthTokenSetup {
  /** The authenticated per-user session token (undefined if only the public token was seen). */
  readonly sessionToken: string | undefined;
  /** The public app token baked into the bundle, for comparison. */
  readonly publicToken: string;
  /** The live interceptor — still capturing as the test drives the app. */
  readonly interceptor: TokenInterceptor;
}

/** The fixtures this library adds to a base test. */
export interface TokenFixtures {
  productToken: ProductTokenSetup;
  productAuthToken: ProductAuthTokenSetup;
}

/** What the token fixtures require from the base test they extend. */
export interface TokenFixtureDeps {
  product: ProductFlows;
  authRole?: ProductPersonaId;
}

/**
 * The token-extractor fixture implementations, typed against the concrete deps they
 * need from the base test (product + authRole, plus Playwright's built-in `page`).
 */
const tokenFixtureImpl: Fixtures<TokenFixtures, {}, TokenFixtureDeps & PlaywrightTestArgs, {}> = {
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
    pwTest.skip(!authRole, 'productAuthToken requires test.use({ authRole: <persona> }).');
    // Resumes the saved session (opens calculator + unlocks gate); skips if not authenticated.
    await product.resumeSession(authRole as ProductPersonaId);
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
  TWorker extends {},
>(baseTest: TestType<TArgs, TWorker>): TestType<TArgs & TokenFixtures, TWorker> {
  return baseTest.extend<TokenFixtures>(
    tokenFixtureImpl as Fixtures<TokenFixtures, {}, TArgs, TWorker>,
  );
}
