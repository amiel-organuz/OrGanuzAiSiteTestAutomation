import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Hero section', { tag: '@ui' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('Hero heading is visible and contains the word "אור"', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Hero section');
    await allureStory('Heading');
    await allureSeverity('blocker');

    await allureStep('Verify the main H1 heading is visible', async () => {
      await expect(home.hero.heading).toBeVisible();
    });

    await allureStep('Verify the heading text contains the word "אור"', async () => {
      await expect(home.hero.heading).toContainText('אור');
    });
  });
});
