import { Page, Locator, expect } from '@playwright/test';
import { HomePage } from '../../../src/pages';
import { SiteUrl, FaqQuestions, ContactDetails } from '../../constants';

/**
 * High-level, reusable marketing-site flows so specs stay short and readable.
 * Orchestrates the HomePage page object into named journeys and assertions,
 * mirroring the ProductFlows pattern used by the product suite. Specs drive the
 * site through these flows and never touch HomePage locators directly — all DOM
 * knowledge stays in the page object, all sequencing stays here.
 */
export class SiteFlows {
  private readonly home: HomePage;

  constructor(page: Page) {
    this.home = new HomePage(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Open the marketing home page and wait for the hero. */
  async openHome(): Promise<void> {
    await this.home.navigate();
  }

  /** Open the home page and scroll the blog section into view. */
  async openHomeAtBlog(): Promise<void> {
    await this.home.navigate();
    await this.home.blogSectionHeading.scrollIntoViewIfNeeded();
  }

  /** Click the "מרכז הידע" nav link to reach the blog section. */
  async goToBlogSection(): Promise<void> {
    await this.home.navBlogLink.click();
  }

  /** Click the "שאלות נפוצות" nav link and scroll the FAQ section into view. */
  async goToFaqSection(): Promise<void> {
    await this.openSection(this.home.navFaqLink, this.home.faqSectionHeading);
  }

  /** Click the "הסוכנים" nav link and scroll the agents section into view. */
  async goToAgentsSection(): Promise<void> {
    await this.openSection(this.home.navAgentsLink, this.home.agentsSectionHeading);
  }

  /** Click the "פרויקטים לדוגמא" nav link and scroll the projects section into view. */
  async goToProjectsSection(): Promise<void> {
    await this.openSection(this.home.navProjectsLink, this.home.projectsSectionHeading);
  }

  /** Click the "למה Organuz" nav link and scroll the Why section into view. */
  async goToWhySection(): Promise<void> {
    await this.openSection(this.home.navWhyLink, this.home.whySectionHeading);
  }

  /** Scroll to the contact section (reached via the FAQ nav link, which precedes it). */
  async goToContactSection(): Promise<void> {
    await this.openSection(this.home.navFaqLink, this.home.contactFormHeading);
  }

  /** Bring the footer newsletter signup into view. */
  async revealNewsletter(): Promise<void> {
    await this.home.newsletterEmailInput.scrollIntoViewIfNeeded();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Click the hero "דברו עם אור" CTA. */
  async talkToOr(): Promise<void> {
    await this.home.talkToOrLink.click();
  }

  /** Click "צפה בכל המאמרים" to open the full blog listing. */
  async viewAllArticles(): Promise<void> {
    await this.home.viewAllBlogLink.click();
  }

  /** Expand a FAQ question by its index in the FaqQuestions constant. */
  async expandFaqQuestion(index: number): Promise<void> {
    await this.home.clickFaqQuestion(FaqQuestions[index]);
  }

  /** Page the projects carousel forward. */
  async nextProjectsPage(): Promise<void> {
    await this.home.projectsNextButton.click();
  }

  /** Page the projects carousel backward. */
  async prevProjectsPage(): Promise<void> {
    await this.home.projectsPrevButton.click();
  }

  /** Cycle through all four Why-section audience tabs. */
  async cycleWhyTabs(): Promise<void> {
    await this.home.whyTabPropertyOwners.click();
    await this.home.whyTabSolarCompanies.click();
    await this.home.whyTabAuthoritiesCorp.click();
    await this.home.whyTabInvestors.click();
  }

  /** Apply the "אנרגיה סולארית" blog filter. */
  async filterBlogBySolar(): Promise<void> {
    await this.home.blogFilterSolar.click();
  }

  /** Reset the blog filter to "הכל". */
  async resetBlogFilter(): Promise<void> {
    await this.home.blogFilterAll.click();
  }

  /** Type an email into the footer newsletter input. */
  async fillNewsletterEmail(email: string): Promise<void> {
    await this.home.newsletterEmailInput.fill(email);
  }

  /** Fill every contact-form field with the supplied contact data. */
  async fillContactForm(data: ContactDetails): Promise<void> {
    await this.home.fillContactForm(data.name, data.email, data.phone, data.message);
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  /** The hero CTA points at the in-page #contact anchor. */
  async expectTalkToOrTargetsContact(): Promise<void> {
    await expect(this.home.talkToOrLink).toHaveAttribute('href', '#contact');
  }

  /** The contact form heading is visible (contact section reached). */
  async expectContactFormReached(): Promise<void> {
    await expect(this.home.contactFormHeading).toBeVisible();
  }

  /** The header CTA is visible and links to the product app. */
  async expectHeaderCtaTargetsApp(): Promise<void> {
    await expect(this.home.headerCtaLink).toBeVisible();
    await expect(this.home.headerCtaLink).toHaveAttribute('href', SiteUrl.app);
  }

  /** The footer newsletter signup is visible and its input is enabled. */
  async expectNewsletterInteractive(): Promise<void> {
    await expect(this.home.newsletterEmailInput).toBeVisible();
    await expect(this.home.newsletterSubmitButton).toBeVisible();
    await expect(this.home.newsletterEmailInput).toBeEnabled();
  }

  /** The blog section heading is visible. */
  async expectBlogSectionVisible(): Promise<void> {
    await expect(this.home.blogSectionHeading).toBeVisible();
  }

  /** The browser landed on the full /blog listing page. */
  async expectOnBlogPage(): Promise<void> {
    await expect(this.home.page).toHaveURL(/\/blog/);
  }

  /** The FAQ question at the given index is expanded. */
  async expectFaqQuestionExpanded(index: number): Promise<void> {
    await expect(this.home.faqQuestion(FaqQuestions[index])).toHaveAttribute('aria-expanded', 'true');
  }

  /** All six agent cards are visible. */
  async expectAllAgentsVisible(): Promise<void> {
    await this.home.expectAllAgentsVisible();
  }

  /** The projects carousel is on page 1 (previous button disabled). */
  async expectProjectsOnFirstPage(): Promise<void> {
    await expect(this.home.projectsPrevButton).toBeDisabled();
  }

  /** The Why section heading is still visible (survived a tab cycle). */
  async expectWhySectionVisible(): Promise<void> {
    await expect(this.home.whySectionHeading).toBeVisible();
  }

  /** The footer newsletter input holds the expected email. */
  async expectNewsletterEmail(email: string): Promise<void> {
    await expect(this.home.newsletterEmailInput).toHaveValue(email);
  }

  /** Every contact-form field holds its expected value. */
  async expectContactFormValues(data: ContactDetails): Promise<void> {
    await expect(this.home.nameInput).toHaveValue(data.name);
    await expect(this.home.emailInput).toHaveValue(data.email);
    await expect(this.home.phoneInput).toHaveValue(data.phone);
    await expect(this.home.messageInput).toHaveValue(data.message);
  }

  /** The contact submit button is visible and enabled. */
  async expectContactSubmitReady(): Promise<void> {
    await expect(this.home.submitButton).toBeVisible();
    await expect(this.home.submitButton).toBeEnabled();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Follow a nav link, then scroll its target section heading into view. */
  private async openSection(navLink: Locator, sectionHeading: Locator): Promise<void> {
    await navLink.click();
    await sectionHeading.scrollIntoViewIfNeeded();
  }
}
