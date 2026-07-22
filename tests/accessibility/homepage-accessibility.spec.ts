import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { AxeResults } from 'axe-core';
import { createHash } from 'node:crypto';

/**
 * Highest-priority accessibility coverage for the public Hebrew marketing page.
 *
 * The five existing critical/serious Axe findings are represented as affected-node
 * fingerprint allowlists: an improvement remains green, while any newly affected
 * markup or new high-impact rule fails CI. Remove each fingerprint when the
 * corresponding website issue is fixed. The remaining checks are strict regressions.
 */
test.describe('Marketing homepage accessibility', { tag: ['@accessibility', '@critical'] }, () => {
  test.describe.configure({ mode: 'default', timeout: 60_000 });

  let context: BrowserContext;
  let page: Page;
  let axe: AxeResults;

  const knownHighImpactFingerprints: Record<string, Readonly<Record<string, number>>> = {
    'button-name': {
      '19675d03d6fa9c23': 1,
      '339b4079fc4ff2df': 1,
    },
    'color-contrast': {
      '4a7eb35a99763728': 1,
      'a97c9771acd9ccd8': 1,
      '357eb003a0d7d846': 1,
      '51c3f4d61d07676a': 1,
      '8ce8cdb75a460c45': 1,
      'dcb77d92831c06c0': 1,
      '418bc82811d72c86': 1,
      '1ee7e54ed9aa2a03': 1,
      'c895f42beae429a8': 5,
      'bc0b7d243edb585d': 5,
      '448ca08c861b33ea': 5,
      '3bde79df681c1e85': 5,
      'd335043a265fbd0c': 1,
      '80450d13d9867a85': 1,
      '35e36051adb0dc10': 1,
      'de8fecb3c8c76342': 1,
      '1fc9c905e7f09844': 1,
      'c588fae756fffbad': 1,
      '1c8e0b3feeb6b1a6': 1,
      '7eb71b0c1a211084': 1,
      '760f8c6dda6caea6': 1,
      '2079c1bea01bc2c7': 1,
      '09a4bf117404a1b4': 1,
      'e7734bd1ef739397': 1,
      '0f05560657199299': 1,
      '7513f2b0c3feba64': 1,
      '60bbe85b3c30639d': 1,
      'f4a8f413d6b945b7': 1,
    },
    'link-name': { '10517b6eae2832d4': 1 },
    'nested-interactive': {
      'dd2539f9205e523a': 1,
      '0bb905db3425e448': 1,
      '7bf205ac204e66c9': 1,
    },
    'scrollable-region-focusable': { '0ecaee3e15a4ba26': 1 },
  };

  const knownBrokenAriaTargets = new Set(['#role|aria-controls']);

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').waitFor({ state: 'visible' });
    await expect(page.locator('#projects .snap-start')).toHaveCount(5);
    await expect(page.locator('#blog .rounded-lg.card-hover')).toHaveCount(3);
    axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
  });

  test.afterAll(async () => {
    await context.close();
  });

  function violationFingerprintCounts(ruleId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const node of axe.violations.find((violation) => violation.id === ruleId)?.nodes ?? []) {
      const fingerprint = createHash('sha256').update(node.html).digest('hex').slice(0, 16);
      counts[fingerprint] = (counts[fingerprint] ?? 0) + 1;
    }
    return counts;
  }

  test('A11Y-01 no new critical or serious Axe rule is introduced', async () => {
    const unexpected = axe.violations
      .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation) => violation.id)
      .filter((id) => !(id in knownHighImpactFingerprints));
    expect(unexpected).toEqual([]);
  });

  for (const [index, [ruleId, allowedFingerprints]] of Object.entries(knownHighImpactFingerprints).entries()) {
    test(`A11Y-${String(index + 2).padStart(2, '0')} ${ruleId} contains no nodes outside its remediation baseline`, async () => {
      const unexpectedNodes = Object.entries(violationFingerprintCounts(ruleId))
        .filter(([fingerprint, count]) => count > (allowedFingerprints[fingerprint] ?? 0))
        .map(([fingerprint, count]) => `${fingerprint}: ${count} (allowed ${allowedFingerprints[fingerprint] ?? 0})`);
      expect(unexpectedNodes, `${ruleId} unexpected node fingerprints`).toEqual([]);
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

  test('A11Y-30 broken ARIA ID references contain no targets outside the current baseline', async () => {
    const existingIds = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
    const brokenReferences = await page.locator('[aria-labelledby],[aria-describedby],[aria-controls],[aria-owns],[aria-activedescendant]').evaluateAll(
      (elements, ids: string[]) => {
        const knownIds = new Set(ids);
        const attributes = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant'];
        return elements.flatMap((element) =>
          attributes.flatMap((attribute) =>
            (element.getAttribute(attribute)?.trim().split(/\s+/) ?? [])
              .filter((id: string) => id && !knownIds.has(id))
              .map(() => `${element.id ? `#${element.id}` : element.tagName.toLowerCase()}|${attribute}`),
          ),
        );
      },
      existingIds,
    );
    const unexpectedReferences = brokenReferences.filter((reference) => !knownBrokenAriaTargets.has(reference));
    expect(
      unexpectedReferences,
      `unexpected broken ARIA references: ${unexpectedReferences.join(', ')}`,
    ).toEqual([]);
  });
});
