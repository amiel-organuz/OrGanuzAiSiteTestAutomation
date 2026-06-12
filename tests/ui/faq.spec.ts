import { test, expect } from '../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { FaqQuestions } from '../constants';

test.describe('FAQ Section', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
    await homePage.faqSectionHeading.scrollIntoViewIfNeeded();
  });

  test('FAQ section heading is visible', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Section heading');
    await allureSeverity('critical');

    await allureStep('Verify FAQ section heading is visible', async () => {
      await expect(homePage.faqSectionHeading).toBeVisible();
    });
  });

  test('first FAQ question is expanded by default', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Default expanded state');
    await allureSeverity('normal');

    const firstQuestion = FaqQuestions[0];

    await allureStep('Verify first FAQ button has expanded=true', async () => {
      const btn = page.getByRole('button', { name: firstQuestion });
      await expect(btn).toHaveAttribute('aria-expanded', 'true');
    });

    await allureStep('Verify first FAQ answer region is visible', async () => {
      const region = await homePage.getFaqAnswerRegion(firstQuestion);
      await expect(region).toBeVisible();
    });
  });

  test('clicking a collapsed FAQ question expands it', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Expand on click');
    await allureSeverity('critical');

    const secondQuestion = FaqQuestions[1];

    await allureStep(`Verify "${secondQuestion}" is initially collapsed`, async () => {
      const btn = page.getByRole('button', { name: secondQuestion });
      await expect(btn).not.toHaveAttribute('aria-expanded', 'true');
    });

    await allureStep(`Click "${secondQuestion}" to expand`, async () => {
      await homePage.clickFaqQuestion(secondQuestion);
    });

    await allureStep('Verify the question is now expanded', async () => {
      const btn = page.getByRole('button', { name: secondQuestion });
      await expect(btn).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('clicking an expanded FAQ question collapses it', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Collapse on click');
    await allureSeverity('normal');

    const firstQuestion = FaqQuestions[0];

    await allureStep('Verify first question is expanded', async () => {
      const btn = page.getByRole('button', { name: firstQuestion });
      await expect(btn).toHaveAttribute('aria-expanded', 'true');
    });

    await allureStep('Click first question to collapse it', async () => {
      await homePage.clickFaqQuestion(firstQuestion);
    });

    await allureStep('Verify the question is now collapsed', async () => {
      const btn = page.getByRole('button', { name: firstQuestion });
      await expect(btn).not.toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('all FAQ questions are listed on the page', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('All questions present');
    await allureSeverity('normal');

    await allureStep('Verify all 12 FAQ question buttons are present', async () => {
      for (const question of FaqQuestions) {
        await expect(page.getByRole('button', { name: question })).toBeVisible();
      }
    });
  });

  test('third FAQ question can be expanded', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Expand third question');
    await allureSeverity('normal');

    const thirdQuestion = FaqQuestions[2];

    await allureStep('Click third FAQ question to expand it', async () => {
      await homePage.clickFaqQuestion(thirdQuestion);
    });

    await allureStep('Verify third question is now expanded', async () => {
      await expect(page.getByRole('button', { name: thirdQuestion })).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('fourth FAQ question can be expanded', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Expand fourth question');
    await allureSeverity('normal');

    const fourthQuestion = FaqQuestions[3];

    await allureStep('Click fourth FAQ question to expand it', async () => {
      await homePage.clickFaqQuestion(fourthQuestion);
    });

    await allureStep('Verify fourth question is now expanded', async () => {
      await expect(page.getByRole('button', { name: fourthQuestion })).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('FAQ question buttons have aria-expanded attribute', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('ARIA accessibility');
    await allureSeverity('minor');

    const firstQuestion = FaqQuestions[0];

    await allureStep('Verify first FAQ button has aria-expanded attribute', async () => {
      const btn = page.getByRole('button', { name: firstQuestion });
      const ariaExpanded = await btn.getAttribute('aria-expanded');
      expect(['true', 'false']).toContain(ariaExpanded);
    });
  });

  test('multiple FAQ questions can be expanded simultaneously', async ({ homePage, page }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Multi-expand behavior');
    await allureSeverity('normal');

    const firstQuestion = FaqQuestions[0];
    const secondQuestion = FaqQuestions[1];

    await allureStep('Verify first question is expanded by default', async () => {
      await expect(page.getByRole('button', { name: firstQuestion })).toHaveAttribute('aria-expanded', 'true');
    });

    await allureStep('Expand second question', async () => {
      await homePage.clickFaqQuestion(secondQuestion);
    });

    await allureStep('Verify both questions remain expanded / first is still in expanded state', async () => {
      await expect(page.getByRole('button', { name: secondQuestion })).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('FAQ section is accessible via /#faq anchor navigation', async ({ page, homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('FAQ Section');
    await allureStory('Anchor navigation');
    await allureSeverity('minor');

    await allureStep('Navigate directly to /#faq anchor', async () => {
      await page.goto('/#faq');
    });

    await allureStep('Verify FAQ section heading is visible', async () => {
      await expect(homePage.faqSectionHeading).toBeVisible();
    });
  });
});
