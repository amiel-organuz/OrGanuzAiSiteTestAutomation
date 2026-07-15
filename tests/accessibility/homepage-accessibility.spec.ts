import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';

/**
 * Highest-priority accessibility coverage for the public Hebrew marketing page.
 *
 * The five existing critical/serious Axe findings are represented as non-growing
 * baselines: an improvement remains green, while any additional affected node or
 * new high-impact rule fails CI. Remove each budget when the corresponding website
 * issue is fixed. The remaining checks are strict semantic regressions.
 */
test.describe('Marketing homepage accessibility', { tag: ['@accessibility', '@critical'] }, () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  let context: BrowserContext;
  let page: Page;
  let axe: AxeResults;

  const knownHighImpactBudgets: Record<string, number> = {
    'button-name': 2,
    'color-contrast': 44,
    'link-name': 1,
    'nested-interactive': 3,
    'scrollable-region-focusable': 1,
  };

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').waitFor({ state: 'visible' });
    axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
  });

  test.afterAll(async () => {
    await context.close();
  });

  function violationNodeCount(ruleId: string): number {
    return axe.violations.find((violation) => violation.id === ruleId)?.nodes.length ?? 0;
  }

  test('A11Y-01 no new critical or serious Axe rule is introduced', async () => {
    const unexpected = axe.violations
      .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation) => violation.id)
      .filter((id) => !(id in knownHighImpactBudgets));
    expect(unexpected).toEqual([]);
  });

  for (const [index, [ruleId, budget]] of Object.entries(knownHighImpactBudgets).entries()) {
    test(`A11Y-${String(index + 2).padStart(2, '0')} ${ruleId} does not exceed its remediation baseline`, async () => {
      expect(violationNodeCount(ruleId), `${ruleId} affected-node budget`).toBeLessThanOrEqual(budget);
    });
  }

  test('A11Y-07 document has a descriptive title', async () => {
    await expect(page).toHaveTitle(/\S+/);
  });

  test('A11Y-08 document declares Hebrew as its language', async () => {
    await expect(page.locator('html')).toHaveAttribute('lang', /^he(?:-|$)/i);
  });

  test('A11Y-09 document declares right-to-left direction', async () => {
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('A11Y-10 viewport does not disable browser zoom', async () => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\.0+)?(?:,|$)/i);
  });

  test('A11Y-11 page exposes exactly one level-one heading', async () => {
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('A11Y-12 every heading has visible text or an accessible label', async () => {
    const unnamed = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((headings) =>
      headings.filter((heading) =>
        !(heading.textContent?.trim() || heading.getAttribute('aria-label')?.trim()),
      ).length,
    );
    expect(unnamed).toBe(0);
  });

  test('A11Y-13 heading-level skips do not exceed the current baseline', async () => {
    const skippedLevels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((headings) => {
      const levels = headings.map((heading) => Number(heading.tagName.slice(1)));
      return levels.filter((level, index) => index > 0 && level > levels[index - 1] + 1).length;
    });
    expect(skippedLevels).toBeLessThanOrEqual(1);
  });

  test('A11Y-14 element IDs are unique', async () => {
    const duplicates = await page.locator('[id]').evaluateAll((elements) => {
      const ids = elements.map((element) => element.id);
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    });
    expect(duplicates).toEqual([]);
  });

  test('A11Y-15 page has exactly one header landmark', async () => {
    await expect(page.locator('header,[role="banner"]')).toHaveCount(1);
  });

  test('A11Y-16 page has a navigation landmark', async () => {
    expect(await page.locator('nav,[role="navigation"]').count()).toBeGreaterThan(0);
  });

  test('A11Y-17 page has exactly one footer landmark', async () => {
    await expect(page.locator('footer,[role="contentinfo"]')).toHaveCount(1);
  });

  test('A11Y-18 every image has an alt attribute', async () => {
    expect(await page.locator('img:not([alt])').count()).toBe(0);
  });

  test('A11Y-19 image alternative text does not expose a filename', async () => {
    const filenameAlts = await page.locator('img[alt]').evaluateAll((images) =>
      images
        .map((image) => image.getAttribute('alt')?.trim() ?? '')
        .filter((alt) => /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(alt)),
    );
    expect(filenameAlts).toEqual([]);
  });

  test('A11Y-20 every iframe has an accessible title', async () => {
    expect(await page.locator('iframe:not([title]), iframe[title=""]').count()).toBe(0);
  });

  test('A11Y-21 obsolete blinking and marquee content is absent', async () => {
    expect(await page.locator('blink,marquee').count()).toBe(0);
  });

  test('A11Y-22 positive tabindex values do not override natural focus order', async () => {
    const positiveTabindex = await page.locator('[tabindex]').evaluateAll((elements) =>
      elements.filter((element) => Number(element.getAttribute('tabindex')) > 0).length,
    );
    expect(positiveTabindex).toBe(0);
  });

  test('A11Y-23 page does not steal focus on load', async () => {
    expect(await page.locator('[autofocus]').count()).toBe(0);
  });

  test('A11Y-24 aria-hidden content is removed from keyboard navigation', async () => {
    const focusableHidden = await page.locator('[aria-hidden="true"]').evaluateAll((elements) =>
      elements.filter((element) => {
        if (element.matches('[disabled]')) return false;
        const tabindex = element.getAttribute('tabindex');
        if (tabindex !== null) return Number(tabindex) >= 0;
        return element.matches('a[href],button,input,select,textarea,[contenteditable="true"]');
      }).length,
    );
    expect(focusableHidden).toBe(0);
  });

  test('A11Y-25 new-tab links prevent opener access', async () => {
    const unsafe = await page.locator('a[target="_blank"]').evaluateAll((links) =>
      links.filter((link) => !link.getAttribute('rel')?.split(/\s+/).includes('noopener')).length,
    );
    expect(unsafe).toBe(0);
  });

  test('A11Y-26 links use valid, non-script destinations', async () => {
    const invalidLinks = await page.locator('a').evaluateAll((links) =>
      links.filter((link) => {
        const href = link.getAttribute('href')?.trim() ?? '';
        return !href || href === '#' || /^javascript:/i.test(href);
      }).length,
    );
    expect(invalidLinks).toBe(0);
  });

  test('A11Y-27 form controls have an accessible name', async () => {
    const unnamedControls = await page.locator('input,select,textarea').evaluateAll((controls) =>
      controls.filter((control) => {
        if (control.getAttribute('aria-hidden') === 'true') return false;
        return !(
          control.getAttribute('aria-label')?.trim() ||
          control.getAttribute('aria-labelledby')?.trim() ||
          control.getAttribute('title')?.trim() ||
          control.getAttribute('placeholder')?.trim()
        );
      }).length,
    );
    expect(unnamedControls).toBe(0);
  });

  test('A11Y-28 email fields expose the email input type', async () => {
    const mistyped = await page.locator('input').evaluateAll((inputs) =>
      inputs.filter((input) => {
        const hint = `${input.getAttribute('name') ?? ''} ${input.getAttribute('placeholder') ?? ''}`;
        return /email|e-mail|אימייל/i.test(hint) && input.type !== 'email';
      }).length,
    );
    expect(mistyped).toBe(0);
  });

  test('A11Y-29 phone fields expose the telephone input type', async () => {
    const mistyped = await page.locator('input').evaluateAll((inputs) =>
      inputs.filter((input) => {
        const hint = `${input.getAttribute('name') ?? ''} ${input.getAttribute('placeholder') ?? ''}`;
        return /phone|tel|טלפון/i.test(hint) && input.type !== 'tel';
      }).length,
    );
    expect(mistyped).toBe(0);
  });

  test('A11Y-30 broken ARIA ID references do not exceed the current baseline', async () => {
    const existingIds = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
    const brokenReferences = await page.locator('[aria-labelledby],[aria-describedby],[aria-controls],[aria-owns],[aria-activedescendant]').evaluateAll(
      (elements, ids: string[]) => {
        const knownIds = new Set(ids);
        const attributes = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant'];
        return elements.flatMap((element) =>
          attributes.flatMap((attribute) =>
            (element.getAttribute(attribute)?.trim().split(/\s+/) ?? [])
              .filter((id: string) => id && !knownIds.has(id))
              .map((id: string) => `${attribute}:${id}`),
          ),
        );
      },
      existingIds,
    );
    expect(
      brokenReferences.length,
      `broken ARIA references: ${brokenReferences.join(', ')}`,
    ).toBeLessThanOrEqual(1);
  });
});
