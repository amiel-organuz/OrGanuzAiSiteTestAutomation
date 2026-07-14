import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Env credentials/overrides are split per target env under `env/`:
// `env/.dev.env` (default) and `env/.prod.env`, selected by QA_TARGET_ENV.
// The env-specific file is loaded first (wins); a root `.env`, if present, is a
// fallback for any shared vars not in the env file (dotenv never overrides).
const targetEnv = (process.env.QA_TARGET_ENV || 'dev').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, `env/.${targetEnv}.env`) });
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { config } from './src/utils/config';

const includeLowPriorityTests = process.env.INCLUDE_LOW_PRIORITY_TESTS === 'true';

// External-API monitoring (Govmap + Ofek) is opt-in: it hits live third-party
// services and is meant to FAIL when they break (the alert), so it runs on a
// schedule / on demand, never in the default green suite. Enable with
// MONITORING_ENABLED=true (see `npm run test:monitoring`).
const includeMonitoring = process.env.MONITORING_ENABLED === 'true';

// Shared browser context for the product app: the product project (and the auth-setup
// project, when re-enabled) use the same origin/viewport so saved sessions restore
// cleanly. baseURL is the calculator app for the selected env (dev / prod).
const productUse = {
  ...devices['Desktop Chrome'],
  baseURL: config.app.baseUrl,
  viewport: { width: 1920, height: 1080 },
  headless: true,
};

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
    // Product app project (targets the *.organuz.com calculator for the selected env).
    // The credential-gated role flows (product-setup / product-authenticated) below
    // stay disabled — re-enable them together when per-role sessions are wired.
    {
      name: 'product',
      testMatch: 'tests/product/**/*.spec.ts',
      // The per-role live specs run in product-authenticated (they need saved sessions).
      testIgnore: 'tests/product/flows/**',
      use: productUse,
    },
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
    {
      // Authorized, NON-DESTRUCTIVE penetration testing of the Organuz Supabase
      // backend with the public anon key only (browserless APIRequestContext).
      // Asserts the backend's security posture; a failure is a real finding.
      name: 'security',
      testMatch: 'tests/security/**/*.spec.ts',
      use: {
        baseURL: config.organuzApi.baseUrl,
      },
    },
    // Local-only marketing-site e2e (tests/local-web/**). Registered by default so it runs
    // locally, but EVERY spec self-skips when process.env.CI is set (see tests/local-web/
    // support.ts) and the parallel-tests.yml CI matrix does not list this project — so it
    // never runs on CI. Intentional local/CI divergence (sanctioned skips), per the
    // test-suite-parity skill. Uses a real chromium context against the prod marketing site.
    {
      name: 'local-web',
      testMatch: 'tests/local-web/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: config.web.baseUrl,
        viewport: { width: 1920, height: 1080 },
        headless: true,
      },
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
