import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';
import { SiteUrl } from '../../constants';

test.describe('Hero Section', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('hero heading is visible and mentions "אור"', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('Heading');
    await allureSeverity('blocker');

    await allureStep('Verify hero H1 heading is visible', async () => {
      await expect(homePage.heroHeading).toBeVisible();
    });

    await allureStep('Verify heading text contains "אור"', async () => {
      await expect(homePage.heroHeading).toContainText('אור');
    });
  });

  test('hero subtitle is displayed', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('Subtitle');
    await allureSeverity('normal');

    await allureStep('Verify subtitle text is visible', async () => {
      await expect(homePage.heroSubtitle).toBeVisible();
    });
  });

  test('all six user type buttons are visible', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('User type buttons');
    await allureSeverity('critical');

    await allureStep('Verify all 6 user type buttons are visible', async () => {
      await homePage.expectAllUserTypeButtonsVisible();
    });
  });

  test('each user type button is clickable', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('User type button interaction');
    await allureSeverity('normal');

    await allureStep('Click "בתים פרטיים" button', async () => {
      await homePage.userTypeBtnPrivateHomes.click();
    });

    await allureStep('Click "בנייני מגורים" button', async () => {
      await homePage.userTypeBtnResidentialBuildings.click();
    });

    await allureStep('Click "עסקים" button', async () => {
      await homePage.userTypeBtnBusinesses.click();
    });

    await allureStep('Click "חקלאות" button', async () => {
      await homePage.userTypeBtnAgriculture.click();
    });

    await allureStep('Click "רשויות" button', async () => {
      await homePage.userTypeBtnAuthorities.click();
    });

    await allureStep('Click "שחקני שוק" button', async () => {
      await homePage.userTypeBtnMarketPlayers.click();
    });
  });

  test('"התחילו עכשיו" CTA links to the app', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('Start Now CTA');
    await allureSeverity('critical');

    await allureStep('Verify "התחילו עכשיו" link is visible', async () => {
      await expect(homePage.startNowLink).toBeVisible();
    });

    await allureStep('Verify link href points to energy.organuz.com', async () => {
      await expect(homePage.startNowLink).toHaveAttribute('href', SiteUrl.app);
    });
  });

  test('page title matches brand', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('Page title');
    await allureSeverity('minor');

    await allureStep('Verify page title contains "Organuz"', async () => {
      await expect(page).toHaveTitle(/Organuz/);
    });
  });

  test('"ללא עלות. ללא התחייבות" free-trial text is visible in hero', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('Free trial commitment text');
    await allureSeverity('normal');

    await allureStep('Verify free/no-commitment text is visible', async () => {
      await expect(page.getByText('ללא עלות. ללא התחייבות')).toBeVisible();
    });
  });

  test('page contains exactly two "התחילו עכשיו" start-now CTAs', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('CTA');
    await allureStory('Multiple start-now CTAs');
    await allureSeverity('normal');

    await allureStep('Verify exactly 2 "התחילו עכשיו" links exist on the page', async () => {
      await expect(page.getByRole('link', { name: 'התחילו עכשיו' })).toHaveCount(2);
    });
  });

  test('partners logo carousel heading is visible below the hero', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('Partners Section');
    await allureStory('Partners heading');
    await allureSeverity('normal');

    const heading = page.getByRole('heading', { name: 'כל השחקנים המובילים במקום אחד' });

    await allureStep('Scroll partners heading into view', async () => {
      await heading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify partners section heading is visible', async () => {
      await expect(heading).toBeVisible();
    });
  });
});
