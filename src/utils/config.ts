import defaults from '../../config.json';

function requireEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  web: {
    baseUrl: requireEnv('WEB_BASE_URL', defaults.web.baseUrl),
  },
  api: {
    baseUrl: requireEnv('API_BASE_URL', defaults.api.baseUrl),
    timeout: parseInt(requireEnv('API_TIMEOUT', String(defaults.api.timeout)), 10),
  },
  playwright: {
    defaultTimeout:    parseInt(requireEnv('DEFAULT_TIMEOUT',    String(defaults.playwright.defaultTimeout)), 10),
    navigationTimeout: parseInt(requireEnv('NAVIGATION_TIMEOUT', String(defaults.playwright.navigationTimeout)), 10),
    workers:           parseInt(requireEnv('WORKERS',            String(defaults.playwright.workers)), 10),
    browser: (requireEnv('BROWSER', defaults.playwright.browser) as 'chromium' | 'firefox' | 'webkit'),
  },
} as const;
