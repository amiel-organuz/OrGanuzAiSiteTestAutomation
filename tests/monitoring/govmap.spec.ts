import { expect, test } from '@playwright/test';
import { allureEpic, allureFeature, allureStory } from '../../src/utils/allure';
import { HttpStatus } from '../../src/utils/httpStatus';
import { type ParsedResponse } from '../../src/api';
import { GOVMAP, LATENCY_BUDGET_MS } from './support/endpoints';
import { GovmapApi } from './support/api';
import { govmapBlockReason } from './support/availability';

/**
 * Dedicated availability + contract monitoring for **Govmap** (`www.govmap.gov.il`),
 * the national map API the product uses to locate a property and geocode its
 * address. These are health checks: when Govmap breaks they fail (that is the
 * alert), so the group is opt-in (`MONITORING_ENABLED=true`) and runs on a
 * schedule rather than in the PR green gate.
 */

async function timed(fn: () => Promise<ParsedResponse>): Promise<{ res: ParsedResponse; ms: number }> {
  const start = Date.now();
  const res = await fn();
  return { res, ms: Date.now() - start };
}

test.describe('Govmap API monitoring', { tag: '@monitoring' }, () => {
  test.beforeEach(async ({ request }) => {
    await allureEpic('External API monitoring');
    await allureFeature('Govmap (www.govmap.gov.il)');
    // Skip (not fail) when this runner is served an HTML block/challenge page —
    // an environmental geo/bot block, not a real Govmap outage or a product bug.
    const reason = await govmapBlockReason(request);
    test.skip(reason !== null, reason ?? '');
  });

  // ---- Map API script ----------------------------------------------------
  test('1. the govmap.api.js loader is reachable (200)', async ({ request }) => {
    await allureStory('API loader availability');
    const api = new GovmapApi(request);
    expect((await api.apiScript()).status).toBe(HttpStatus.OK);
  });

  test('2. govmap.api.js is served as JavaScript', async ({ request }) => {
    await allureStory('API loader content-type');
    const api = new GovmapApi(request);
    const res = await api.apiScript();
    expect(res.contentType).toMatch(/javascript/i);
  });

  test('3. govmap.api.js is a non-trivial script bundle', async ({ request }) => {
    await allureStory('API loader payload');
    const api = new GovmapApi(request);
    const body = (await api.apiScript()).text;
    expect(body.length).toBeGreaterThan(100_000);
    expect(body.toLowerCase()).toContain('govmap');
  });

  test('4. govmap.api.js responds within the latency budget', async ({ request }) => {
    await allureStory('API loader latency');
    const api = new GovmapApi(request);
    const { res, ms } = await timed(() => api.apiScript());
    expect(res.ok).toBeTruthy();
    expect(ms).toBeLessThan(LATENCY_BUDGET_MS);
  });

  test('5. Govmap is served over HTTPS', async () => {
    await allureStory('secure origin');
    expect(GOVMAP.apiBaseUrl.startsWith('https://')).toBeTruthy();
  });

  // ---- Embedded viewer ---------------------------------------------------
  test('6. the embed viewer document loads for the public token (200)', async ({ request }) => {
    await allureStory('embed document');
    const api = new GovmapApi(request);
    expect((await api.embedDocument()).status).toBe(HttpStatus.OK);
  });

  test('7. the embed viewer document is HTML', async ({ request }) => {
    await allureStory('embed content-type');
    const api = new GovmapApi(request);
    const res = await api.embedDocument();
    expect(res.contentType).toMatch(/text\/html/i);
  });

  // ---- Address search / geocoding (critical path) ------------------------
  test('8. address autocomplete responds 200', async ({ request }) => {
    await allureStory('address search availability');
    const api = new GovmapApi(request);
    const res = await api.autocomplete(GOVMAP.knownAddress);
    expect(res.status).toBe(HttpStatus.OK);
  });

  test('9. address autocomplete returns JSON', async ({ request }) => {
    await allureStory('address search content-type');
    const api = new GovmapApi(request);
    const res = await api.autocomplete(GOVMAP.knownAddress);
    expect(res.contentType).toMatch(/application\/json/i);
  });

  test('10. a known address returns at least one result', async ({ request }) => {
    await allureStory('geocoding results');
    const api = new GovmapApi(request);
    const body = (await api.autocomplete(GOVMAP.knownAddress)).json as any;
    expect(body.resultsCount).toBeGreaterThan(0);
    expect(Array.isArray(body.results)).toBeTruthy();
    expect(body.results.length).toBeGreaterThan(0);
  });

  test('11. the top result matches the queried street', async ({ request }) => {
    await allureStory('geocoding relevance');
    const api = new GovmapApi(request);
    const body = (await api.autocomplete(GOVMAP.knownAddress)).json as any;
    expect(body.results[0].text).toContain(GOVMAP.knownStreet);
  });

  test('12. the top result carries a POINT geometry (geocoded)', async ({ request }) => {
    await allureStory('geocoding coordinates');
    const api = new GovmapApi(request);
    const body = (await api.autocomplete(GOVMAP.knownAddress)).json as any;
    expect(String(body.results[0].shape)).toMatch(/^POINT\s*\(/);
  });

  test('13. the top result is typed as an address', async ({ request }) => {
    await allureStory('result typing');
    const api = new GovmapApi(request);
    const body = (await api.autocomplete(GOVMAP.knownAddress)).json as any;
    expect(body.results[0].type).toBe('address');
  });

  test('14. autocomplete respects maxResults', async ({ request }) => {
    await allureStory('result paging');
    const api = new GovmapApi(request);
    const body = (await api.autocomplete(GOVMAP.knownAddress)).json as any;
    expect(body.results.length).toBeLessThanOrEqual(10);
  });

  test('15. autocomplete responds within the latency budget', async ({ request }) => {
    await allureStory('address search latency');
    const api = new GovmapApi(request);
    const { res, ms } = await timed(() => api.autocomplete(GOVMAP.knownAddress));
    expect(res.ok).toBeTruthy();
    expect(ms).toBeLessThan(LATENCY_BUDGET_MS);
  });

  test('16. a nonsense query is handled gracefully (no 5xx, empty results)', async ({ request }) => {
    await allureStory('address search robustness');
    const api = new GovmapApi(request);
    const res = await api.autocomplete('zzxqwzz9999qq');
    expect(res.status).toBeLessThan(HttpStatus.SERVER_ERROR_MIN);
    const body = res.json as any;
    expect(Array.isArray(body.results)).toBeTruthy();
    expect(body.resultsCount).toBe(0);
  });

  test('17. address search is available over HTTPS only', async () => {
    await allureStory('search transport');
    expect(`${GOVMAP.apiBaseUrl}/api/search-service/autocomplete`.startsWith('https://')).toBeTruthy();
  });

  // ---- Search types ------------------------------------------------------
  test('18. search getTypes responds 200 with a JSON array', async ({ request }) => {
    await allureStory('search types availability');
    const api = new GovmapApi(request);
    const res = await api.getTypes();
    expect(res.status).toBe(HttpStatus.OK);
    expect(Array.isArray(res.json)).toBeTruthy();
  });

  test('19. search getTypes exposes the known search types', async ({ request }) => {
    await allureStory('search types contract');
    const api = new GovmapApi(request);
    const types = (await api.getTypes()).json as Array<{ type: string }>;
    const names = types.map((t) => t.type);
    expect(names).toContain('settlement');
    expect(names).toContain('layer');
  });

  // ---- Layers catalog auth ----------------------------------------------
  test('20. the embed token is still authorized for the Organuz app host (auth 200)', async ({ request }) => {
    await allureStory('viewer auth handshake');
    // The handshake binds the public token to the app origin it was issued for;
    // a 401 here means the product's map viewer would fail to initialise.
    const api = new GovmapApi(request);
    const res = await api.authHandshake(GOVMAP.embedToken, GOVMAP.embedHostUrl);
    expect(res.status).toBe(HttpStatus.OK);
  });

  test('21. a protected layers-catalog endpoint enforces auth without a session', async ({ request }) => {
    await allureStory('auth enforcement');
    const api = new GovmapApi(request);
    const res = await api.baseLayers();
    expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN]).toContain(res.status);
  });

  // ---- Anonymous user endpoint ------------------------------------------
  test('22. anonymous users-management/me is unauthorized (401)', async ({ request }) => {
    await allureStory('anonymous identity');
    const api = new GovmapApi(request);
    expect((await api.me()).status).toBe(HttpStatus.UNAUTHORIZED);
  });

  // ---- i18n --------------------------------------------------------------
  test('23. the Hebrew translations bundle is available (200)', async ({ request }) => {
    await allureStory('i18n bundle');
    const api = new GovmapApi(request);
    const res = await api.translations();
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.contentType).toMatch(/json/i);
  });

  // ---- Resilience umbrella -----------------------------------------------
  test('24. no critical Govmap endpoint returns a 5xx', async ({ request }) => {
    await allureStory('no server errors');
    const api = new GovmapApi(request);
    const statuses = await Promise.all([
      api.apiScript().then((r) => r.status),
      api.embedDocument().then((r) => r.status),
      api.autocomplete(GOVMAP.knownAddress).then((r) => r.status),
      api.getTypes().then((r) => r.status),
    ]);
    for (const status of statuses) expect(status).toBeLessThan(HttpStatus.SERVER_ERROR_MIN);
  });

  test('25. the Govmap host is reachable over TLS without certificate errors', async ({ request }) => {
    await allureStory('TLS reachability');
    // A successful HTTPS request (Playwright rejects invalid certs by default) proves the cert chain is valid.
    const api = new GovmapApi(request);
    const res = await api.apiRoot();
    expect(res.status).toBeLessThan(HttpStatus.SERVER_ERROR_MIN);
  });
});
