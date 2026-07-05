import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

// Demo failure spec: verifies the failure-capture pipeline
// (screenshot, video, trace, Allure attachments) is wired up end-to-end.
// Skip with: npx playwright test --grep-invert "@intentionally-failing"

test.describe('Intentionally Failing E2E', { tag: ['@ui', '@intentionally-failing'] }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  // test.fail() = this assertion is expected to fail. Playwright counts it
  // as passing when it fails — keeps the failure-capture demo without
  // turning CI red. If the assertion ever starts passing, Playwright
  // surfaces it as "unexpected pass" so we know to remove this.
  test.fail('homepage H1 should equal a string that does not exist on the page', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('Failure pipeline');
    await allureStory('Assertion failure');
    await allureSeverity('trivial');

    await allureStep('Assert H1 equals a non-existent literal', async () => {
      await expect(page.locator('h1').first()).toHaveText('THIS HEADING DOES NOT EXIST', { timeout: 3000 });
    });
  });
});
