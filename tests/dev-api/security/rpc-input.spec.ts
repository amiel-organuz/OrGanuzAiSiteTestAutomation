/**
 * Input-hardening tests for the Organuz dev RPC gateway.
 * Complements rpc-security.spec.ts (unknown method, invalid token) with an empty
 * token and an injection-style extra parameter. All read-only.
 */
import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Dev RPC gateway input hardening', { tag: ['@dev-api', '@security'] }, () => {
  test('an empty token is rejected (not an ok envelope)', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Security');
    await allureStory('Empty token');
    await allureSeverity('critical');

    await allureStep('Call a valid method with an empty token', async () => {
      const res = await devApi.call('get_arena_types', {}, '');
      const text = await res.text();
      // The gateway returns a non-ok error (e.g. "Internal Error (API02)"), never an ok envelope.
      expect(text).not.toContain('"status":"ok"');
    });
  });

  test('an unexpected/injection-style parameter is ignored, not executed', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Security');
    await allureStory('Extra param is inert');
    await allureSeverity('normal');

    await allureStep('A junk SQL-looking param does not break the call', async () => {
      const res = await devApi.call('get_arena_types', { evil: "'; DROP TABLE arenas;--" });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThan(0);
    });
  });
});
