/**
 * Extract the token the product UI uses for its backend calls, via Playwright
 * request interception, using the TokenInterceptor helper.
 *
 * The dev app (APP_BASE_URL) drives the RPC gateway (organuz.flamiingo.com) with
 * form-encoded `POST /` bodies carrying `token=<token>`. Before login that is the
 * PUBLIC app token baked into the bundle; after a successful login the authenticated
 * calls carry the user's SESSION token in the same field. TokenInterceptor records
 * both; this spec logs in (or, on the dev OTP cooldown, reports the pre-login token).
 *
 * Run:  TOKEN_ROLE=customer \
 *       npx playwright test tests/product/api/extract-ui-token.spec.ts --project=product --workers=1
 */
import { test } from '../support/fixtures';
import { TokenInterceptor } from '../support/TokenInterceptor';

test('extract UI token via request intercept', async ({ page, product }) => {
  test.setTimeout(150_000);

  const tokens = new TokenInterceptor(page).start();

  const role = (process.env.TOKEN_ROLE ?? 'CUSTOMER').toUpperCase();
  const phone = process.env[`${role}_PHONE`];
  const otpCode = process.env[`${role}_OTP_CODE`];
  console.log(`\nintercepting ${role} phone=${phone} base=${process.env.APP_BASE_URL}`);

  // Call the low-level page object directly (not product.loginAs, which turns
  // environmental OTP failures into a graceful test.skip) so we can still report the
  // pre-login UI token when the dev OTP cooldown blocks a full login.
  let authenticated = false;
  try {
    await product.app.login({ phone, otpCode });
    authenticated = true;
    console.log('login OK (authenticated session)');
  } catch (err) {
    console.log(`login incomplete (${(err as Error).message}) — reporting pre-login UI token(s).`);
  }

  if (authenticated) {
    // Nudge an authenticated backend call so the per-user session token appears.
    await page.goto('/pricing/my-offers').catch(() => undefined);
    await page.waitForLoadState('domcontentloaded');
    await tokens.waitForToken({ sessionOnly: true, timeoutMs: 15_000 }).catch(() => undefined);
  } else {
    await tokens.waitForToken({ timeoutMs: 15_000 }).catch(() => undefined);
  }

  tokens.stop();

  console.log('\n===== UI TOKEN INTERCEPT =====');
  console.log(`backend POSTs seen : ${tokens.all().length}`);
  console.log(`distinct tokens    : ${JSON.stringify(tokens.distinctTokens(), null, 2)}`);
  console.log(`latest token       : ${tokens.latest() ?? '(none)'}`);
  console.log(`>>> UI SESSION TOKEN: ${tokens.sessionToken() ?? '(none — full login blocked; only the public UI token was seen)'}`);
  console.log(
    `last calls         :\n    ${tokens
      .all()
      .slice(-8)
      .map((c) => `${c.call || '(no call)'} -> ${c.token.slice(0, 12)}…`)
      .join('\n    ')}`,
  );
  console.log('===============================\n');
});
