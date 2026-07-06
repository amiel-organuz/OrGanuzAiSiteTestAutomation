import { test as base } from '../../../src/fixtures';
import { config } from '../../../src/utils/config';
import { FlamiingoApi } from './FlamiingoApi';

/**
 * Fixture for the dev product-app backend (organuz.flamiingo.com RPC gateway).
 * Import `test`/`expect` from here in tests/dev-api specs.
 */
export const test = base.extend<{ devApi: FlamiingoApi }>({
  devApi: async ({ request }, use) => {
    await use(new FlamiingoApi(request, config.devApi.baseUrl, config.devApi.token));
  },
});

/**
 * Availability guard for the shared dev backend.
 *
 * organuz.flamiingo.com is a dev environment that developers occasionally toggle
 * into a maintenance/off state where every request returns a plain-text banner
 * (e.g. "Debug Mode Off") instead of a JSON envelope. When that happens these
 * contract tests can't run meaningfully, so we SKIP them (with a clear reason)
 * rather than reporting a wall of failures for an outage outside our control.
 *
 * The guard only trips when the gateway is not serving JSON at all — if it returns
 * any JSON (ok or error envelope) the tests run and still catch real regressions.
 * Probed once per worker and memoized.
 */
// Cache only the confirmed-up state: while the gateway is down we keep re-probing
// so a recovery is picked up (and FlamiingoApi.call already retries transient flaps).
let gatewayUp = false;

test.beforeEach(async ({ devApi }) => {
  if (!gatewayUp) {
    try {
      const body = await (await devApi.call('get_arena_types')).text();
      gatewayUp = !FlamiingoApi.isMaintenanceBanner(body);
    } catch {
      gatewayUp = false;
    }
  }

  test.skip(
    !gatewayUp,
    'Dev RPC gateway (organuz.flamiingo.com) is in maintenance (e.g. "Debug Mode Off") — skipping dev-api contract tests.',
  );
});

export { expect } from '@playwright/test';
