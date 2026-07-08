/**
 * Environmental error types for the product app. Thrown by the page object / env-gate
 * (which stay free of test-runner lifecycle decisions) and surfaced as test failures
 * by the callers. Kept in their own module so
 * both `ProductAppPage` and `env-gate` can import them without a circular dependency.
 */

/**
 * Base for the environmental errors. Restores the prototype chain and sets `name` so
 * `instanceof` stays reliable — Playwright's runtime TS transpiler downlevels
 * `class X extends Error {}` in a way that otherwise severs the chain, making
 * `error instanceof OtpUnavailableError` return false and turning graceful skips into
 * hard failures (the callers gate their skip/rethrow on exactly that check).
 */
class EnvironmentalError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Phone+OTP sign-in couldn't complete because the dev gateway is rate-limiting OTP sends
 * (the code step never renders, or the session never authenticates).
 */
export class OtpUnavailableError extends EnvironmentalError {}

/**
 * The product app rendered its header but not the calculator shell — which happens when
 * its backend (organuz.flamiingo.com) is unreachable, so the SPA can't load its data or
 * route past the gate to `/calculator/`.
 */
export class AppUnavailableError extends EnvironmentalError {}

export const APP_UNAVAILABLE_REASON =
  'Dev product app did not load its calculator shell — backend (organuz.flamiingo.com) likely unavailable; skipping.';
