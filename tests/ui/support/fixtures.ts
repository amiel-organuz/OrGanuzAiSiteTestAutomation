import { test as base } from '../../../src/fixtures';
import { SiteFlows } from '../flows/SiteFlows';

export const test = base.extend<{ siteFlows: SiteFlows }>({
  siteFlows: async ({ page }, use) => {
    await use(new SiteFlows(page));
  },
});

export { expect } from '@playwright/test';
