/**
 * Authenticated variant of the token-extractor e2e tests.
 *
 * These use the `productAuthToken` setup fixture: it resumes the role's saved session
 * (written once by product-setup — no per-test OTP), navigates to the personal area so
 * the authenticated UI makes a backend call, and extracts the per-user SESSION token
 * (the one that differs from the public bundle token) BEFORE the test body runs. The
 * tests then assert on that authenticated session token.
 *
 * Runs in the `product-authenticated` project (depends on product-setup). When a role
 * has no saved session — product-setup skipped on the dev OTP cooldown — resumeSession
 * skips the test with a clear reason, so this file is safe to run anytime.
 *
 * Run:  PRODUCT_E2E_ENABLED=true \
 *       npx playwright test tests/product/flows/token-session.spec.ts --project=product-authenticated --workers=1
 */
import { test, expect } from '../support/fixtures';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
} from '../../../src/utils/allure';

const ROLES: readonly ProductPersonaId[] = ['customer', 'consultant', 'company'];

test.describe('Authenticated session token via extractor', { tag: ['@product', '@e2e', '@roles'] }, () => {
  test.describe.configure({ timeout: 180_000 });

  for (const role of ROLES) {
    test.describe(role, () => {
      test.use({ authRole: role });

      test.beforeEach(async () => {
        await allureEpic('Product app');
        await allureFeature('Authenticated token extraction');
        await allureStory(role);
      });

      test('extracts a per-user session token distinct from the public bundle token', { tag: '@critical' }, async ({ productAuthToken }) => {
        await allureSeverity('critical');

        expect(productAuthToken.sessionToken, 'no authenticated session token captured').toBeTruthy();
        expect(
          productAuthToken.sessionToken,
          'session token equals the public bundle token — auth did not swap it',
        ).not.toBe(productAuthToken.publicToken);
      });

      test('sends the session token in the body over HTTPS, never in the URL', { tag: '@security' }, async ({ productAuthToken }) => {
        await allureSeverity('critical');

        const authCalls = productAuthToken.interceptor
          .all()
          .filter((c) => c.token === productAuthToken.sessionToken);
        expect(authCalls.length, 'no authenticated backend calls captured').toBeGreaterThan(0);
        for (const call of authCalls) {
          expect(call.url.startsWith('https:'), `session call not over HTTPS: ${call.url}`).toBe(true);
          expect(
            new URL(call.url).searchParams.get('token'),
            `session token leaked into the URL: ${call.url}`,
          ).toBeNull();
        }
      });
    });
  }
});
