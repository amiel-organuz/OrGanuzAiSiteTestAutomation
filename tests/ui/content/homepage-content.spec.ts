import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';
import { FaqQuestions } from '../../constants';

test.describe('Homepage content', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('all six AI agents are showcased', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Agents');
    await allureStory('Agent roster');
    await allureSeverity('critical');

    await allureStep('Verify each of the six named agents is visible', async () => {
      await homePage.expectAllAgentsVisible();
    });
  });

  test('projects showcase section is visible', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects');
    await allureStory('Section heading');
    await allureSeverity('normal');

    await allureStep('Verify the active-projects showcase heading is visible', async () => {
      await expect(homePage.projectsSectionHeading).toBeVisible();
    });
  });

  test('FAQ section shows the first question', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ');
    await allureStory('Section heading + first question');
    await allureSeverity('normal');

    await allureStep('Verify the FAQ heading and the first known question are visible', async () => {
      await expect(homePage.faqSectionHeading).toBeVisible();
      await expect(homePage.faqQuestion(FaqQuestions[0])).toBeVisible();
    });
  });
});
