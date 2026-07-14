import { test, expect, localOnly } from './support';
import type { HomeFlows } from '../ui/support/HomeFlows';
import type { Locator } from '@playwright/test';

localOnly();

type Get = (h: HomeFlows) => Locator;

test.describe('Local-only: audiences & "Why Organuz"', { tag: ['@ui', '@local-only'] }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  const audiences: [string, Get][] = [
    ['Private homes', (h) => h.hero.userTypePrivateHomes],
    ['Residential buildings', (h) => h.hero.userTypeResidentialBuildings],
    ['Businesses', (h) => h.hero.userTypeBusinesses],
    ['Agriculture', (h) => h.hero.userTypeAgriculture],
    ['Authorities', (h) => h.hero.userTypeAuthorities],
    ['Market players', (h) => h.hero.userTypeMarketPlayers],
  ];

  for (const [label, get] of audiences) {
    test(`audience button "${label}" is visible`, async ({ home }) => {
      await expect(get(home)).toBeVisible();
    });
  }

  test('"Why Organuz" section heading is visible', async ({ home }) => {
    await expect(home.why.heading).toBeVisible();
  });

  const whyTabs: [string, Get][] = [
    ['Property owners', (h) => h.why.tabPropertyOwners],
    ['Solar companies', (h) => h.why.tabSolarCompanies],
    ['Authorities & corporations', (h) => h.why.tabAuthoritiesCorp],
    ['Investors & financiers', (h) => h.why.tabInvestors],
  ];

  for (const [label, get] of whyTabs) {
    test(`"Why Organuz" tab "${label}" is visible`, async ({ home }) => {
      await expect(get(home)).toBeVisible();
    });
  }
});
