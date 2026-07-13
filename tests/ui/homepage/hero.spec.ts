import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

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
});
