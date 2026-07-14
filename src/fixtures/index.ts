import * as fs from 'fs';
import { test as base } from '@playwright/test';
import { HomePage, BlogPage } from '../pages';
import { allureAttachment } from '../utils/allure';
import { logger } from '../utils/logger';
import { ApiClient, OrganuzApi, allureApiExchangeLogger } from '../api';
import { config } from '../utils/config';

export type Pages = {
  homePage: HomePage;
  blogPage: BlogPage;
};

export type ApiFixtures = {
  organuzApiClient: ApiClient;
  organuzApi: OrganuzApi;
};

export type AutoFixtures = {
  _failureCapture: void;
};

const pagesTest = base.extend<Pages & ApiFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  blogPage: async ({ page }, use) => {
    await use(new BlogPage(page));
  },
  organuzApiClient: async ({ request }, use) => {
    await use(new ApiClient(request, {
      baseUrl: config.organuzApi.baseUrl,
      timeout: config.organuzApi.timeout,
      headers: {
        apikey: config.organuzApi.anonKey,
        Authorization: `Bearer ${config.organuzApi.anonKey}`,
      },
      onExchange: allureApiExchangeLogger,
    }));
  },
  organuzApi: async ({ organuzApiClient }, use) => {
    await use(new OrganuzApi(organuzApiClient));
  },
});

export const test = pagesTest.extend<AutoFixtures>({
  _failureCapture: [async ({}, use, testInfo) => {
    await use(undefined as unknown as void);

    if (testInfo.status === testInfo.expectedStatus) return;

    logger.fail(`Test "${testInfo.title}"`, testInfo.errors[0]?.message);

    const allureNames: Record<string, string> = {
      screenshot: 'Last screenshot',
      video: 'Failure video',
      trace: 'Trace',
    };

    for (const att of testInfo.attachments) {
      if (!att.path || !fs.existsSync(att.path)) continue;
      try {
        const body = fs.readFileSync(att.path);
        await allureAttachment(
          allureNames[att.name] ?? att.name,
          body,
          att.contentType || 'application/octet-stream',
        );
        logger.info(`Attached ${att.name}: ${att.path}`);
      } catch {
        logger.warn(`Could not attach ${att.name}`);
      }
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
