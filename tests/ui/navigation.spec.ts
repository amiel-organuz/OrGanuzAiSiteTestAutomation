import { test, expect } from '../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { SiteUrl } from '../constants';

test.describe('Navigation', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('logo is visible and links to home', async ({ homePage }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Header');
    await allureStory('Logo');
    await allureSeverity('critical');

    await allureStep('Verify Organuz logo is visible', async () => {
      await expect(homePage.logo).toBeVisible();
    });

    await allureStep('Verify logo href points to home', async () => {
      await expect(homePage.logo).toHaveAttribute('href', '/');
    });
  });

  test('all navigation links are visible', async ({ homePage }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Header');
    await allureStory('Nav links');
    await allureSeverity('blocker');

    await allureStep('Verify all 6 navigation links are visible', async () => {
      await homePage.expectNavLinksVisible();
    });
  });

  test('language switcher button is visible', async ({ homePage }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Header');
    await allureStory('Language switcher');
    await allureSeverity('normal');

    await allureStep('Verify EN language button is visible', async () => {
      await expect(homePage.languageButton).toBeVisible();
    });
  });

  test('header CTA link is visible and points to the app', async ({ homePage }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Header');
    await allureStory('Header CTA');
    await allureSeverity('critical');

    await allureStep('Verify "להתחלה" CTA button is visible', async () => {
      await expect(homePage.headerCtaLink).toBeVisible();
    });

    await allureStep('Verify CTA links to energy.organuz.com', async () => {
      await expect(homePage.headerCtaLink).toHaveAttribute('href', SiteUrl.app);
    });
  });

  test('nav links point to correct section anchors', async ({ homePage }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Header');
    await allureStory('Anchor links');
    await allureSeverity('normal');

    await allureStep('Verify "למה Organuz" href is /#why', async () => {
      await expect(homePage.navWhyLink).toHaveAttribute('href', '/#why');
    });

    await allureStep('Verify "הכירו את אור" href is /#or', async () => {
      await expect(homePage.navOrLink).toHaveAttribute('href', '/#or');
    });

    await allureStep('Verify "הסוכנים" href is /#agents', async () => {
      await expect(homePage.navAgentsLink).toHaveAttribute('href', '/#agents');
    });

    await allureStep('Verify "פרויקטים לדוגמא" href is /#projects', async () => {
      await expect(homePage.navProjectsLink).toHaveAttribute('href', '/#projects');
    });

    await allureStep('Verify "מרכז הידע" href is /#blog', async () => {
      await expect(homePage.navBlogLink).toHaveAttribute('href', '/#blog');
    });

    await allureStep('Verify "שאלות נפוצות" href is /#faq', async () => {
      await expect(homePage.navFaqLink).toHaveAttribute('href', '/#faq');
    });
  });

  test('footer contains privacy policy and terms of service links', async ({ homePage, page }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Footer');
    await allureStory('Legal links');
    await allureSeverity('normal');

    const footer = page.getByRole('contentinfo');

    await allureStep('Verify privacy policy link is in footer', async () => {
      await expect(footer.getByRole('link', { name: 'מדיניות פרטיות' }).first()).toBeVisible();
    });

    await allureStep('Verify terms of service link is in footer', async () => {
      await expect(footer.getByRole('link', { name: 'תנאי שימוש' }).first()).toBeVisible();
    });
  });

  test('privacy policy page loads and has a visible heading', async ({ page }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Static Pages');
    await allureStory('Privacy Policy');
    await allureSeverity('normal');

    await allureStep('Navigate to /privacy-policy', async () => {
      await page.goto('/privacy-policy');
    });

    await allureStep('Verify URL contains privacy-policy', async () => {
      await expect(page).toHaveURL(/privacy-policy/);
    });

    await allureStep('Verify a page heading is visible', async () => {
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });

  test('terms of service page loads and has a visible heading', async ({ page }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Static Pages');
    await allureStory('Terms of Service');
    await allureSeverity('normal');

    await allureStep('Navigate to /terms-of-service', async () => {
      await page.goto('/terms-of-service');
    });

    await allureStep('Verify URL contains terms-of-service', async () => {
      await expect(page).toHaveURL(/terms-of-service/);
    });

    await allureStep('Verify a page heading is visible', async () => {
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });

  test('footer "הבלוג שלנו" link navigates to /blog', async ({ page }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Footer');
    await allureStory('Footer blog link');
    await allureSeverity('normal');

    const footerBlogLink = page.getByRole('contentinfo').getByRole('link', { name: 'הבלוג שלנו' });

    await allureStep('Verify "הבלוג שלנו" link is visible in footer', async () => {
      await footerBlogLink.scrollIntoViewIfNeeded();
      await expect(footerBlogLink).toBeVisible();
    });

    await allureStep('Click footer blog link and verify navigation to /blog', async () => {
      await footerBlogLink.click();
      await expect(page).toHaveURL(/\/blog/);
    });
  });

  test('partners section heading "כל השחקנים המובילים במקום אחד" is visible', async ({ page }) => {
    await allureEpic('Site Navigation');
    await allureFeature('Partners Section');
    await allureStory('Partners heading');
    await allureSeverity('minor');

    const heading = page.getByRole('heading', { name: 'כל השחקנים המובילים במקום אחד' });

    await allureStep('Scroll partners section into view', async () => {
      await heading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify partners section heading is visible', async () => {
      await expect(heading).toBeVisible();
    });
  });
});
