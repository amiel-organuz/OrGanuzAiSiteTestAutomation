import { Locator, Page } from '@playwright/test';
import { logger } from './logger';

/**
 * Creates a self-healing Playwright locator by chaining multiple strategies
 * with Playwright's native `.or()` operator.
 *
 * Strategy priority: strategies are tried left-to-right. When all strategies
 * point to the same DOM element (normal case), Playwright deduplicates the
 * results — no strict-mode violations occur. When the primary selector breaks
 * (e.g. a label or role changes), the next strategy automatically resolves the
 * element without any test code changes.
 *
 * Rules for good fallbacks:
 *   - Make fallbacks progressively LESS specific than the primary.
 *   - Fallbacks should match the SAME conceptual element, not unrelated ones.
 *   - Prefer: exact → regex → structural (tag + position).
 *
 * Usage:
 *   this.submitButton = selfHeal(
 *     page.getByRole('button', { name: 'שלח הודעה' }),  // primary: exact
 *     page.getByRole('button', { name: /שלח/ }),         // fallback 1: regex
 *     page.locator('form button[type="submit"]').first(), // fallback 2: structural
 *   );
 */
export function selfHeal(primary: Locator, ...fallbacks: Locator[]): Locator {
  return fallbacks.reduce((loc, fallback) => loc.or(fallback), primary);
}

/**
 * Test-id-first self-healing locator. Playwright's guidance is to prefer a stable
 * `data-testid` over role/text selectors; this makes the test id the primary strategy
 * and keeps the role/text locators as fallbacks for the (external) app until a test id
 * is added. Once the app ships the id, the fallbacks stop being exercised without any
 * spec change. Use for spots that are otherwise flaky (see the `@KNOWN_BUGS` EN control).
 */
export function byTestId(page: Page, testId: string, ...fallbacks: Locator[]): Locator {
  return selfHeal(page.getByTestId(testId), ...fallbacks);
}

/**
 * Resolves the first working locator from a prioritised list by counting
 * matching elements at runtime. Unlike selfHeal(), this performs actual DOM
 * queries and emits a warning when a fallback is used — useful for debugging
 * and for Allure reporting in page-action methods.
 *
 * Use inside BasePage action helpers, not for static property initialisation.
 */
export async function resolveFirst(
  description: string,
  ...strategies: Locator[]
): Promise<Locator> {
  for (let i = 0; i < strategies.length; i++) {
    try {
      const count = await strategies[i].count();
      if (count > 0) {
        if (i > 0) {
          logger.warn(`[SelfHeal] "${description}" resolved via strategy #${i + 1} — primary selector may be stale`);
        }
        return strategies[i];
      }
    } catch {
      // strategy threw (e.g. invalid selector) — try next
    }
  }
  logger.fail(`[SelfHeal] "${description}" failed all ${strategies.length} strategies — returning primary for error context`);
  return strategies[0];
}
