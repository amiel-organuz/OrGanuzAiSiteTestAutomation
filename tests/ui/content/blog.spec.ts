import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Blog', { tag: '@ui' }, () => {
  test('Blog index page loads with at least one article', { tag: '@other-smoke' }, async ({ blogPage }) => {
    await allureEpic('Blog');
    await allureFeature('Blog index');
    await allureStory('Article list');
    await allureSeverity('normal');

    await allureStep('Navigate to /blog and verify the page loads', async () => {
      await blogPage.navigate();
      await blogPage.expectOnBlogPage();
    });

    await allureStep('Verify at least one article card is visible', async () => {
      await expect(blogPage.articleCards.first()).toBeVisible();
    });
  });
});
