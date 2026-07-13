import { expect, test, type APIResponse } from '@playwright/test';
import { allureEpic, allureFeature, allureStory } from '../../src/utils/allure';
import { GOVMAP, LATENCY_BUDGET_MS, autocompleteBody } from './support/endpoints';

/**
 * Dedicated availability + contract monitoring for **Govmap** (`www.govmap.gov.il`),
 * the national map API the product uses to locate a property and geocode its
 * address. These are health checks: when Govmap breaks they fail (that is the
 * alert), so the group is opt-in (`MONITORING_ENABLED=true`) and runs on a
 * schedule rather than in the PR green gate.
 */

const JS = `${GOVMAP.apiBaseUrl}/govmap/api/govmap.api.js`;
const AUTOCOMPLETE = `${GOVMAP.apiBaseUrl}/api/search-service/autocomplete`;
const GET_TYPES = `${GOVMAP.apiBaseUrl}/api/search-service/getTypes`;
const AUTH = `${GOVMAP.apiBaseUrl}/api/layers-catalog/api/auth`;
const BASE_LAYERS = `${GOVMAP.apiBaseUrl}/api/layers-catalog/baseLayers?language=he`;
const ME = `${GOVMAP.apiBaseUrl}/api/users-management/me?viewerOnly=1`;
const TRANSLATIONS = `${GOVMAP.apiBaseUrl}/locales/he/translation.json`;
const EMBED = `${GOVMAP.apiBaseUrl}/?b=2&api_token=${GOVMAP.embedToken}&xy=1&in=1&bb=1&zb=1&et=0&lm=4&lang=he`;

const JSON_HEADERS = { 'content-type': 'application/json' };

async function timed(fn: () => Promise<APIResponse>): Promise<{ res: APIResponse; ms: number }> {
  const start = Date.now();
  const res = await fn();
  return { res, ms: Date.now() - start };
}

