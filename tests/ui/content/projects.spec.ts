import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Projects Section', { tag: ['@ui', '@low-priority'] }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('projects section heading is visible', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Section heading');
    await allureSeverity('critical');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify projects section heading is visible', async () => {
      await expect(homePage.projectsSectionHeading).toBeVisible();
    });
  });

  test('first page of project cards shows active projects with stats', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Project cards');
    await allureSeverity('critical');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify at least one project card is visible', async () => {
      const activeLabels = page.getByText('פעיל');
      await expect(activeLabels.first()).toBeVisible();
    });

    await allureStep('Verify project card shows PV capacity heading', async () => {
      await expect(page.getByText('הספק PV ב-kW').first()).toBeVisible();
    });

    await allureStep('Verify project card shows 25-year revenue', async () => {
      await expect(page.getByText('הכנסה ל-25 שנים').first()).toBeVisible();
    });
  });

  test('"פרויקטים קודמים" button is initially disabled', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Pagination — previous button disabled on first page');
    await allureSeverity('normal');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify "פרויקטים קודמים" button is disabled on first page', async () => {
      await expect(homePage.projectsPrevButton).toBeDisabled();
    });
  });

  test('"פרויקטים הבאים" button is enabled and navigates to next page', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Pagination — next button');
    await allureSeverity('normal');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify "פרויקטים הבאים" button is enabled', async () => {
      await expect(homePage.projectsNextButton).toBeEnabled();
    });

    await allureStep('Click "פרויקטים הבאים" to go to page 2', async () => {
      await homePage.projectsNextButton.click();
    });

    await allureStep('Verify "פרויקטים קודמים" becomes enabled after advancing', async () => {
      await expect(homePage.projectsPrevButton).toBeEnabled();
    });
  });

  test('project pagination cycle — next then previous returns to page 1', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Pagination — full cycle');
    await allureSeverity('normal');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Click "פרויקטים הבאים" to go to page 2', async () => {
      await homePage.projectsNextButton.click();
    });

    await allureStep('Click "פרויקטים קודמים" to return to page 1', async () => {
      await homePage.projectsPrevButton.click();
    });

    await allureStep('Verify "פרויקטים קודמים" is disabled again on page 1', async () => {
      await expect(homePage.projectsPrevButton).toBeDisabled();
    });
  });

  test('project pagination dot indicators are present', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Pagination — dot indicators');
    await allureSeverity('minor');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify pagination dot buttons are present', async () => {
      const pageOneDot = page.getByRole('button', { name: 'Go to project page 1' });
      await expect(pageOneDot).toBeVisible();
    });
  });

  test('project cards display "פעיל" active status badge', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Active status badge');
    await allureSeverity('normal');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify at least one "פעיל" status badge is visible', async () => {
      await expect(page.getByText('פעיל').first()).toBeVisible();
    });
  });

  test('project cards display PV capacity "הספק PV ב-kW" stat heading', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('PV capacity stat');
    await allureSeverity('normal');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify "הספק PV ב-kW" label is visible on at least one card', async () => {
      await expect(page.getByText('הספק PV ב-kW').first()).toBeVisible();
    });
  });

  test('project cards display "הכנסה ל-25 שנים" revenue stat heading', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Revenue stat');
    await allureSeverity('normal');

    await allureStep('Scroll projects section into view', async () => {
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify "הכנסה ל-25 שנים" stat label is visible on at least one card', async () => {
      await expect(page.getByText('הכנסה ל-25 שנים').first()).toBeVisible();
    });
  });

  test('"השורה התחתונה" bottom-line section is visible on the page', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('Projects Section');
    await allureStory('Bottom line section');
    await allureSeverity('normal');

    const heading = page.getByRole('heading', { name: 'השורה התחתונה' });

    await allureStep('Scroll bottom-line section into view', async () => {
      await heading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify "השורה התחתונה" heading is visible', async () => {
      await expect(heading).toBeVisible();
    });
  });
});
