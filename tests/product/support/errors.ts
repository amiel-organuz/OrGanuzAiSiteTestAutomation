/**
 * Environmental error types for the product app. Thrown by the page object / env-gate
 * (which stay free of test-runner lifecycle decisions) and translated into a graceful
 * `test.skip` by the callers (ProductFlows, the matrix). Kept in their own module so
 * both `ProductAppPage` and `env-gate` can import them without a circular dependency.
 */

/**
 * Phone+OTP sign-in couldn't complete because the dev gateway is rate-limiting OTP sends
 * (the code step never renders, or the session never authenticates).
 */
export class OtpUnavailableError extends Error {}

/**
 * The product app rendered its header but not the calculator shell — which happens when
 * its backend (organuz.flamiingo.com) is unreachable, so the SPA can't load its data or
 * route past the gate to `/calculator/`.
 */
export class AppUnavailableError extends Error {}

export const APP_UNAVAILABLE_REASON =
  'Dev product app did not load its calculator shell — backend (organuz.flamiingo.com) likely unavailable; skipping.';
