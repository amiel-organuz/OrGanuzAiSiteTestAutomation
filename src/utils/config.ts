import defaults from '../../config.json';

function requireEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export type EnvName = keyof typeof defaults.environments;

// Which Organuz environment the product/app tests target (dev | test | prod).
// Override with QA_TARGET_ENV; falls back to config.json defaultEnv (dev).
const targetEnv = (requireEnv('QA_TARGET_ENV', defaults.defaultEnv) as EnvName);
const envUrls = defaults.environments[targetEnv] ?? defaults.environments[defaults.defaultEnv as EnvName];

export const config = {
  env: {
    name: targetEnv,
    appBaseUrl: normalizeUrl(requireEnv('APP_BASE_URL', envUrls.app)),
    adminBaseUrl: normalizeUrl(requireEnv('APP_ADMIN_URL', envUrls.admin)),
  },
  web: {
    baseUrl: normalizeUrl(requireEnv('WEB_BASE_URL', defaults.web.baseUrl)),
  },
  app: {
    // Resolves from the selected environment (dev by default); APP_BASE_URL still wins.
    baseUrl: normalizeUrl(requireEnv('APP_BASE_URL', envUrls.app)),
    adminUrl: normalizeUrl(requireEnv('APP_ADMIN_URL', envUrls.admin)),
  },
  organuzApi: {
    baseUrl: requireEnv('ORGANUZ_API_BASE_URL', defaults.organuzApi.baseUrl),
    anonKey: requireEnv('ORGANUZ_API_ANON_KEY', defaults.organuzApi.anonKey),
    timeout: parseInt(requireEnv('ORGANUZ_API_TIMEOUT', String(defaults.organuzApi.timeout)), 10),
  },
  // Dev product-app backend (organuz.flamiingo.com) — an RPC gateway used by the
  // dev/test apps. The token is public (baked into the app bundle).
  devApi: {
    baseUrl: requireEnv('DEV_API_BASE_URL', defaults.devApi.baseUrl),
    token: requireEnv('DEV_API_TOKEN', defaults.devApi.token),
    timeout: parseInt(requireEnv('DEV_API_TIMEOUT', String(defaults.devApi.timeout)), 10),
  },
  playwright: {
    defaultTimeout:    parseInt(requireEnv('DEFAULT_TIMEOUT',    String(defaults.playwright.defaultTimeout)), 10),
    navigationTimeout: parseInt(requireEnv('NAVIGATION_TIMEOUT', String(defaults.playwright.navigationTimeout)), 10),
    workers:           parseInt(requireEnv('WORKERS',            String(defaults.playwright.workers)), 10),
    browser: (requireEnv('BROWSER', defaults.playwright.browser) as 'chromium' | 'firefox' | 'webkit'),
  },
} as const;
