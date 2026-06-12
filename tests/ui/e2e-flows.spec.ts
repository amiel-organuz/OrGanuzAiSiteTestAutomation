import { test, expect } from '../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { SiteUrl, BlogSlugs, FaqQuestions, ContactData } from '../constants';

test.describe('E2E Critical Flows', { tag: '@e2e' }, () => {
  test('Hero → Contact: "דברו עם אור" CTA leads to contact section', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Hero to Contact');
    await allureStory('Talk to Or CTA');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Verify "דברו עם אור" link href points to #contact', async () => {
      await expect(homePage.talkToOrLink).toHaveAttribute('href', '#contact');
    });

    await allureStep('Click "דברו עם אור" and verify contact form becomes visible', async () => {
      await homePage.talkToOrLink.click();
      await expect(homePage.contactFormHeading).toBeVisible();
    });
  });

  test('Header CTA → App: "להתחלה" points to energy.organuz.com', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Header CTA');
    await allureStory('App entry point');
    await allureSeverity('blocker');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Verify header CTA is visible', async () => {
      await expect(homePage.headerCtaLink).toBeVisible();
    });

    await allureStep('Verify header CTA links to the app', async () => {
      await expect(homePage.headerCtaLink).toHaveAttribute('href', SiteUrl.app);
    });
  });

  test('Footer CTA → App: footer start-now link points to app', async ({ homePage, page }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Footer CTA');
    await allureStory('Footer app entry');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Scroll to footer and verify start-now link points to app', async () => {
      const footer = page.getByRole('contentinfo');
      await footer.scrollIntoViewIfNeeded();
      const footerStartNow = footer.getByRole('link', { name: 'התחילו עכשיו' }).first();
      await expect(footerStartNow).toHaveAttribute('href', SiteUrl.app);
    });
  });

  test('Blog discovery flow: nav → blog section → view all articles', async ({ homePage, page }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Blog Discovery');
    await allureStory('Nav to full blog');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Click "מרכז הידע" nav link', async () => {
      await homePage.navBlogLink.click();
    });

    await allureStep('Verify blog section heading is visible', async () => {
      await expect(homePage.blogSectionHeading).toBeVisible();
    });

    await allureStep('Click "צפה בכל המאמרים" and verify navigation to /blog', async () => {
      await homePage.viewAllBlogLink.click();
      await expect(page).toHaveURL(/\/blog/);
    });
  });

  test('FAQ discovery flow: nav link → FAQ section → expand question', async ({ homePage, page }) => {
    await allureEpic('E2E Flows');
    await allureFeature('FAQ Discovery');
    await allureStory('Nav to FAQ expand');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Click "שאלות נפוצות" nav link to scroll to FAQ section', async () => {
      await homePage.navFaqLink.click();
      await homePage.faqSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Expand the second FAQ question', async () => {
      await homePage.clickFaqQuestion(FaqQuestions[1]);
    });

    await allureStep('Verify second question is expanded', async () => {
      await expect(page.getByRole('button', { name: FaqQuestions[1] })).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('Agents tour: nav → scroll through all 6 agent cards', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Agents Tour');
    await allureStory('View all agents');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Click nav link to agents section', async () => {
      await homePage.navAgentsLink.click();
      await homePage.agentsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify all 6 agents are visible', async () => {
      await homePage.expectAllAgentsVisible();
    });
  });

  test('Projects pagination flow: next → prev → back to page 1', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Projects Pagination');
    await allureStory('Full pagination cycle');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Scroll to projects section', async () => {
      await homePage.navProjectsLink.click();
      await homePage.projectsSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify previous button is disabled on page 1', async () => {
      await expect(homePage.projectsPrevButton).toBeDisabled();
    });

    await allureStep('Click next to go to page 2', async () => {
      await homePage.projectsNextButton.click();
    });

    await allureStep('Click previous to return to page 1', async () => {
      await homePage.projectsPrevButton.click();
    });

    await allureStep('Verify previous button is disabled again on page 1', async () => {
      await expect(homePage.projectsPrevButton).toBeDisabled();
    });
  });

  test('Why section tab tour: all 4 tabs cycle without breaking page', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Why Section Tour');
    await allureStory('All tabs cycle');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Scroll to Why section', async () => {
      await homePage.navWhyLink.click();
      await homePage.whySectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Cycle through all 4 audience tabs', async () => {
      await homePage.whyTabPropertyOwners.click();
      await homePage.whyTabSolarCompanies.click();
      await homePage.whyTabAuthoritiesCorp.click();
      await homePage.whyTabInvestors.click();
    });

    await allureStep('Verify section heading is intact after full cycle', async () => {
      await expect(homePage.whySectionHeading).toBeVisible();
    });
  });

  test('Blog filter flow: apply "אנרגיה סולארית" filter then reset to "הכל"', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Blog Filter Flow');
    await allureStory('Filter and reset');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
      await homePage.blogSectionHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Click "אנרגיה סולארית" filter', async () => {
      await homePage.blogFilterSolar.click();
    });

    await allureStep('Verify blog section heading is still visible', async () => {
      await expect(homePage.blogSectionHeading).toBeVisible();
    });

    await allureStep('Reset by clicking "הכל" filter', async () => {
      await homePage.blogFilterAll.click();
    });

    await allureStep('Verify blog section heading is still visible after reset', async () => {
      await expect(homePage.blogSectionHeading).toBeVisible();
    });
  });

  test('Newsletter signup flow: fill email and verify value stored', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Newsletter Signup');
    await allureStory('Email capture');
    await allureSeverity('normal');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Scroll to newsletter signup', async () => {
      await homePage.newsletterEmailInput.scrollIntoViewIfNeeded();
    });

    await allureStep('Fill newsletter email input', async () => {
      await homePage.newsletterEmailInput.fill(ContactData.email);
    });

    await allureStep('Verify email is stored in the input', async () => {
      await expect(homePage.newsletterEmailInput).toHaveValue(ContactData.email);
    });
  });

  test('Full contact form journey: fill all fields and verify values', async ({ homePage }) => {
    await allureEpic('E2E Flows');
    await allureFeature('Contact Form Journey');
    await allureStory('End-to-end form fill');
    await allureSeverity('critical');

    await allureStep('Navigate to home page', async () => {
      await homePage.navigate();
    });

    await allureStep('Scroll to contact section', async () => {
      await homePage.navFaqLink.click();
      await homePage.contactFormHeading.scrollIntoViewIfNeeded();
    });

    await allureStep('Fill all contact form fields', async () => {
      await homePage.fillContactForm(
        ContactData.name,
        ContactData.email,
        ContactData.phone,
        ContactData.message,
      );
    });

    await allureStep('Verify all fields contain the expected values', async () => {
      await expect(homePage.nameInput).toHaveValue(ContactData.name);
      await expect(homePage.emailInput).toHaveValue(ContactData.email);
      await expect(homePage.phoneInput).toHaveValue(ContactData.phone);
      await expect(homePage.messageInput).toHaveValue(ContactData.message);
    });

    await allureStep('Verify submit button is visible and enabled', async () => {
      await expect(homePage.submitButton).toBeVisible();
      await expect(homePage.submitButton).toBeEnabled();
    });
  });
});
