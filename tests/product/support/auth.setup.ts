/**
 * Product-app authentication setup (dev).
 *
 * Runs as its own `product-setup` project that `product-authenticated` depends on
 * (see playwright.config.ts). Logs each role in ONCE via phone+OTP and saves its
 * authenticated session to playwright/.auth/product-<role>.json. Every per-role spec
 * then resumes from that saved storageState (via `test.use({ authRole })` +
 * `product.resumeSession()`) instead of logging in itself — so authenticated role
 * coverage performs at most one OTP send per role.
 *
 * If a role can't authenticate (OTP cooldown), ProductAppPage.login() skips this
 * setup test; no session file is written, and the dependent specs skip too.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true + persona OTP (dev fixed OTP 7777).
 */
import * as fs from 'fs';
import * as path from 'path';
import { test as setup } from './fixtures';
import { authFile, AUTH_ROLES } from './auth';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

setup.describe('Product auth setup (dev)', { tag: ['@product', '@setup', '@roles'] }, () => {
  setup.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus persona OTP to authenticate the product roles.');
  // Login + OTP make these slow.
  setup.describe.configure({ timeout: 150_000 });

  for (const persona of AUTH_ROLES) {
    setup(`authenticate ${persona}`, async ({ page, product }) => {
      // login() skips gracefully if the dev OTP step never renders (rate-limit cooldown).
      await product.loginAs(persona);

      const file = authFile(persona);
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await page.context().storageState({ path: file });
    });
  }
});
