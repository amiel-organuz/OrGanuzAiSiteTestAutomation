import { test, expect, localOnly } from './support';
import { SiteUrl } from '../constants';
import type { HomeFlows } from '../ui/support/HomeFlows';
import type { Locator } from '@playwright/test';

localOnly();

type Get = (h: HomeFlows) => Locator;

test.describe('Local-only: hero & header', { tag: ['@ui', '@local-only'] }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('hero H1 heading is visible', async ({ home }) => {
    await expect(home.hero.heading).toBeVisible();
  });

  test('hero heading contains "אור"', async ({ home }) => {
    await expect(home.hero.heading).toContainText('אור');
  });

  test('hero subtitle is visible', async ({ home }) => {
    await expect(home.hero.subtitle).toBeVisible();
  });

  test('header CTA is visible', async ({ home }) => {
    await expect(home.header.ctaLink).toBeVisible();
  });

  test('header CTA links to the app', async ({ home }) => {
    await expect(home.header.ctaLink).toHaveAttribute('href', SiteUrl.app);
  });

  const navLinks: [string, Get][] = [
    ['Why Organuz', (h) => h.header.whyLink],
    ['Meet Or', (h) => h.header.orLink],
    ['Agents', (h) => h.header.agentsLink],
    ['Sample Projects', (h) => h.header.projectsLink],
    ['Knowledge Hub', (h) => h.header.blogLink],
    ['FAQ', (h) => h.header.faqLink],
  ];

  for (const [label, get] of navLinks) {
    test(`nav link "${label}" is visible`, async ({ home }) => {
      await expect(get(home)).toBeVisible();
    });
  }
});
