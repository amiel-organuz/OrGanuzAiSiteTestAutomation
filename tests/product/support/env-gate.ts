import { Page } from '@playwright/test';

/**
 * Non-prod Organuz environments (DEV / TEST) sit behind a shared password gate
 * (a single "סיסמה" field + "כנס" button) before the product calculator loads.
 * PROD has no such gate. This helper unlocks it when a password is configured,
 * and is a no-op otherwise — so the same specs run against dev, test, and prod.
 *
 * The password comes from PRODUCT_PLATFORM_PASSWORD (local .env, sourced from the
 * Restricted Organuz Environments doc). See config.json -> environments.
 */
export async function unlockProductEnvironment(page: Page): Promise<void> {
  const password = process.env.PRODUCT_PLATFORM_PASSWORD;
  if (!password) return;

  const gate = page.getByRole('textbox', { name: 'סיסמה' });
  // Short probe: the gate renders immediately on dev/test; absent on prod.
  if (!(await gate.first().isVisible({ timeout: 5_000 }).catch(() => false))) return;

  await gate.first().fill(password);
  await page.getByRole('button', { name: 'כנס' }).first().click();

  // Gate success redirects into the calculator (…/calculator/address).
  await page.waitForURL(/calculator/i, { timeout: 20_000 });
}
