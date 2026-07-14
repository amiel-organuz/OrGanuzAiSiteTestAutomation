import { test, expect, localOnly } from './support';
import { FaqQuestions } from '../constants';

localOnly();

test.describe('Local-only: FAQ questions', { tag: ['@ui', '@local-only'] }, () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('FAQ section heading is visible', async ({ home }) => {
    await expect(home.faq.heading).toBeVisible();
  });

  // Each known FAQ question renders (as an accordion button or plain text) — tolerant
  // locator so a markup tweak between button/heading doesn't flap this local suite.
  for (const question of FaqQuestions) {
    test(`FAQ question "${question}" is present`, async ({ home, page }) => {
      await expect(home.faq.question(question).or(page.getByText(question)).first()).toBeVisible();
    });
  }
});
