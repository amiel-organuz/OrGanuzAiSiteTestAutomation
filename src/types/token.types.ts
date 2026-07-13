import type { ProductFlows } from '../../tests/product/support/ProductFlows';
import type { TokenInterceptor } from '../../tests/product/support/TokenInterceptor';
import type { ProductPersonaId } from '../../tests/product/matrix/e2e-matrix.data';

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
