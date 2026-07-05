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

export { expect } from '@playwright/test';
