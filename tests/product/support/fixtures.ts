import { test as base } from '../../../src/fixtures';
import { ProductFlows } from './ProductFlows';

/**
 * Product-app test fixture: exposes `product` (high-level ProductFlows) on top of
 * the shared fixtures (Allure attachments + failure capture). Import `test`/`expect`
 * from here in tests/product specs to keep them short.
 */
export const test = base.extend<{ product: ProductFlows }>({
  product: async ({ page }, use) => {
    await use(new ProductFlows(page));
  },
});

export { expect } from '@playwright/test';
