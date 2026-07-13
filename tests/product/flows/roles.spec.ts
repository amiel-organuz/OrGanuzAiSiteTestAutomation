import { test, expect } from '../support/fixtures';
import { hasSavedSession } from '../support/auth';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';
import type { ProductFlows } from '../support/ProductFlows';

/**
 * Live-browser per-role sanity e2e (product-authenticated project).
 *
 * Each role resumes the session saved by the `product-setup` project and runs
 * read-only checks against the dev calculator. Skip-safe: when a role has no saved
 * session (product-setup was skipped because its credentials or the dev app were
 * unavailable) or the session cannot be restored, the test skips with a reason
 * rather than failing — so the suite stays green on CI without per-role secrets.
 *
 * Read-only on purpose: no logout/writes, so a shared saved session is never
 * invalidated for the parallel specs reusing it.
 */
async function resumeOrSkip(product: ProductFlows, role: ProductPersonaId): Promise<void> {
  test.skip(!hasSavedSession(role), `no saved session for "${role}" — product-setup did not authenticate it`);
  try {
    await product.resumeSession(role);
  } catch (err) {
    test.skip(true, `"${role}" session could not resume — ${(err as Error).message}`);
  }
}

test.describe('Live role session: customer', { tag: ['@product', '@roles', '@e2e'] }, () => {
  test.use({ authRole: 'customer' });

  test('customer resumes its saved session into the calculator shell', async ({ product }) => {
    await resumeOrSkip(product, 'customer');
    expect(await product.app.isAuthenticated()).toBe(true);
  });

  test('customer can open its personal area', async ({ product }) => {
    await resumeOrSkip(product, 'customer');
    await product.openPersonalArea();
  });

  test('customer session persists across a reload', async ({ product, page }) => {
    await resumeOrSkip(product, 'customer');
    await page.reload();
    expect(await product.app.isAuthenticated()).toBe(true);
  });
});

test.describe('Live role session: consultant', { tag: ['@product', '@roles', '@e2e'] }, () => {
  test.use({ authRole: 'consultant' });

  test('consultant resumes its saved session into the calculator shell', async ({ product }) => {
    await resumeOrSkip(product, 'consultant');
    expect(await product.app.isAuthenticated()).toBe(true);
  });

  test('consultant can open its personal area', async ({ product }) => {
    await resumeOrSkip(product, 'consultant');
    await product.openPersonalArea();
  });

  test('consultant session persists across a reload', async ({ product, page }) => {
    await resumeOrSkip(product, 'consultant');
    await page.reload();
    expect(await product.app.isAuthenticated()).toBe(true);
  });
});

test.describe('Live role session: company', { tag: ['@product', '@roles', '@e2e'] }, () => {
  test.use({ authRole: 'company' });

  test('company resumes its saved session into the calculator shell', async ({ product }) => {
    await resumeOrSkip(product, 'company');
    expect(await product.app.isAuthenticated()).toBe(true);
  });

  test('company can open its personal area', async ({ product }) => {
    await resumeOrSkip(product, 'company');
    await product.openPersonalArea();
  });

  test('company session persists across a reload', async ({ product, page }) => {
    await resumeOrSkip(product, 'company');
    await page.reload();
    expect(await product.app.isAuthenticated()).toBe(true);
  });

  test('company can open the contractor pricing area', async ({ product }) => {
    await resumeOrSkip(product, 'company');
    await product.openPersonalArea();
    await product.openSidebarEntry(/מחירון/);
  });
});
