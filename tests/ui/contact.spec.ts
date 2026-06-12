import { test, expect } from '../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../src/utils/allure';
import { ContactData } from '../constants';

test.describe('Contact Form', { tag: '@ui' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
    await homePage.contactFormHeading.scrollIntoViewIfNeeded();
  });

  test('contact form heading and all fields are visible', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Form visibility');
    await allureSeverity('critical');

    await allureStep('Verify "שלח לנו הודעה" heading is visible', async () => {
      await expect(homePage.contactFormHeading).toBeVisible();
    });

    await allureStep('Verify all contact form fields are visible', async () => {
      await homePage.expectContactFormVisible();
    });
  });

  test('contact info (email, phone, office) is displayed', async ({ page }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Contact details');
    await allureSeverity('normal');

    await allureStep('Verify contact email is displayed', async () => {
      await expect(page.getByText('or@organuz.ai').first()).toBeVisible();
    });

    await allureStep('Verify contact phone is displayed', async () => {
      await expect(page.getByText('+972-054-9737730').first()).toBeVisible();
    });

    await allureStep('Verify office location is displayed', async () => {
      await expect(page.getByText('חיפה, ישראל').first()).toBeVisible();
    });
  });

  test('user can fill in all contact form fields', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Form fill');
    await allureSeverity('critical');

    await allureStep('Fill in full name', async () => {
      await homePage.nameInput.fill(ContactData.name);
      await expect(homePage.nameInput).toHaveValue(ContactData.name);
    });

    await allureStep('Fill in email address', async () => {
      await homePage.emailInput.fill(ContactData.email);
      await expect(homePage.emailInput).toHaveValue(ContactData.email);
    });

    await allureStep('Fill in phone number', async () => {
      await homePage.phoneInput.fill(ContactData.phone);
      await expect(homePage.phoneInput).toHaveValue(ContactData.phone);
    });

    await allureStep('Fill in message', async () => {
      await homePage.messageInput.fill(ContactData.message);
      await expect(homePage.messageInput).toHaveValue(ContactData.message);
    });
  });

  test('submit button is visible and enabled', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Submit button');
    await allureSeverity('critical');

    await allureStep('Verify "שלח הודעה" submit button is visible', async () => {
      await expect(homePage.submitButton).toBeVisible();
    });

    await allureStep('Verify submit button is enabled', async () => {
      await expect(homePage.submitButton).toBeEnabled();
    });
  });

  test('newsletter signup input and button are visible in footer', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Newsletter Signup');
    await allureStory('Newsletter form visibility');
    await allureSeverity('normal');

    await allureStep('Scroll newsletter form into view', async () => {
      await homePage.newsletterEmailInput.scrollIntoViewIfNeeded();
    });

    await allureStep('Verify newsletter email input is visible', async () => {
      await expect(homePage.newsletterEmailInput).toBeVisible();
    });

    await allureStep('Verify "הירשם" submit button is visible', async () => {
      await expect(homePage.newsletterSubmitButton).toBeVisible();
    });
  });

  test('user can type into the newsletter email input', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Newsletter Signup');
    await allureStory('Newsletter input interaction');
    await allureSeverity('normal');

    await allureStep('Scroll newsletter form into view', async () => {
      await homePage.newsletterEmailInput.scrollIntoViewIfNeeded();
    });

    await allureStep('Type email into newsletter input', async () => {
      await homePage.newsletterEmailInput.fill(ContactData.email);
      await expect(homePage.newsletterEmailInput).toHaveValue(ContactData.email);
    });
  });

  test('all contact form inputs are enabled (not disabled)', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Input enabled state');
    await allureSeverity('normal');

    await allureStep('Verify name input is enabled', async () => {
      await expect(homePage.nameInput).toBeEnabled();
    });

    await allureStep('Verify email input is enabled', async () => {
      await expect(homePage.emailInput).toBeEnabled();
    });

    await allureStep('Verify phone input is enabled', async () => {
      await expect(homePage.phoneInput).toBeEnabled();
    });

    await allureStep('Verify message input is enabled', async () => {
      await expect(homePage.messageInput).toBeEnabled();
    });
  });

  test('contact form fields can be cleared and refilled', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Clear and refill form');
    await allureSeverity('normal');

    await allureStep('Fill in name field', async () => {
      await homePage.nameInput.fill(ContactData.name);
      await expect(homePage.nameInput).toHaveValue(ContactData.name);
    });

    await allureStep('Clear name field and verify it is empty', async () => {
      await homePage.nameInput.clear();
      await expect(homePage.nameInput).toHaveValue('');
    });

    await allureStep('Refill name field with new value', async () => {
      await homePage.nameInput.fill('שם חדש לבדיקה');
      await expect(homePage.nameInput).toHaveValue('שם חדש לבדיקה');
    });
  });

  test('contact section is accessible via /#contact anchor', async ({ page, homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Anchor navigation');
    await allureSeverity('minor');

    await allureStep('Navigate directly to /#contact anchor', async () => {
      await page.goto('/#contact');
    });

    await allureStep('Verify contact form heading is visible', async () => {
      await expect(homePage.contactFormHeading).toBeVisible();
    });
  });

  test('name input is editable and accepts Hebrew characters', async ({ homePage }) => {
    await allureEpic('Homepage');
    await allureFeature('Contact Form');
    await allureStory('Hebrew text input');
    await allureSeverity('normal');

    const hebrewName = 'ישראל ישראלי';

    await allureStep('Fill name field with Hebrew text', async () => {
      await homePage.nameInput.fill(hebrewName);
    });

    await allureStep('Verify Hebrew text is accepted and stored in the field', async () => {
      await expect(homePage.nameInput).toHaveValue(hebrewName);
    });
  });
});
