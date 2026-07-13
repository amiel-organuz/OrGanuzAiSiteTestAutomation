import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Blog', { tag: '@ui' }, () => {
  test('blog index loads with at least one article', { tag: '@other-smoke' }, async ({ blogPage }) => {
    await allureEpic('Blog');
    await allureFeature('Blog index');
    await allureStory('Article listing');
    await allureSeverity('normal');

    await allureStep('Navigate to /blog and confirm the page renders', async () => {
      await blogPage.navigate();
      await blogPage.expectOnBlogPage();
    });

    await allureStep('Verify at least one article card is visible', async () => {
      await expect(blogPage.articleCards.first()).toBeVisible();
    });
  });
});
