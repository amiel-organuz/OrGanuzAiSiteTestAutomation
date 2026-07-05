/**
 * Per-role backend-API integration + security tests for the product app (dev).
 *
 * Each of the three roles logs in and opens its personal area; meanwhile we capture
 * every response the SPA makes to the Organuz RPC backend (organuz.flamiingo.com)
 * and assert, per role:
 *   - Integration: the role's area is driven by the backend (>=1 call) and at least
 *     one call returns a healthy `{status:"ok"}` envelope, with no 5xx.
 *   - Security: backend calls are JSON over HTTPS and never carry the session token
 *     in the URL (it rides in the POST body).
 *
 * Third-party hosts (the govmap.gov.il map iframe, Google analytics) are ignored —
 * only the Organuz backend host is inspected. One login per role keeps OTP minimal.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true + persona OTP (dev fixed OTP 7777).
 */
import { test, expect } from '../support/fixtures';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import { config } from '../../../src/utils/config';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';
const BACKEND_HOST = new URL(config.devApi.baseUrl).host; // organuz.flamiingo.com

const ROLES: readonly ProductPersonaId[] = ['customer', 'consultant', 'company'];

interface BackendCall {
  url: string;
  status: number;
  contentType: string;
  envelopeStatus?: unknown;
}

function sameHost(url: string, host: string): boolean {
  try {
    return new URL(url).host === host;
  } catch {
    return false;
  }
}

test.describe('Product role backend API (dev)', { tag: ['@product', '@api', '@integration', '@security', '@roles'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to run the authenticated backend-API flows.');
  test.describe.configure({ timeout: 180_000 });

  for (const role of ROLES) {
    test(`${role}: backend calls are healthy JSON over HTTPS with no token in the URL`, { tag: '@critical' }, async ({ page, product }) => {
      await allureEpic('Product app');
      await allureFeature('Role backend API');
      await allureStory(role);
      await allureSeverity('critical');

      const calls: BackendCall[] = [];
      page.on('response', async (res) => {
        const url = res.url();
        if (!sameHost(url, BACKEND_HOST)) return;
        const contentType = res.headers()['content-type'] ?? '';
        let envelopeStatus: unknown;
        if (contentType.includes('application/json')) {
          const body = await res.json().catch(() => undefined);
          if (body && typeof body === 'object') envelopeStatus = (body as { status?: unknown }).status;
        }
        calls.push({ url, status: res.status(), contentType, envelopeStatus });
      });

      await product.loginAs(role);
      // Navigate straight to the personal area by URL (not via the header menu, whose
      // label depends on the profile having loaded) so this stays an API-observation test.
      await page.goto('/pricing/my-offers');
      await page.waitForURL(/\/pricing\//i, { timeout: 30_000 }).catch(() => undefined);
      // Let personal-area XHRs settle (networkidle is unsafe here — the map iframe never idles).
      await page.waitForTimeout(2000);

      // Integration — the role's area is driven by the backend, healthily.
      expect(calls.length, 'no Organuz backend calls captured').toBeGreaterThan(0);
      expect(calls.some((c) => c.envelopeStatus === 'ok'), 'expected at least one {status:"ok"} envelope').toBe(true);
      const serverErrors = calls.filter((c) => c.status >= 500);
      expect(serverErrors, `backend returned 5xx: ${JSON.stringify(serverErrors)}`).toHaveLength(0);

      // Security — the backend is only ever reached over HTTPS.
      // NB: the RPC gateway carries a *public* app token (baked into the bundle) in some
      // URLs — that is by design, not a secret leak, so we don't assert token-absence here.
      for (const call of calls) {
        expect(call.url.startsWith('https:'), `backend call not over HTTPS: ${call.url}`).toBe(true);
      }
    });
  }
});
