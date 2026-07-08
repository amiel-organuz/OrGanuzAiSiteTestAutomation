/**
 * Contract tests for the Organuz dev product-app backend (organuz.flamiingo.com).
 *
 * It is an RPC gateway: POST / with `call=<method>`, returning `{ status: "ok", ... }`.
 * These assert the read-only public methods the app calls before login adhere to
 * their response envelope and shapes. See tests/dev-api/support/FlamiingoApi.ts.
 */
import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Contract: dev RPC gateway', { tag: ['@dev-api', '@contract'] }, () => {
  test('get_arena_types returns 200 JSON with an ok envelope', { tag: '@other-smoke' }, async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('RPC envelope');
    await allureStory('get_arena_types');
    await allureSeverity('critical');

    await allureStep('POST call=get_arena_types', async () => {
      const res = await devApi.call('get_arena_types');
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/json');
      const body = await res.json();
      expect(body.status).toBe('ok');
    });
  });

  test('get_arena_types itemsFound matches items length and each item is well-formed', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Arena types');
    await allureStory('Item shape');
    await allureSeverity('critical');

    await allureStep('Assert count invariant + item_id/type/title on every item', async () => {
      const body = await (await devApi.call('get_arena_types')).json();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.itemsFound).toBe(body.items.length);
      expect(body.items.length).toBeGreaterThan(0);
      for (const item of body.items) {
        expect(typeof item.item_id).toBe('string');
        expect(item.item_id.length).toBeGreaterThan(0);
        expect(item.type, `type "${item.type}" not an ARENA_TYPE_*`).toMatch(/^ARENA_TYPE_[A-Z]+$/);
        expect(typeof item.title).toBe('string');
        expect(item.title.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test('get_arena_types exposes the two known arenas (MAIN and RAMOT)', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Arena types');
    await allureStory('Known arenas');
    await allureSeverity('normal');

    await allureStep('Assert ARENA_TYPE_MAIN and ARENA_TYPE_RAMOT are present', async () => {
      const body = await (await devApi.call('get_arena_types')).json();
      const types = body.items.map((i: { type: string }) => i.type);
      expect(types).toContain('ARENA_TYPE_MAIN');
      expect(types).toContain('ARENA_TYPE_RAMOT');
    });
  });

  test('get_remaining_projects returns an ok envelope with project quota objects', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Remaining projects');
    await allureStory('Quota shape');
    await allureSeverity('normal');

    await allureStep('Assert item.remaining_projects and max_projects are objects', async () => {
      const res = await devApi.call('get_remaining_projects');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.item).toBeDefined();
      expect(typeof body.item.remaining_projects).toBe('object');
      expect(typeof body.item.max_projects).toBe('object');
      // Quotas are keyed by arena id → integer caps.
      for (const cap of Object.values(body.item.max_projects)) {
        expect(Number.isFinite(Number(cap))).toBe(true);
      }
    });
  });
});
