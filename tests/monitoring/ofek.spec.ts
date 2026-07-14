import { expect, test, type APIResponse } from '@playwright/test';
import { allureEpic, allureFeature, allureStory } from '../../src/utils/allure';
import { OFEK, LATENCY_BUDGET_MS, orthoTileUrl, labelTileUrl, TILE_HEADERS } from './support/endpoints';
import { ofekBlockReason } from './support/availability';

/**
 * Dedicated availability + contract monitoring for **Ofek** (`basemaps.govmap.gov.il`),
 * the Survey-of-Israel national orthophoto ("אופק"). The product's satellite roof
 * scan runs on these aerial tiles, plus a label/line overlay. When the tiles go
 * down or the layer is renamed, the roof step breaks — so these health checks
 * fail as the alert. Opt-in (`MONITORING_ENABLED=true`), scheduled, not in the PR gate.
 *
 * The tile server only serves requests refered from the Govmap origin, so every
 * tile request carries that Referer (see support/endpoints TILE_HEADERS).
 */

const { z, x, y } = OFEK.sampleTile;

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

async function timed(fn: () => Promise<APIResponse>): Promise<{ res: APIResponse; ms: number }> {
  const start = Date.now();
  const res = await fn();
  return { res, ms: Date.now() - start };
}

function startsWithMagic(buf: Buffer, magic: number[]): boolean {
  return magic.every((byte, i) => buf[i] === byte);
}

