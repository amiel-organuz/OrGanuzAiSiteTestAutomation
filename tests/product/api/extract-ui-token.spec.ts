/**
 * Throwaway helper: extract the per-session token the product UI uses for its
 * backend RPC calls, via Playwright request interception.
 *
 * The dev app (APP_BASE_URL, organuz.flamiingo.com gateway) issues every backend
 * call as a form-encoded `POST /` with `action=token&token=<token>&call=<method>`.
 * Before login the token is the public app token baked into the bundle; AFTER login
 * the authenticated calls carry the user's session token in that same `token` field.
 * We attach a request listener, log in, and read the token straight off the wire.
 *
 * Run:  npx playwright test tests/product/api/extract-ui-token.spec.ts --project=product --workers=1
 */
import { test } from '../support/fixtures';
import { config } from '../../../src/utils/config';

const BACKEND_HOST = new URL(config.devApi.baseUrl).host; // organuz.flamiingo.com

/** Pull the `token` field out of a form-encoded (or JSON) RPC POST body. */
function tokenFromPostData(postData: string | null): string | undefined {
  if (!postData) return undefined;
  // Form-encoded: action=token&token=<t>&call=<m>
  const form = new URLSearchParams(postData);
  if (form.get('token')) return form.get('token') ?? undefined;
  // Fallback: JSON body { "token": "<t>" }
  try {
    const json = JSON.parse(postData);
    if (json && typeof json.token === 'string') return json.token;
  } catch {
    /* not JSON */
  }
  return undefined;
}

test('extract UI session token via request intercept', async ({ page, product }) => {
  test.setTimeout(150_000);

  const tokens: { token: string; call: string }[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'POST') return;
    try {
      if (new URL(req.url()).host !== BACKEND_HOST) return;
    } catch {
      return;
    }
    const token = tokenFromPostData(req.postData());
    if (!token) return;
    const call = new URLSearchParams(req.postData() ?? '').get('call') ?? '';
    tokens.push({ token, call });
  });

  // Call the low-level page object directly (not product.loginAs, which turns
  // environmental errors into a graceful test.skip) so any failure reason is visible.
  const role = (process.env.TOKEN_ROLE ?? 'CUSTOMER').toUpperCase();
  const phone = process.env[`${role}_PHONE`];
  const otpCode = process.env[`${role}_OTP_CODE`];
  console.log(`\nlogging in customer phone=${phone} otp=${otpCode} base=${process.env.APP_BASE_URL}`);
  try {
    await product.app.login({ phone, otpCode });
    console.log('login OK');
  } catch (err) {
    console.log(`LOGIN FAILED: ${(err as Error).name}: ${(err as Error).message}`);
    throw err;
  }

  // Nudge the app to make an authenticated backend call so the session token appears.
  await page.goto('/pricing/my-offers').catch(() => undefined);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(4_000);

  // The last distinct token seen after login is the authenticated session token.
  const distinct = [...new Set(tokens.map((t) => t.token))];
  const publicToken = config.devApi.token;
  const sessionTokens = distinct.filter((t) => t !== publicToken);

  console.log('\n===== UI TOKEN INTERCEPT =====');
  console.log(`backend host       : ${BACKEND_HOST}`);
  console.log(`backend POSTs seen : ${tokens.length}`);
  console.log(`public app token   : ${publicToken}`);
  console.log(`distinct tokens    : ${JSON.stringify(distinct, null, 2)}`);
  console.log(`\n>>> UI SESSION TOKEN(S):`);
  for (const t of (sessionTokens.length ? sessionTokens : distinct)) {
    console.log(`    ${t}`);
  }
  const sample = tokens.slice(-8).map((t) => `${t.call || '(no call)'} -> ${t.token.slice(0, 12)}…`);
  console.log(`\nlast calls         :\n    ${sample.join('\n    ')}`);
  console.log('===============================\n');
});
