/**
 * Product app — new-account registration (dev).
 *
 * Two distinct intake paths exist, mapped live via the Playwright MCP:
 *
 *  - **Property owner (customer)** — a self-serve in-app form ("הרשמת בעלי נכסים":
 *    first/last name + mobile + email + terms) followed by the same phone-OTP step as
 *    login. Covered here both as a no-side-effect validation check and as a full signup
 *    that creates a fresh account (unique valid phone per run, dev fixed OTP 7777) and
 *    lands authenticated as a "בעל נכס".
 *  - **Solar company / entrepreneur (company + consultant)** — NOT self-serve: their
 *    "הירשמו כאן" opens the marketing-site contact/lead form (organuz.ai/#contact).
 *    Onboarding is manual, so those tests assert the redirect rather than a signup.
 *
 * Uses the RegistrationFlows helper. These specs start logged out (no authRole) — they
 * create their own accounts — so they never touch the shared per-role storageState.
 *
 * Gated behind PRODUCT_E2E_ENABLED=true (+ dev OTP 7777 for the live signup).
 */
import { test, expect } from '../support/fixtures';
import { RegistrationFlows } from '../support/RegistrationFlows';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../../src/utils/allure';

const e2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

test.describe('Product registration (dev)', { tag: ['@product', '@registration', '@e2e', '@roles'] }, () => {
  test.skip(!e2eEnabled, 'Set PRODUCT_E2E_ENABLED=true plus dev OTP to run the registration flows.');
  // Opening the app, the register dialog, and (for signup) the OTP round trip make these slow.
  test.describe.configure({ timeout: 150_000 });

  test.describe('property owner (customer)', () => {
    test('registration form gates submit on required fields + terms', { tag: '@critical' }, async ({ page, registration }) => {
      await allureEpic('Product app');
      await allureFeature('Registration');
      await allureStory('Property-owner form validation');
      await allureSeverity('critical');

      await registration.openCustomerRegistrationForm();

      const submit = registration.app.registrationSubmitButton();

      await test.step('form renders with an initially-disabled submit', async () => {
        await expect(page.getByRole('heading', { name: 'הרשמת בעלי נכסים' })).toBeVisible();
        for (const field of ['שם פרטי', 'שם משפחה', 'טלפון נייד', 'דואר אלקטרוני']) {
          await expect(page.getByRole('textbox', { name: field })).toBeVisible();
        }
        await expect(submit, 'submit enabled before any input').toBeDisabled();
      });

      await test.step('filled fields alone (no terms) keep submit disabled', async () => {
        await registration.app.fillCustomerRegistrationFields(RegistrationFlows.newCustomerAccount());
        await expect(submit, 'submit enabled without accepting terms').toBeDisabled();
      });

      await test.step('accepting the terms enables submit', async () => {
        await registration.app.acceptRegistrationTerms();
        await expect(submit, 'submit still disabled after accepting terms').toBeEnabled();
      });
    });

    test('revoking required terms consent disables submit again', async ({ registration }) => {
      await allureEpic('Product app');
      await allureFeature('Registration');
      await allureStory('Required terms consent');
      await allureSeverity('critical');

      await registration.openCustomerRegistrationForm();
      await registration.app.fillCustomerRegistrationFields(RegistrationFlows.newCustomerAccount());

      const submit = registration.app.registrationSubmitButton();
      const terms = registration.app.registrationTermsCheckbox();

      await test.step('accepting terms enables a complete form', async () => {
        await terms.check();
        await expect(submit).toBeEnabled();
      });

      await test.step('unchecking terms re-disables submit', async () => {
        await terms.uncheck();
        await expect(submit, 'submit remained enabled without required terms').toBeDisabled();
      });
    });

    test('invalid mobile number keeps submit disabled even with required terms', async ({ registration }) => {
      await allureEpic('Product app');
      await allureFeature('Registration');
      await allureStory('Mobile validation');
      await allureSeverity('critical');

      await registration.openCustomerRegistrationForm();

      const account = {
        ...RegistrationFlows.newCustomerAccount(),
        phone: '123',
      };

      await registration.app.fillCustomerRegistrationFields(account);
      await registration.app.acceptRegistrationTerms();

      await expect(
        registration.app.registrationSubmitButton(),
        'submit enabled for an invalid mobile number',
      ).toBeDisabled();
    });

    test('optional updates consent does not gate registration submit', async ({ registration }) => {
      await allureEpic('Product app');
      await allureFeature('Registration');
      await allureStory('Optional consent');
      await allureSeverity('normal');

      await registration.openCustomerRegistrationForm();
      await registration.app.fillCustomerRegistrationFields(RegistrationFlows.newCustomerAccount());
      await registration.app.acceptRegistrationTerms();

      const submit = registration.app.registrationSubmitButton();
      const optionalConsent = registration.app.registrationOptionalConsentCheckbox();

      await test.step('complete form is submittable with optional consent unchecked', async () => {
        await expect(optionalConsent).not.toBeChecked();
        await expect(submit).toBeEnabled();
      });

      await test.step('toggling optional consent keeps submit enabled', async () => {
        await optionalConsent.check();
        await expect(submit).toBeEnabled();

        await optionalConsent.uncheck();
        await expect(submit).toBeEnabled();
      });
    });

    test('a new property owner can self-register end to end', { tag: '@critical' }, async ({ page, registration }) => {
      await allureEpic('Product app');
      await allureFeature('Registration');
      await allureStory('Property-owner signup');
      await allureSeverity('critical');

      const account = RegistrationFlows.newCustomerAccount();

      await registration.registerCustomer(account);

      await test.step('lands authenticated as a property owner', async () => {
        await expect(page.getByRole('button', { name: /בעל נכס/ }).first()).toBeVisible();
        await expect(
          page.getByRole('button', { name: /הרשמה\s*\/\s*כניסה|הרשמה/ }),
          'public login CTA still present after signup',
        ).toHaveCount(0);
      });
    });
  });

  // Company and consultant share one intake: the "חברה סולארית? יזם סולארי?" register CTA
  // opens the marketing contact/lead form (there is no in-app signup for these roles).
  for (const role of ['company', 'consultant'] as const) {
    test(`${role} registration opens the contact/lead form`, { tag: '@critical' }, async ({ registration }) => {
      await allureEpic('Product app');
      await allureFeature('Registration');
      await allureStory(`${role} contact-form intake`);
      await allureSeverity('critical');

      const contact = await registration.openSolarCompanyRegistration();

      try {
        await expect(contact, 'did not open the marketing contact form').toHaveURL(/organuz\.ai\/?#?contact/i);
        await expect(contact.getByRole('textbox', { name: /שם מלא|כתובת אימייל|טלפון/ }).first()).toBeVisible();
      } finally {
        await contact.close();
      }
    });
  }
});
