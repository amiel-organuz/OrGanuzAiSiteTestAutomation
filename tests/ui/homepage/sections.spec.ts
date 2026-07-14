import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Home page sections', { tag: '@ui' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('Main navigation links are visible', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Header');
    await allureStory('Main navigation');
    await allureSeverity('critical');

    await allureStep('Verify the six main navigation links are visible', async () => {
      await home.header.expectNavLinksVisible();
    });
  });

  test('Hero subtitle is visible', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Hero section');
    await allureStory('Subtitle');
    await allureSeverity('normal');

    await allureStep('Verify the hero subtitle is visible', async () => {
      await expect(home.hero.subtitle).toBeVisible();
    });
  });

  test('User-type selector buttons are visible', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Hero section');
    await allureStory('User-type selector');
    await allureSeverity('normal');

    await allureStep('Verify all six audience buttons are visible', async () => {
      await home.hero.expectAllUserTypeButtonsVisible();
    });
  });

  test('"Why Organuz" section is visible', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Why Organuz');
    await allureStory('Section heading');
    await allureSeverity('normal');

    await allureStep('Verify the "Why Organuz" heading and the first tab are visible', async () => {
      await expect(home.why.heading).toBeVisible();
      await expect(home.why.tabPropertyOwners).toBeVisible();
    });
  });

  test('"Meet Or" section and its CTA are visible', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('The Or agent');
    await allureStory('Section heading + CTA');
    await allureSeverity('normal');

    await allureStep('Verify the "Meet Or" heading and the "Talk to Or" link are visible', async () => {
      await expect(home.or.heading).toBeVisible();
      await expect(home.or.talkToOrLink).toBeVisible();
    });
  });
});