test.describe('Ofek orthophoto tiles monitoring', { tag: '@monitoring' }, () => {
  test.beforeEach(async ({ request }) => {
    await allureEpic('External API monitoring');
    await allureFeature('Ofek / Survey-of-Israel orthophoto (basemaps.govmap.gov.il)');
    // Skip (not fail) when this runner is served an HTML block/challenge page —
    // an environmental geo/bot block, not a real Ofek outage or a product bug.
    const reason = await ofekBlockReason(request);
    test.skip(reason !== null, reason ?? '');
  });

  // ---- Orthophoto (aerial) tiles -----------------------------------------
  test('1. an orthophoto tile responds 200 (with the Govmap referer)', async ({ request }) => {
    await allureStory('ortho tile availability');
    expect((await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS })).status()).toBe(200);
  });

  test('2. the orthophoto tile is served as image/jpeg', async ({ request }) => {
    await allureStory('ortho tile content-type');
    const res = await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS });
    expect(res.headers()['content-type'] ?? '').toMatch(/image\/jpeg/i);
  });

  test('3. the orthophoto tile body is non-empty', async ({ request }) => {
    await allureStory('ortho tile payload');
    const buf = await (await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS })).body();
    expect(buf.length).toBeGreaterThan(1000);
  });

  test('4. the orthophoto tile has valid JPEG magic bytes', async ({ request }) => {
    await allureStory('ortho tile integrity');
    const buf = await (await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS })).body();
    expect(startsWithMagic(buf, JPEG_MAGIC)).toBeTruthy();
  });

  test('5. the orthophoto tile responds within the latency budget', async ({ request }) => {
    await allureStory('ortho tile latency');
    const { res, ms } = await timed(() => request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS }));
    expect(res.ok()).toBeTruthy();
    expect(ms).toBeLessThan(LATENCY_BUDGET_MS);
  });

  test('6. the orthophoto tiles are served over HTTPS', async () => {
    await allureStory('secure origin');
    expect(OFEK.tilesBaseUrl.startsWith('https://')).toBeTruthy();
  });

  test('7. the tile server requires the Govmap referer (401 without)', async ({ request }) => {
    await allureStory('referer enforcement');
    expect((await request.get(orthoTileUrl(z, x, y))).status()).toBe(401);
  });

  test('8. the tile server rejects a foreign referer (401)', async ({ request }) => {
    await allureStory('referer enforcement — foreign origin');
    const res = await request.get(orthoTileUrl(z, x, y), { headers: { Referer: 'https://example.com/' } });
    expect(res.status()).toBe(401);
  });

  test('9. the adjacent orthophoto tiles are available', async ({ request }) => {
    await allureStory('grid neighbours');
    for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
      expect((await request.get(orthoTileUrl(z, nx, ny), { headers: TILE_HEADERS })).status()).toBe(200);
    }
  });

  test('10. a 2×2 orthophoto tile grid is fully available', async ({ request }) => {
    await allureStory('grid coverage');
    const coords = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
    const statuses = await Promise.all(coords.map(([tx, ty]) => request.get(orthoTileUrl(z, tx, ty), { headers: TILE_HEADERS }).then((r) => r.status())));
    expect(statuses).toEqual([200, 200, 200, 200]);
  });

  test('11. a deeper-zoom orthophoto tile (roof-scan detail) is available', async ({ request }) => {
    await allureStory('detail zoom imagery');
    // Children of the sample tile two zooms in — the resolution the roof scan uses.
    expect((await request.get(orthoTileUrl(z + 2, x * 4, y * 4), { headers: TILE_HEADERS })).status()).toBe(200);
  });

  test('12. the orthophoto tile size is within a sane range (not an error page)', async ({ request }) => {
    await allureStory('ortho tile sanity');
    const buf = await (await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS })).body();
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.length).toBeLessThan(2_000_000);
  });

  test('13. the orthophoto tile advertises CDN caching', async ({ request }) => {
    await allureStory('tile caching');
    const headers = (await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS })).headers();
    const cacheable = Boolean(headers['cache-control'] || headers['etag'] || headers['age'] || headers['expires']);
    expect(cacheable).toBeTruthy();
  });

  // ---- Label / line overlay tiles ----------------------------------------
  test('14. a label overlay tile responds 200 (with the Govmap referer)', async ({ request }) => {
    await allureStory('label tile availability');
    expect((await request.get(labelTileUrl(z, x, y), { headers: TILE_HEADERS })).status()).toBe(200);
  });

  test('15. the label tile is served as image/png', async ({ request }) => {
    await allureStory('label tile content-type');
    const res = await request.get(labelTileUrl(z, x, y), { headers: TILE_HEADERS });
    expect(res.headers()['content-type'] ?? '').toMatch(/image\/png/i);
  });

  test('16. the label tile has valid PNG magic bytes', async ({ request }) => {
    await allureStory('label tile integrity');
    const buf = await (await request.get(labelTileUrl(z, x, y), { headers: TILE_HEADERS })).body();
    expect(startsWithMagic(buf, PNG_MAGIC)).toBeTruthy();
  });

  test('17. the label tile body is non-empty', async ({ request }) => {
    await allureStory('label tile payload');
    const buf = await (await request.get(labelTileUrl(z, x, y), { headers: TILE_HEADERS })).body();
    expect(buf.length).toBeGreaterThan(200);
  });

  test('18. the label tile responds within the latency budget', async ({ request }) => {
    await allureStory('label tile latency');
    const { res, ms } = await timed(() => request.get(labelTileUrl(z, x, y), { headers: TILE_HEADERS }));
    expect(res.ok()).toBeTruthy();
    expect(ms).toBeLessThan(LATENCY_BUDGET_MS);
  });

  test('19. the label tile also requires the Govmap referer (401 without)', async ({ request }) => {
    await allureStory('label referer enforcement');
    expect((await request.get(labelTileUrl(z, x, y))).status()).toBe(401);
  });

  test('20. ortho and label tiles are both available for the same coordinate', async ({ request }) => {
    await allureStory('overlay alignment');
    const [ortho, label] = await Promise.all([
      request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS }).then((r) => r.status()),
      request.get(labelTileUrl(z, x, y), { headers: TILE_HEADERS }).then((r) => r.status()),
    ]);
    expect([ortho, label]).toEqual([200, 200]);
  });

  // ---- TLS / resilience / layer-name guards ------------------------------
  test('21. the Ofek tiles host is reachable over TLS', async ({ request }) => {
    await allureStory('TLS reachability');
    // A completed HTTPS request (valid cert) even if the root path 401/404s.
    const res = await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS });
    expect(res.status()).toBeLessThan(500);
  });

  test('22. orthophoto tiles do not return server errors across a sample', async ({ request }) => {
    await allureStory('no server errors');
    const coords = [[z, x, y], [z, x + 1, y], [z + 1, x * 2, y * 2], [z + 2, x * 4, y * 4]];
    const statuses = await Promise.all(coords.map(([tz, tx, ty]) => request.get(orthoTileUrl(tz, tx, ty), { headers: TILE_HEADERS }).then((r) => r.status())));
    for (const status of statuses) expect(status).toBeLessThan(500);
  });

  test('23. the configured orthophoto layer still serves imagery (guards a silent rename)', async ({ request }) => {
    await allureStory('ortho layer drift guard');
    const res = await request.get(orthoTileUrl(z, x, y), { headers: TILE_HEADERS });
    expect(res.status(), `orthophoto layer "${OFEK.orthoLayer}" did not serve a tile — it may have been renamed`).toBe(200);
  });

  test('24. the configured labels layer still serves tiles (guards a silent rename)', async ({ request }) => {
    await allureStory('labels layer drift guard');
    const res = await request.get(labelTileUrl(z, x, y), { headers: TILE_HEADERS });
    expect(res.status(), `labels layer "${OFEK.labelsLayer}" did not serve a tile — it may have been renamed`).toBe(200);
  });

  test('25. a batch of orthophoto tiles are all image/jpeg (content-type consistency)', async ({ request }) => {
    await allureStory('content-type consistency');
    const coords = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
    const types = await Promise.all(coords.map(([tx, ty]) => request.get(orthoTileUrl(z, tx, ty), { headers: TILE_HEADERS }).then((r) => r.headers()['content-type'] ?? '')));
    for (const ct of types) expect(ct).toMatch(/image\/jpeg/i);
  });
});
