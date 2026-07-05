/**
 * Cross-endpoint + invariant contract tests for the Organuz dev RPC gateway.
 * Complements contracts/rpc-contract.spec.ts (single-method envelope/shape) with:
 *   - idempotency of get_arena_types across calls,
 *   - the project-quota invariants (remaining <= max, non-negative integers), and
 *   - the cross-endpoint contract that get_remaining_projects is keyed by the very
 *     arena item_ids that get_arena_types advertises.
 * All read-only.
 */
import { test, expect } from '../support/fixtures';
import { FlamiingoApi } from '../support/FlamiingoApi';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

interface ArenaItem {
  item_id: string;
  type: string;
  title: string;
}

async function arenaItems(devApi: FlamiingoApi): Promise<ArenaItem[]> {
  const body: { items: ArenaItem[] } = await (await devApi.call('get_arena_types')).json();
  return body.items;
}

test.describe('Contract: dev RPC invariants', { tag: ['@dev-api', '@contract'] }, () => {
  test('get_arena_types is idempotent — the same arena set across calls', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Arena types');
    await allureStory('Idempotency');
    await allureSeverity('normal');

    await allureStep('Call twice and compare the sorted (item_id,type) set', async () => {
      const key = (items: ArenaItem[]) => items.map((i) => `${i.item_id}:${i.type}`).sort();
      expect(key(await arenaItems(devApi))).toEqual(key(await arenaItems(devApi)));
    });
  });

  test('get_remaining_projects quotas are non-negative integers with remaining <= max', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Remaining projects');
    await allureStory('Quota invariants');
    await allureSeverity('critical');

    await allureStep('For every arena: 0 <= remaining <= max, both integers', async () => {
      const { item } = await (await devApi.call('get_remaining_projects')).json();
      const remaining: Record<string, unknown> = item.remaining_projects;
      const max: Record<string, unknown> = item.max_projects;

      expect(Object.keys(max).length).toBeGreaterThan(0);
      for (const [arenaId, cap] of Object.entries(max)) {
        const maxN = Number(cap);
        const remN = Number(remaining[arenaId]);
        expect(Number.isInteger(maxN), `max for ${arenaId} not an integer`).toBe(true);
        expect(Number.isInteger(remN), `remaining for ${arenaId} not an integer`).toBe(true);
        expect(maxN).toBeGreaterThanOrEqual(0);
        expect(remN).toBeGreaterThanOrEqual(0);
        expect(remN, `remaining (${remN}) exceeds max (${maxN}) for ${arenaId}`).toBeLessThanOrEqual(maxN);
      }
    });
  });

  test('cross-endpoint: remaining-projects arenas are all known arena item_ids', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Cross-endpoint contract');
    await allureStory('Quota keys ↔ arena item_ids');
    await allureSeverity('normal');

    await allureStep('Every max_projects key is an item_id returned by get_arena_types', async () => {
      const knownArenaIds = new Set((await arenaItems(devApi)).map((i) => i.item_id));
      const { item } = await (await devApi.call('get_remaining_projects')).json();

      const quotaArenaIds = Object.keys(item.max_projects);
      expect(quotaArenaIds.length).toBeGreaterThan(0);
      for (const arenaId of quotaArenaIds) {
        expect(knownArenaIds.has(arenaId), `quota arena ${arenaId} is not a known arena item_id`).toBe(true);
      }
    });
  });
});
