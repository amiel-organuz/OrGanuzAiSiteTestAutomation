/**
 * Product app — dedicated sign-out flow (dev).
 *
 * Sign-out is verified here with its OWN fresh login (loginAs, NOT the shared storageState
 * the other per-role specs resume via test.use({ authRole })). Logging out may revoke the
 * session server-side; giving this test an independent session guarantees that can never
 * invalidate the sessions the reused-session specs run against in parallel. One role is
 * enough — the sign-out UI (user menu → "התנתק" → re-gated calculator) is identical across
 * roles; roles.spec.ts / role-areas.spec.ts already cover the per-role menu differences.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true + persona OTP (dev fixed OTP 7777). Note: this is
 * the one product spec that still performs a login of its own, so it costs one extra OTP
 * send for its role; if that role is in cooldown it skips gracefully (see ProductFlows).
 */
import { test } from '../support/fixtures';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

// Any authenticated role exercises the same sign-out UI; company uses its own phone number.
const LOGOUT_ROLE: ProductPersonaId = 'company';

test.describe('Product sign-out (dev)', { tag: ['@product', '@sanity', '@e2e', '@roles'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to run the authenticated sign-out flow.');
  test.describe.configure({ timeout: 150_000 });

  test('signing out returns to the gated public calculator', { tag: '@critical' }, async ({ product }) => {
    await allureEpic('Product app');
    await allureFeature('Sign-out');
    await allureStory(LOGOUT_ROLE);
    await allureSeverity('critical');

    // Fresh, independent login — no authRole, so this does NOT reuse the shared session.
    await product.loginAs(LOGOUT_ROLE);
    await product.logout();
    await product.expectLoggedOut();
  });
});
