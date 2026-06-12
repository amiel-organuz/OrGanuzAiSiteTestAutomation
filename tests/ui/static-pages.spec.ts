import { test, expect } from '../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { SiteUrl } from '../constants';

test.describe('Static Pages', { tag: '@ui' }, () => {
  test('footer "מדיניות פרטיות" link href points to /privacy-policy', async ({ page }) => {
    await allureEpic('Static Pages');
    await allureFeature('Footer Legal Links');
    await allureStory('Privacy policy footer link');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await page.goto('/');
    });

    await allureStep('Verify footer privacy policy link has correct href', async () => {
      const footer = page.getByRole('contentinfo');
      await footer.scrollIntoViewIfNeeded();
      const privacyLink = footer.getByRole('link', { name: 'מדיניות פרטיות' }).first();
      await expect(privacyLink).toHaveAttribute('href', SiteUrl.privacyPolicy);
    });
  });

  test.describe('Privacy Policy page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(SiteUrl.privacyPolicy);
    });

    test('privacy policy page title contains the brand name', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Privacy Policy');
      await allureStory('Page title');
      await allureSeverity('minor');

      await allureStep('Verify page title contains "Organuz"', async () => {
        await expect(page).toHaveTitle(/Organuz/);
      });
    });

    test('privacy policy page has a visible heading', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Privacy Policy');
      await allureStory('Page heading');
      await allureSeverity('normal');

      await allureStep('Verify at least one heading is visible on the page', async () => {
        await expect(page.getByRole('heading').first()).toBeVisible();
      });
    });

    test('privacy policy page has text content (not blank)', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Privacy Policy');
      await allureStory('Page content');
      await allureSeverity('normal');

      await allureStep('Verify the page has at least one visible paragraph', async () => {
        await expect(page.locator('p').first()).toBeVisible();
      });
    });

    test('privacy policy page has Organuz logo linking to home', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Privacy Policy');
      await allureStory('Navigation back to home');
      await allureSeverity('normal');

      await allureStep('Verify Organuz logo link is visible on privacy policy page', async () => {
        await expect(page.getByRole('link', { name: 'Organuz' }).first()).toBeVisible();
      });

      await allureStep('Verify logo links to the home page', async () => {
        await expect(page.getByRole('link', { name: 'Organuz' }).first()).toHaveAttribute('href', '/');
      });
    });
  });

  test.describe('Terms of Service page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(SiteUrl.termsOfService);
    });

    test('terms of service page title contains the brand name', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Terms of Service');
      await allureStory('Page title');
      await allureSeverity('minor');

      await allureStep('Verify page title contains "Organuz"', async () => {
        await expect(page).toHaveTitle(/Organuz/);
      });
    });

    test('terms of service page has a visible heading', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Terms of Service');
      await allureStory('Page heading');
      await allureSeverity('normal');

      await allureStep('Verify at least one heading is visible on the page', async () => {
        await expect(page.getByRole('heading').first()).toBeVisible();
      });
    });

    test('terms of service page has text content (not blank)', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Terms of Service');
      await allureStory('Page content');
      await allureSeverity('normal');

      await allureStep('Verify the page has at least one visible paragraph', async () => {
        await expect(page.locator('p').first()).toBeVisible();
      });
    });

    test('terms of service page has Organuz logo linking to home', async ({ page }) => {
      await allureEpic('Static Pages');
      await allureFeature('Terms of Service');
      await allureStory('Navigation back to home');
      await allureSeverity('normal');

      await allureStep('Verify Organuz logo link is visible on terms page', async () => {
        await expect(page.getByRole('link', { name: 'Organuz' }).first()).toBeVisible();
      });

      await allureStep('Verify logo links to the home page', async () => {
        await expect(page.getByRole('link', { name: 'Organuz' }).first()).toHaveAttribute('href', '/');
      });
    });
  });
});
