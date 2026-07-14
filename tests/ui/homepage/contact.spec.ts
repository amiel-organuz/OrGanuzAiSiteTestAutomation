import { test } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Contact form', { tag: '@ui' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('Contact form exposes all of its fields', { tag: '@other-smoke' }, async ({ home }) => {
    await allureEpic('Home page');
    await allureFeature('Contact form');
    await allureStory('Field presence');
    await allureSeverity('critical');

    // Visibility only — never submit, so no automation data reaches the real CRM.
    await allureStep('Verify the name, email, phone, message, and submit are visible', async () => {
      await home.contact.expectAllVisible();
    });
  });
});
