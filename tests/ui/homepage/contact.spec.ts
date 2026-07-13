import { test } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Contact form', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('contact form exposes all of its fields', { tag: '@other-smoke' }, async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact form');
    await allureStory('Field presence');
    await allureSeverity('critical');

    // Visibility only — never submit, so we don't push automation data into the real CRM.
    await allureStep('Verify name, email, phone, message, and submit are visible', async () => {
      await homePage.expectContactFormVisible();
    });
  });
});
