import * as fs from 'fs';
import { test as base } from '@playwright/test';
import { HomePage, BlogPage } from '../pages';
import { allureAttachment } from '../utils/allure';
import { logger } from '../utils/logger';
import { ApiClient, PostsApi, UsersApi, CommentsApi, AlbumsApi } from '../api';
import { config } from '../utils/config';

export type Pages = {
  homePage: HomePage;
  blogPage: BlogPage;
};

export type ApiFixtures = {
  apiClient: ApiClient;
  postsApi: PostsApi;
  usersApi: UsersApi;
  commentsApi: CommentsApi;
  albumsApi: AlbumsApi;
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
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request, { baseUrl: config.api.baseUrl, timeout: config.api.timeout }));
  },
  postsApi: async ({ apiClient }, use) => {
    await use(new PostsApi(apiClient));
  },
  usersApi: async ({ apiClient }, use) => {
    await use(new UsersApi(apiClient));
  },
  commentsApi: async ({ apiClient }, use) => {
    await use(new CommentsApi(apiClient));
  },
  albumsApi: async ({ apiClient }, use) => {
    await use(new AlbumsApi(apiClient));
  },
});

export const test = pagesTest.extend<AutoFixtures>({
  _failureCapture: [async ({ page }, use, testInfo) => {
    await use(undefined as unknown as void);

    if (testInfo.status === testInfo.expectedStatus) return;

    logger.fail(`Test "${testInfo.title}"`, testInfo.errors[0]?.message);

    try {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', { body: screenshot, contentType: 'image/png' });
      await allureAttachment('Last screenshot', screenshot, 'image/png');
      logger.info('Screenshot captured');
    } catch {
      logger.warn('Screenshot unavailable (page already closed)');
    }

    try {
      const videoPath = await page.video()?.path();
      if (videoPath && fs.existsSync(videoPath)) {
        await allureAttachment('Failure video', fs.readFileSync(videoPath), 'video/webm');
        logger.info(`Video: ${videoPath}`);
      }
    } catch {
      logger.warn('Video unavailable');
    }

    const traceAttachment = testInfo.attachments.find(a => a.name === 'trace');
    if (traceAttachment?.path && fs.existsSync(traceAttachment.path)) {
      await allureAttachment('Trace', fs.readFileSync(traceAttachment.path), 'application/zip');
      logger.info(`Trace: ${traceAttachment.path}`);
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
