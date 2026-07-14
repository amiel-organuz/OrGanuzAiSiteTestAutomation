import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { HeaderNav } from './components/HeaderNav';
import { HeroSection } from './components/HeroSection';
import {
  WhySection,
  OrSection,
  AgentsSection,
  ProjectsSection,
  BlogSection,
  FaqSection,
} from './components/Sections';
import { ContactForm, NewsletterForm } from './components/ContactForm';

/**
 * Marketing home page as a composition of sub-page-objects (component objects). Each
 * section owns its own locators + small assertions; the page is the composition root that
 * wires them and handles navigation. Specs reach sections via these properties (usually
 * through the `HomeFlows` mid-layer), e.g. `home.contact.expectAllVisible()`.
 */
export class HomePage extends BasePage {
  readonly header: HeaderNav;
  readonly hero: HeroSection;
  readonly why: WhySection;
  readonly or: OrSection;
  readonly agents: AgentsSection;
  readonly projects: ProjectsSection;
  readonly blog: BlogSection;
  readonly faq: FaqSection;
  readonly contact: ContactForm;
  readonly newsletter: NewsletterForm;

  constructor(page: Page) {
    super(page);
    this.header = new HeaderNav(page);
    this.hero = new HeroSection(page);
    this.why = new WhySection(page);
    this.or = new OrSection(page);
    this.agents = new AgentsSection(page);
    this.projects = new ProjectsSection(page);
    this.blog = new BlogSection(page);
    this.faq = new FaqSection(page);
    this.contact = new ContactForm(page);
    this.newsletter = new NewsletterForm(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/');
    await this.waitForVisible(this.hero.heading);
  }

  async expectOnHomePage(): Promise<void> {
    await expect(this.hero.heading).toBeVisible();
  }
}
