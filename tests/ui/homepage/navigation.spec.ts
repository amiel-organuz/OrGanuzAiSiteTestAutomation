import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';
import { SiteUrl } from '../../constants';

test.describe('Navigation', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('header CTA link is visible and points to the app', { tag: '@other-smoke' }, async ({ homePage }) => {
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
});
