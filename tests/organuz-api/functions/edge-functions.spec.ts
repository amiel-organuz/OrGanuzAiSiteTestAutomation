/**
 * Edge Function availability tests for organuz.
 *
 * The site posts to two Supabase Edge Functions (send-contact-email,
 * send-newsletter-subscription). We deliberately DO NOT invoke them (that would
 * send real email / create real subscriptions). Instead we assert the CORS
 * preflight (OPTIONS) succeeds, which proves each function is deployed and
 * reachable from the site's origin without any side effect.
 */
import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

const SITE_ORIGIN = 'https://www.organuz.ai';
const EDGE_FUNCTIONS = ['send-contact-email', 'send-newsletter-subscription'] as const;

for (const fn of EDGE_FUNCTIONS) {
  test.describe(`Edge function: ${fn}`, { tag: ['@organuz-api', '@functions'] }, () => {
    test(`CORS preflight for ${fn} succeeds (no invocation)`, async ({ request }) => {
      await allureEpic('Organuz API');
      await allureFeature('Edge functions');
      await allureStory(fn);
      await allureSeverity('critical');

      await allureStep('Send OPTIONS preflight from the site origin', async () => {
        const response = await request.fetch(`/functions/v1/${fn}`, {
          method: 'OPTIONS',
          headers: {
            Origin: SITE_ORIGIN,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type,apikey',
          },
          failOnStatusCode: false,
        });

        // Preflight should be accepted (200/204) — proves the function exists.
        expect([200, 204]).toContain(response.status());
      });

      await allureStep('Assert CORS headers allow the site origin', async () => {
        const response = await request.fetch(`/functions/v1/${fn}`, {
          method: 'OPTIONS',
          headers: {
            Origin: SITE_ORIGIN,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type,apikey',
          },
          failOnStatusCode: false,
        });
        const allowOrigin = response.headers()['access-control-allow-origin'];
        expect(allowOrigin, 'missing Access-Control-Allow-Origin').toBeTruthy();
        // Supabase functions typically reflect "*" or the caller origin.
        expect(allowOrigin === '*' || allowOrigin === SITE_ORIGIN).toBe(true);
      });
    });
  });
}
