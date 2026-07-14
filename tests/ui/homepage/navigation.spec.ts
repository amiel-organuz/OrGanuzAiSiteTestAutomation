import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';
import { SiteUrl } from '../../constants';

test.describe('Navigation', { tag: '@ui' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('Header CTA button is visible and links to the app', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Site navigation');
    await allureFeature('Header');
    await allureStory('Header CTA button');
    await allureSeverity('critical');

    await allureStep('Verify the "להתחלה" CTA button is visible', async () => {
      await expect(home.header.ctaLink).toBeVisible();
    });

    await allureStep('Verify the button links to energy.organuz.com', async () => {
      await expect(home.header.ctaLink).toHaveAttribute('href', SiteUrl.app);
    });
  });
});
