import { APIResponse } from '@playwright/test';
import { test as base } from '../../../src/fixtures';
import { config } from '../../../src/utils/config';
import { FlamiingoApi } from './FlamiingoApi';

/**
 * Fixture for the dev product-app backend (organuz.flamiingo.com RPC gateway).
 * Import `test`/`expect` from here in tests/dev-api specs.
 *
 * The dev host is periodically toggled into a maintenance state that answers every
 * request with a plain-text banner ("Debug Mode Off") instead of JSON, and it
 * sometimes flaps in and out of it mid-run. To keep that outage from turning the
 * suite red, `devApi.call` is wrapped so that ANY call which (after FlamiingoApi's
 * own retries) still returns the maintenance banner SKIPS the test — from wherever
 * in the test it happens — rather than failing it. When the gateway serves JSON the
 * tests run and assert normally, still catching real regressions.
 */
export const test = base.extend<{ devApi: FlamiingoApi }>({
  devApi: async ({ request }, use) => {
    const api = new FlamiingoApi(request, config.devApi.baseUrl, config.devApi.token);
    const rawCall = api.call.bind(api);

    api.call = async (
      method: string,
      params: Record<string, string> = {},
      token?: string,
    ): Promise<APIResponse> => {
      const response = await rawCall(method, params, token);
      test.skip(
        FlamiingoApi.isMaintenanceBanner(await response.text()),
        'Dev RPC gateway (organuz.flamiingo.com) is in maintenance ("Debug Mode Off") — skipping dev-api tests.',
      );
      return response;
    };

    await use(api);
  },
});

export { expect } from '@playwright/test';
