import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Homepage sections', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('primary navigation links are visible', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Header');
    await allureStory('Primary navigation');
    await allureSeverity('critical');

    await allureStep('Verify the six primary nav links are visible', async () => {
      await homePage.expectNavLinksVisible();
    });
  });

  test('hero subtitle is visible', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('Subtitle');
    await allureSeverity('normal');

    await allureStep('Verify the hero subtitle is visible', async () => {
      await expect(homePage.heroSubtitle).toBeVisible();
    });
  });

  test('hero user-type selector buttons are visible', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Hero Section');
    await allureStory('User-type selector');
    await allureSeverity('normal');

    await allureStep('Verify all six audience buttons are visible', async () => {
      await homePage.expectAllUserTypeButtonsVisible();
    });
  });

  test('"Why Organuz" section is visible', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Why Organuz');
    await allureStory('Section heading');
    await allureSeverity('normal');

    await allureStep('Verify the "Why Organuz" heading and first audience tab', async () => {
      await expect(homePage.whySectionHeading).toBeVisible();
      await expect(homePage.whyTabPropertyOwners).toBeVisible();
    });
  });

  test('"Meet Or" section and its CTA are visible', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Or agent');
    await allureStory('Section heading + CTA');
    await allureSeverity('normal');

    await allureStep('Verify the "Meet Or" heading and "talk to Or" link', async () => {
      await expect(homePage.orSectionHeading).toBeVisible();
      await expect(homePage.talkToOrLink).toBeVisible();
    });
  });
});
