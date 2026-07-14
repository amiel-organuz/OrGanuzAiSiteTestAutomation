import { test as base } from '../../../src/fixtures';
import { HomeFlows } from './HomeFlows';

/**
 * Marketing-UI test fixture: exposes `home` (the HomeFlows mid-layer) on top of the
 * shared fixtures. Import `test`/`expect` from here in tests/ui specs that drive the home
 * page; `blogPage` and the rest remain available via the base fixture.
 */
export const test = base.extend<{ home: HomeFlows }>({
  home: async ({ page }, use) => {
    await use(new HomeFlows(page));
  },
});

export { expect } from '@playwright/test';
