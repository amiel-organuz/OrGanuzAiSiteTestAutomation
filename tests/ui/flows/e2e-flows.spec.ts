import { test } from '../support/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';
import { ContactData } from '../../constants';

test.describe('E2E Critical Flows', { tag: '@e2e' }, () => {
  test('Hero → Contact: "דברו עם אור" CTA leads to contact section', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Hero to Contact');
    await allureStory('Talk to Or CTA');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Verify "דברו עם אור" link href points to #contact', async () => {
      await siteFlows.expectTalkToOrTargetsContact();
    });

    await allureStep('Click "דברו עם אור" and verify contact form becomes visible', async () => {
      await siteFlows.talkToOr();
      await siteFlows.expectContactFormReached();
    });
  });

  test('Header CTA → App: "להתחלה" points to energy.organuz.com', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Header CTA');
    await allureStory('App entry point');
    await allureSeverity('blocker');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Verify header CTA is visible and links to the app', async () => {
      await siteFlows.expectHeaderCtaTargetsApp();
    });
  });

  test('Footer CTA: footer newsletter signup is visible and interactive', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Footer CTA');
    await allureStory('Footer newsletter entry');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Scroll to footer newsletter and verify it is interactive', async () => {
      await siteFlows.revealNewsletter();
      await siteFlows.expectNewsletterInteractive();
    });
  });

  test('Blog discovery flow: nav → blog section → view all articles', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Blog Discovery');
    await allureStory('Nav to full blog');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Click "מרכז הידע" nav link', async () => {
      await siteFlows.goToBlogSection();
    });

    await allureStep('Verify blog section heading is visible', async () => {
      await siteFlows.expectBlogSectionVisible();
    });

    await allureStep('Click "צפה בכל המאמרים" and verify navigation to /blog', async () => {
      await siteFlows.viewAllArticles();
      await siteFlows.expectOnBlogPage();
    });
  });

  test('FAQ discovery flow: nav link → FAQ section → expand question', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('FAQ Discovery');
    await allureStory('Nav to FAQ expand');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Click "שאלות נפוצות" nav link to scroll to FAQ section', async () => {
      await siteFlows.goToFaqSection();
    });

    await allureStep('Expand the second FAQ question', async () => {
      await siteFlows.expandFaqQuestion(1);
    });

    await allureStep('Verify second question is expanded', async () => {
      await siteFlows.expectFaqQuestionExpanded(1);
    });
  });

  test('Agents tour: nav → scroll through all 6 agent cards', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Agents Tour');
    await allureStory('View all agents');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Click nav link to agents section', async () => {
      await siteFlows.goToAgentsSection();
    });

    await allureStep('Verify all 6 agents are visible', async () => {
      await siteFlows.expectAllAgentsVisible();
    });
  });

  test('Projects pagination flow: next → prev → back to page 1', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Projects Pagination');
    await allureStory('Full pagination cycle');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Scroll to projects section', async () => {
      await siteFlows.goToProjectsSection();
    });

    await allureStep('Verify previous button is disabled on page 1', async () => {
      await siteFlows.expectProjectsOnFirstPage();
    });

    await allureStep('Click next to go to page 2', async () => {
      await siteFlows.nextProjectsPage();
    });

    await allureStep('Click previous to return to page 1', async () => {
      await siteFlows.prevProjectsPage();
    });

    await allureStep('Verify previous button is disabled again on page 1', async () => {
      await siteFlows.expectProjectsOnFirstPage();
    });
  });

  test('Why section tab tour: all 4 tabs cycle without breaking page', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Why Section Tour');
    await allureStory('All tabs cycle');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Scroll to Why section', async () => {
      await siteFlows.goToWhySection();
    });

    await allureStep('Cycle through all 4 audience tabs', async () => {
      await siteFlows.cycleWhyTabs();
    });

    await allureStep('Verify section heading is intact after full cycle', async () => {
      await siteFlows.expectWhySectionVisible();
    });
  });

  test('Blog filter flow: apply "אנרגיה סולארית" filter then reset to "הכל"', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Blog Filter Flow');
    await allureStory('Filter and reset');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHomeAtBlog();
    });

    await allureStep('Click "אנרגיה סולארית" filter', async () => {
      await siteFlows.filterBlogBySolar();
    });

    await allureStep('Verify blog section heading is still visible', async () => {
      await siteFlows.expectBlogSectionVisible();
    });

    await allureStep('Reset by clicking "הכל" filter', async () => {
      await siteFlows.resetBlogFilter();
    });

    await allureStep('Verify blog section heading is still visible after reset', async () => {
      await siteFlows.expectBlogSectionVisible();
    });
  });

  test('Newsletter signup flow: fill email and verify value stored', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Newsletter Signup');
    await allureStory('Email capture');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Scroll to newsletter signup', async () => {
      await siteFlows.revealNewsletter();
    });

    await allureStep('Fill newsletter email input', async () => {
      await siteFlows.fillNewsletterEmail(ContactData.email);
    });

    await allureStep('Verify email is stored in the input', async () => {
      await siteFlows.expectNewsletterEmail(ContactData.email);
    });
  });

  test('Full contact form journey: fill all fields and verify values', async ({ siteFlows }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Contact Form Journey');
    await allureStory('End-to-end form fill');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await siteFlows.openHome();
    });

    await allureStep('Scroll to contact section', async () => {
      await siteFlows.goToContactSection();
    });

    await allureStep('Fill all contact form fields', async () => {
      await siteFlows.fillContactForm(ContactData);
    });

    await allureStep('Verify all fields contain the expected values', async () => {
      await siteFlows.expectContactFormValues(ContactData);
    });

    await allureStep('Verify submit button is visible and enabled', async () => {
      await siteFlows.expectContactSubmitReady();
    });
  });
});
