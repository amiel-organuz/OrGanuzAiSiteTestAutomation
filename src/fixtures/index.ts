import * as fs from 'fs';
import { test as base } from '@playwright/test';
import { HomePage, BlogPage } from '../pages';
import { allureAttachment } from '../utils/allure';
import { logger } from '../utils/logger';
import { ApiClient, OrganuzApi } from '../api';
import type { ApiExchangeLog } from '../api';
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

const MAX_API_ATTACHMENT_CHARS = 12_000;

function truncate(value: string): string {
  if (value.length <= MAX_API_ATTACHMENT_CHARS) return value;
  return `${value.slice(0, MAX_API_ATTACHMENT_CHARS)}\n... truncated ${value.length - MAX_API_ATTACHMENT_CHARS} chars`;
}

function stringify(value: unknown): string {
  if (value === undefined) return '<none>';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n') || '<none>';
}

function formatApiExchange(exchange: ApiExchangeLog): string {
  const { request, response, error } = exchange;
  const requestBody = stringify(request.data);
  const params = stringify(request.params);

  const sections = [
    'REQUEST',
    `${request.method} ${request.url}`,
    `Path: ${request.path}`,
    `Attempt: ${request.attempt}/${request.maxAttempts}`,
    `Timeout: ${request.timeout}ms`,
    'Query params:',
    params,
    'Headers:',
    formatHeaders(request.headers),
    'Body:',
    truncate(requestBody),
  ];

  if (response) {
    sections.push(
      '',
      'RESPONSE',
      `Status: ${response.status} ${response.statusText}`,
      `Duration: ${response.durationMs}ms`,
      'Headers:',
      formatHeaders(response.headers),
      'Body:',
      truncate(response.body),
    );
  }

  if (error) {
    sections.push(
      '',
      'ERROR',
      `${error.name}: ${error.message}`,
      `Duration: ${error.durationMs}ms`,
    );
  }

  return sections.join('\n');
}

async function attachApiExchange(exchange: ApiExchangeLog): Promise<void> {
  const { request, response, error } = exchange;
  const outcome = response ? response.status : `error ${error?.name ?? 'unknown'}`;
  await allureAttachment(
    `API ${request.method} ${request.path} — ${outcome} (${request.attempt}/${request.maxAttempts})`,
    formatApiExchange(exchange),
    'text/plain',
  );
}

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
      onExchange: attachApiExchange,
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
