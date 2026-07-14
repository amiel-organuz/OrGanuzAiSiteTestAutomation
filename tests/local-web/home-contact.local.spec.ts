import { test, expect, localOnly } from './support';
import type { HomeFlows } from '../ui/support/HomeFlows';
import type { Locator } from '@playwright/test';

localOnly();

type Get = (h: HomeFlows) => Locator;

test.describe('Local-only: contact form fields', { tag: ['@ui', '@local-only'] }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  // Visibility only — never fill/submit, so no automation data reaches the real CRM.
  const fields: [string, Get][] = [
    ['Full name', (h) => h.contact.nameInput],
    ['Email', (h) => h.contact.emailInput],
    ['Phone', (h) => h.contact.phoneInput],
    ['Message', (h) => h.contact.messageInput],
    ['Submit', (h) => h.contact.submitButton],
  ];

  for (const [label, get] of fields) {
    test(`contact field "${label}" is visible`, async ({ home }) => {
      await expect(get(home)).toBeVisible();
    });
  }
});
