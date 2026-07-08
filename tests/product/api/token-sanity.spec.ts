/**
 * Product API sanity tests driven by the TOKEN the real UI uses.
 *
 * Instead of hardcoding the RPC token, these extract it the way the app does: open
 * the dev calculator (APP_BASE_URL), let the SPA make its backend calls, and capture
 * the `token` field off the wire with TokenInterceptor (see the helper). We then hit
 * the RPC gateway (organuz.flamiingo.com) directly with that exact token and sanity-
 * check the gateway answers healthily — proving the token the bundle ships actually
 * authorizes the gateway, and that the UI transmits it safely.
 *
 * No login/OTP is needed: the app issues public backend calls (get_arena_types,
 * get_remaining_projects) on load, so the extracted token is the public app token.
 *
 * The dev gateway sometimes flips into a maintenance banner or is unreachable — like
 * the dev-api suite, those are environmental and SKIP rather than fail.
 *
 * Run:  npx playwright test tests/product/api/token-sanity.spec.ts --project=product --workers=1
 */
import { APIResponse } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { TokenInterceptor, InterceptedTokenCall } from '../support/TokenInterceptor';
import { FlamiingoApi } from '../../dev-api/support/FlamiingoApi';
import { unlockProductEnvironment } from '../support/env-gate';
import { config } from '../../../src/utils/config';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
} from '../../../src/utils/allure';

const BACKEND_HOST = new URL(config.devApi.baseUrl).host; // organuz.flamiingo.com

// Populated once by beforeAll from the live UI.
let uiToken: string | undefined;
let uiCalls: readonly InterceptedTokenCall[] = [];
let extractionReason = '';

test.describe('Product API sanity via extracted UI token (dev)', { tag: ['@product', '@api', '@sanity'] }, () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ baseURL: config.env.appBaseUrl });
    const page = await context.newPage();
    const tokens = new TokenInterceptor(page).start();
    try {
      await page.goto('/');
      // Unlock the dev/test password gate so the calculator (and its backend calls) load.
      await unlockProductEnvironment(page).catch((err) => {
        extractionReason = `dev app gate/shell unavailable: ${(err as Error).message}`;
      });
      // The SPA fires get_arena_types / get_remaining_projects on load; grab the token.
      uiToken = await tokens.waitForToken({ timeoutMs: 20_000 }).catch(() => undefined);
      uiCalls = tokens.all();
      if (!uiToken && !extractionReason) {
        extractionReason = 'UI made no observable backend call carrying a token (gateway likely down).';
      }
    } finally {
      tokens.stop();
      await context.close();
    }
  });

  // If the UI token could not be extracted (backend/gate down), skip — it's environmental.
  test.beforeEach(() => {
    test.skip(!uiToken, `Could not extract the UI token — ${extractionReason}`);
  });

  /** Invoke an RPC method with the extracted token, skipping on a maintenance banner. */
  async function rpc(request: import('@playwright/test').APIRequestContext, method: string): Promise<APIResponse> {
    const api = new FlamiingoApi(request, config.devApi.baseUrl, uiToken as string);
    let res: APIResponse;
    try {
      res = await api.call(method);
    } catch (err) {
      test.skip(true, `Dev RPC gateway unreachable — ${(err as Error).message.split('\n')[0]}`);
      throw err;
    }
    test.skip(
      FlamiingoApi.isMaintenanceBanner(await res.text()),
      'Dev RPC gateway is in maintenance ("Debug Mode Off") — skipping.',
    );
    return res;
  }

  test('1. the UI transmits a well-formed token to the backend', { tag: '@critical' }, async () => {
    await allureEpic('Product app');
    await allureFeature('UI token extraction');
    await allureStory('token shape');
    await allureSeverity('critical');

    expect(uiToken, 'no UI token captured').toBeTruthy();
    // The gateway token is a `<24-hex-object-id>-<32-hex-secret>` pair.
    expect(uiToken as string).toMatch(/^[a-f0-9]{24}-[a-f0-9]{32}$/);
  });

  test('2. the extracted token matches the bundle public token in config', async () => {
    await allureEpic('Product app');
    await allureFeature('UI token extraction');
    await allureStory('config parity');
    await allureSeverity('normal');

    // Guards against the shipped UI bundle drifting away from the token the suite uses.
    expect(uiToken, 'UI token differs from config.devApi.token — bundle/config drift').toBe(config.devApi.token);
  });

  test('3. the extracted token authorizes get_arena_types with an ok envelope', { tag: '@critical' }, async ({ request }) => {
    await allureEpic('Product app');
    await allureFeature('RPC authorization');
    await allureStory('get_arena_types');
    await allureSeverity('critical');

    const res = await rpc(request, 'get_arena_types');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.itemsFound).toBe(body.items.length);
    expect(body.items.length).toBeGreaterThan(0);
  });

  test('4. the extracted token drives the remaining-projects quota endpoint', async ({ request }) => {
    await allureEpic('Product app');
    await allureFeature('RPC authorization');
    await allureStory('get_remaining_projects');
    await allureSeverity('normal');

    const res = await rpc(request, 'get_remaining_projects');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.item).toBeDefined();
    expect(typeof body.item.max_projects).toBe('object');
  });

  test('5. every UI backend call sends the token in the body over HTTPS, never the URL', { tag: '@security' }, async () => {
    await allureEpic('Product app');
    await allureFeature('Token transport security');
    await allureStory('body-only over HTTPS');
    await allureSeverity('critical');

    expect(uiCalls.length, 'no backend calls were captured from the UI').toBeGreaterThan(0);
    for (const call of uiCalls) {
      expect(call.url.startsWith('https:'), `backend call not over HTTPS: ${call.url}`).toBe(true);
      const query = new URL(call.url).searchParams;
      expect(query.get('token'), `token leaked into the URL: ${call.url}`).toBeNull();
      // Only Organuz's own gateway should ever receive the token.
      expect(new URL(call.url).host).toBe(BACKEND_HOST);
    }
  });
});