test.describe('Govmap API monitoring', { tag: '@monitoring' }, () => {
  test.beforeEach(async () => {
    await allureEpic('External API monitoring');
    await allureFeature('Govmap (www.govmap.gov.il)');
  });

  // ---- Map API script ----------------------------------------------------
  test('1. the govmap.api.js loader is reachable (200)', async ({ request }) => {
    await allureStory('API loader availability');
    expect((await request.get(JS)).status()).toBe(200);
  });

  test('2. govmap.api.js is served as JavaScript', async ({ request }) => {
    await allureStory('API loader content-type');
    const res = await request.get(JS);
    expect(res.headers()['content-type'] ?? '').toMatch(/javascript/i);
  });

  test('3. govmap.api.js is a non-trivial script bundle', async ({ request }) => {
    await allureStory('API loader payload');
    const body = await (await request.get(JS)).text();
    expect(body.length).toBeGreaterThan(100_000);
    expect(body.toLowerCase()).toContain('govmap');
  });

  test('4. govmap.api.js responds within the latency budget', async ({ request }) => {
    await allureStory('API loader latency');
    const { res, ms } = await timed(() => request.get(JS));
    expect(res.ok()).toBeTruthy();
    expect(ms).toBeLessThan(LATENCY_BUDGET_MS);
  });

  test('5. Govmap is served over HTTPS', async () => {
    await allureStory('secure origin');
    expect(GOVMAP.apiBaseUrl.startsWith('https://')).toBeTruthy();
  });

  // ---- Embedded viewer ---------------------------------------------------
  test('6. the embed viewer document loads for the public token (200)', async ({ request }) => {
    await allureStory('embed document');
    expect((await request.get(EMBED)).status()).toBe(200);
  });

  test('7. the embed viewer document is HTML', async ({ request }) => {
    await allureStory('embed content-type');
    const res = await request.get(EMBED);
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/html/i);
  });

  // ---- Address search / geocoding (critical path) ------------------------
  test('8. address autocomplete responds 200', async ({ request }) => {
    await allureStory('address search availability');
    const res = await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) });
    expect(res.status()).toBe(200);
  });

  test('9. address autocomplete returns JSON', async ({ request }) => {
    await allureStory('address search content-type');
    const res = await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) });
    expect(res.headers()['content-type'] ?? '').toMatch(/application\/json/i);
  });

  test('10. a known address returns at least one result', async ({ request }) => {
    await allureStory('geocoding results');
    const body = await (await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) })).json();
    expect(body.resultsCount).toBeGreaterThan(0);
    expect(Array.isArray(body.results)).toBeTruthy();
    expect(body.results.length).toBeGreaterThan(0);
  });

  test('11. the top result matches the queried street', async ({ request }) => {
    await allureStory('geocoding relevance');
    const body = await (await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) })).json();
    expect(body.results[0].text).toContain(GOVMAP.knownStreet);
  });

  test('12. the top result carries a POINT geometry (geocoded)', async ({ request }) => {
    await allureStory('geocoding coordinates');
    const body = await (await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) })).json();
    expect(String(body.results[0].shape)).toMatch(/^POINT\s*\(/);
  });

  test('13. the top result is typed as an address', async ({ request }) => {
    await allureStory('result typing');
    const body = await (await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) })).json();
    expect(body.results[0].type).toBe('address');
  });

  test('14. autocomplete respects maxResults', async ({ request }) => {
    await allureStory('result paging');
    const body = await (await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) })).json();
    expect(body.results.length).toBeLessThanOrEqual(10);
  });

  test('15. autocomplete responds within the latency budget', async ({ request }) => {
    await allureStory('address search latency');
    const { res, ms } = await timed(() => request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) }));
    expect(res.ok()).toBeTruthy();
    expect(ms).toBeLessThan(LATENCY_BUDGET_MS);
  });

  test('16. a nonsense query is handled gracefully (no 5xx, empty results)', async ({ request }) => {
    await allureStory('address search robustness');
    const res = await request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody('zzxqwzz9999qq') });
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    expect(Array.isArray(body.results)).toBeTruthy();
    expect(body.resultsCount).toBe(0);
  });

  test('17. address search is available over HTTPS only', async () => {
    await allureStory('search transport');
    expect(AUTOCOMPLETE.startsWith('https://')).toBeTruthy();
  });

  // ---- Search types ------------------------------------------------------
  test('18. search getTypes responds 200 with a JSON array', async ({ request }) => {
    await allureStory('search types availability');
    const res = await request.post(GET_TYPES, { headers: JSON_HEADERS, data: { language: 'he' } });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test('19. search getTypes exposes the known search types', async ({ request }) => {
    await allureStory('search types contract');
    const types = (await (await request.post(GET_TYPES, { headers: JSON_HEADERS, data: { language: 'he' } })).json()) as Array<{ type: string }>;
    const names = types.map((t) => t.type);
    expect(names).toContain('settlement');
    expect(names).toContain('layer');
  });

  // ---- Layers catalog auth ----------------------------------------------
  test('20. the embed token is still authorized for the Organuz app host (auth 200)', async ({ request }) => {
    await allureStory('viewer auth handshake');
    // The handshake binds the public token to the app origin it was issued for;
    // a 401 here means the product's map viewer would fail to initialise.
    const res = await request.post(AUTH, { headers: JSON_HEADERS, data: { token: GOVMAP.embedToken, hostUrl: GOVMAP.embedHostUrl } });
    expect(res.status()).toBe(200);
  });

  test('21. a protected layers-catalog endpoint enforces auth without a session', async ({ request }) => {
    await allureStory('auth enforcement');
    const res = await request.get(BASE_LAYERS);
    expect([400, 401, 403]).toContain(res.status());
  });

  // ---- Anonymous user endpoint ------------------------------------------
  test('22. anonymous users-management/me is unauthorized (401)', async ({ request }) => {
    await allureStory('anonymous identity');
    expect((await request.get(ME)).status()).toBe(401);
  });

  // ---- i18n --------------------------------------------------------------
  test('23. the Hebrew translations bundle is available (200)', async ({ request }) => {
    await allureStory('i18n bundle');
    const res = await request.get(TRANSLATIONS);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toMatch(/json/i);
  });

  // ---- Resilience umbrella -----------------------------------------------
  test('24. no critical Govmap endpoint returns a 5xx', async ({ request }) => {
    await allureStory('no server errors');
    const statuses = await Promise.all([
      request.get(JS).then((r) => r.status()),
      request.get(EMBED).then((r) => r.status()),
      request.post(AUTOCOMPLETE, { headers: JSON_HEADERS, data: autocompleteBody(GOVMAP.knownAddress) }).then((r) => r.status()),
      request.post(GET_TYPES, { headers: JSON_HEADERS, data: { language: 'he' } }).then((r) => r.status()),
    ]);
    for (const status of statuses) expect(status).toBeLessThan(500);
  });

  test('25. the Govmap host is reachable over TLS without certificate errors', async ({ request }) => {
    await allureStory('TLS reachability');
    // A successful HTTPS request (Playwright rejects invalid certs by default) proves the cert chain is valid.
    const res = await request.get(GOVMAP.apiBaseUrl);
    expect(res.status()).toBeLessThan(500);
  });
});
