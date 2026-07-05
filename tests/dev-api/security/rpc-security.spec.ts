/**
 * Negative / security contract tests for the Organuz dev RPC gateway
 * (organuz.flamiingo.com). All read-only; no state is changed.
 */
import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Dev RPC gateway security', { tag: ['@dev-api', '@security'] }, () => {
  test('an unknown call returns a structured "Call not found" error', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Security');
    await allureStory('Unknown method');
    await allureSeverity('normal');

    await allureStep('Invoke a non-existent RPC method', async () => {
      const res = await devApi.call('this_method_does_not_exist_xyz');
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toMatch(/call not found/i);
      expect(body.call).toBe('this_method_does_not_exist_xyz');
    });
  });

  test('an invalid token is rejected (not an ok envelope)', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Security');
    await allureStory('Invalid token');
    await allureSeverity('critical');

    await allureStep('Call a valid method with a bogus token', async () => {
      const res = await devApi.call('get_arena_types', {}, 'not-a-valid-token');
      const body = await res.json();
      // The gateway signals an expired/invalid link and asks the client to reload.
      expect(body.status).not.toBe('ok');
      const isRejected = body.reload === true || body.result?.type === 'error' || body.status === 'error';
      expect(isRejected, `expected a rejection envelope, got ${JSON.stringify(body).slice(0, 200)}`).toBe(true);
    });
  });

  test('the gateway root is reachable', async ({ devApi }) => {
    await allureEpic('Dev product API');
    await allureFeature('Security');
    await allureStory('Availability');
    await allureSeverity('minor');

    await allureStep('A known method responds 200', async () => {
      const res = await devApi.call('get_arena_types');
      expect(res.status()).toBe(200);
    });
  });
});
