import { test, expect } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';
import { FaqQuestions } from '../../constants';

test.describe('Home page content', { tag: '@ui' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('All six AI agents are visible', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Agents');
    await allureStory('Agent lineup');
    await allureSeverity('critical');

    await allureStep('Verify each of the six named agents is visible', async () => {
      await home.agents.expectAllAgentsVisible();
    });
  });

  test('Projects showcase section is visible', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Projects');
    await allureStory('Section heading');
    await allureSeverity('normal');

    await allureStep('Verify the active projects section heading is visible', async () => {
      await expect(home.projects.heading).toBeVisible();
    });
  });

  test('FAQ section shows the first question', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('FAQ');
    await allureStory('Section heading + first question');
    await allureSeverity('normal');

    await allureStep('Verify the FAQ heading and the first known question are visible', async () => {
      await expect(home.faq.heading).toBeVisible();
      await expect(home.faq.question(FaqQuestions[0])).toBeVisible();
    });
  });
});
