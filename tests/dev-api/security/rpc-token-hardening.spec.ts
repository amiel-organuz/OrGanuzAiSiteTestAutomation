/**
 * Parametrized token-hardening tests for the Organuz dev RPC gateway
 * (organuz.flamiingo.com). Extends rpc-security.spec.ts (single bogus token) and
 * rpc-input.spec.ts (empty token) with a table of malformed/invalid tokens.
 *
 * The uniform, read-only invariant for every rejected token: a valid method called
 * with it must NEVER return an ok envelope (`{ status: "ok" }`). Different tokens
 * elicit different rejection shapes (reload flag, error status, "Internal Error"
 * banner), so we assert the shared invariant rather than one exact envelope.
 */
import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

interface TokenCase {
  story: string;      // allure story + test name fragment
  token: string;      // the invalid token to send
  severity: 'critical' | 'normal';
}

const TOKEN_CASES: readonly TokenCase[] = [
  { story: 'whitespace-only token', token: '   ', severity: 'critical' },
  { story: 'numeric-only token', token: '000000', severity: 'normal' },
  { story: 'truncated-looking token', token: 'abc', severity: 'normal' },
  { story: 'oversized token', token: 'x'.repeat(4096), severity: 'normal' },
  { story: 'literal "null" token', token: 'null', severity: 'critical' },
];

test.describe('Dev RPC gateway token hardening', { tag: ['@dev-api', '@security'] }, () => {
  for (const { story, token, severity } of TOKEN_CASES) {
    test(`a ${story} is rejected (not an ok envelope)`, async ({ devApi }) => {
      await allureEpic('Dev product API');
      await allureFeature('Security');
      await allureStory(story);
      await allureSeverity(severity);

      await allureStep(`Call get_arena_types with a ${story}`, async () => {
        const res = await devApi.call('get_arena_types', {}, token);
        // The gateway answers reachably (never a network-level failure).
        expect(typeof res.status()).toBe('number');
        // Core invariant: an invalid token never yields an ok envelope, whether the
        // body is a JSON error or a plain-text "Internal Error"-style banner.
        const text = await res.text();
        expect(text, `token "${story}" produced an ok envelope`).not.toContain('"status":"ok"');
      });
    });
  }
});
