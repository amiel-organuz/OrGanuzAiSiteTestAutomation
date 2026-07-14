import { Page, Locator, expect } from '@playwright/test';
import { selfHeal } from '../../utils/selfHeal';
import { marketingText as T } from '../../i18n/marketing';
import { allureStep } from '../../utils/allure';

/** Sub-page-object for the contact form: the five fields + submit. */
export class ContactForm {
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    const t = T.contact;
    this.heading = selfHeal(page.getByRole('heading', { name: t.heading }), page.getByRole('heading', { name: /שלח לנו/ }));
    const box = (name: string, re: RegExp) =>
      selfHeal(page.getByRole('textbox', { name }), page.getByRole('textbox', { name: re }));
    this.nameInput = box(t.fields.name, /שם מלא/);
    this.emailInput = box(t.fields.email, /כתובת אימייל/);
    this.phoneInput = box(t.fields.phone, /טלפון/);
    this.messageInput = box(t.fields.message, /הודעה/);
    this.submitButton = selfHeal(page.getByRole('button', { name: t.submit }), page.getByRole('button', { name: /שלח הודעה/ }));
  }

  async fill(name: string, email: string, phone: string, message: string): Promise<void> {
    await allureStep('Fill contact name', () => this.nameInput.fill(name));
    await allureStep('Fill contact email', () => this.emailInput.fill(email));
    await allureStep('Fill contact phone', () => this.phoneInput.fill(phone));
    await allureStep('Fill contact message', () => this.messageInput.fill(message));
  }

  /** Visibility only — never submit (keeps automation data out of the real CRM). */
  async expectAllVisible(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
    await expect(this.messageInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}

/** Sub-page-object for the footer newsletter form. */
export class NewsletterForm {
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    const t = T.newsletter;
    this.emailInput = selfHeal(
      page.getByRole('textbox', { name: t.emailPlaceholder }),
      page.getByRole('textbox', { name: /אימייל שלך/ }),
      page.locator('footer input[type="email"]').first(),
    );
    this.submitButton = selfHeal(
      page.getByRole('button', { name: t.subscribe }),
      page.getByRole('button', { name: /הירשם/ }),
      page.locator('footer button').first(),
    );
  }

  async subscribe(email: string): Promise<void> {
    await allureStep('Fill newsletter email', () => this.emailInput.fill(email));
    await allureStep('Submit newsletter form', () => this.submitButton.click());
  }
}
