// `devices` is only needed by the disabled chromium / product projects below;
// re-add it to this import when re-enabling them.
import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { config } from './src/utils/config';

const includeLowPriorityTests = process.env.INCLUDE_LOW_PRIORITY_TESTS === 'true';

// External-API monitoring (Govmap + Ofek) is opt-in: it hits live third-party
// services and is meant to FAIL when they break (the alert), so it runs on a
// schedule / on demand, never in the default green suite. Enable with
// MONITORING_ENABLED=true (see `npm run test:monitoring`).
const includeMonitoring = process.env.MONITORING_ENABLED === 'true';

// Shared browser context for the product app: the auth-setup project and the product
// project must use the same origin/viewport so saved sessions restore cleanly.
// Disabled together with the product projects below (re-add `devices` to the import
// above and uncomment when re-enabling them).
// const productUse = {
//   ...devices['Desktop Chrome'],
//   baseURL: config.app.baseUrl,
//   viewport: { width: 1920, height: 1080 },
//   headless: true,
// };

export default defineConfig({
  testDir: './tests',
  ...(includeLowPriorityTests ? {} : { grepInvert: /@low-priority/ }),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : config.playwright.workers,
  timeout: config.playwright.defaultTimeout,
  expect: { timeout: config.playwright.defaultTimeout },

  reporter: [
    ...(!process.env.PLAYWRIGHT_MERGE_REPORTS
      ? [['blob', { outputDir: 'blob-report/' }] as const]
      : []),
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: false,
        suiteTitle: true,
        environmentInfo: {
          node_version: process.version,
          playwright_version: require('@playwright/test/package.json').version,
          os: process.platform,
          ci: process.env.CI ? 'true' : 'false',
          web_base_url: config.web.baseUrl,
          app_base_url: config.app.baseUrl,
          organuz_api_base_url: config.organuzApi.baseUrl,
          include_low_priority_tests: includeLowPriorityTests ? 'true' : 'false',
          browser: config.playwright.browser,
          workers: String(config.playwright.workers),
          default_timeout_ms: String(config.playwright.defaultTimeout),
        },
      },
    ],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    // Marketing-site (organuz.ai) UI project is disabled. Re-enable by re-adding
    // `devices` to the import above and uncommenting this block. tests/ui/** is kept.
    // {
    //   name: 'chromium',
    //   testMatch: 'tests/ui/**/*.spec.ts',
    //   grep: /@other-smoke/,
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     baseURL: config.web.baseUrl,
    //     viewport: { width: 1920, height: 1080 },
    //     headless: true,
    //   },
    // },
    // Product app projects (target the *.organuz.com calculator) are disabled.
    // Re-enable by uncommenting the product / product-setup / product-authenticated
    // blocks below. Spec files under tests/product/** are kept.
    // {
    //   name: 'product',
    //   testMatch: 'tests/product/**/*.spec.ts',
    //   // The per-role live specs run in product-authenticated (they need saved sessions).
    //   testIgnore: 'tests/product/flows/**',
    //   use: productUse,
    // },
    // {
    //   // Authenticates each sign-in role once and saves its storageState. Skip-safe:
    //   // roles without credentials (or when the dev app/OTP is down) are skipped.
    //   name: 'product-setup',
    //   testMatch: 'tests/product/support/auth.setup.ts',
    //   use: productUse,
    // },
    // {
    //   // Live per-role sanity e2e that resume the saved sessions. Depends on the setup
    //   // project; individual specs skip when their role has no saved session.
    //   name: 'product-authenticated',
    //   testMatch: 'tests/product/flows/**/*.spec.ts',
    //   dependencies: ['product-setup'],
    //   use: productUse,
    // },
    {
      name: 'organuz-api',
      testMatch: 'tests/organuz-api/**/*.spec.ts',
      grep: /@other-smoke/,
      use: {
        baseURL: config.organuzApi.baseUrl,
      },
    },
    {
      name: 'agent',
      testMatch: 'tests/agent/**/*.spec.ts',
      grep: /@other-smoke/,
    },
    // Opt-in external-dependency monitoring; only registered when MONITORING_ENABLED=true
    // so the default suite never runs live third-party checks.
    ...(includeMonitoring
      ? [
          {
            name: 'monitoring',
            testMatch: 'tests/monitoring/**/*.spec.ts',
          },
        ]
      : []),
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'], baseURL: config.web.baseUrl },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'], baseURL: config.web.baseUrl },
    // },
  ],

  outputDir: 'test-results/',
});
