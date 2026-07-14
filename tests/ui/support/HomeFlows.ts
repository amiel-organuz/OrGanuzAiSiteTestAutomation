import { Page } from '@playwright/test';
import { HomePage } from '../../../src/pages';

/**
 * Mid-layer flows for the marketing home page (the same two-layer shape as ProductFlows
 * over ProductAppPage). Specs open the page through here and reach each section via its
 * sub-page-object, keeping specs short: `await home.open(); await home.agents.expectAllAgentsVisible();`
 */
export class HomeFlows {
  readonly home: HomePage;

  constructor(page: Page) {
    this.home = new HomePage(page);
  }

  /** Navigate to the home page and wait for the hero to render. */
  async open(): Promise<void> {
    await this.home.navigate();
  }

  get header() { return this.home.header; }
  get hero() { return this.home.hero; }
  get why() { return this.home.why; }
  get or() { return this.home.or; }
  get agents() { return this.home.agents; }
  get projects() { return this.home.projects; }
  get blog() { return this.home.blog; }
  get faq() { return this.home.faq; }
  get contact() { return this.home.contact; }
  get newsletter() { return this.home.newsletter; }
}
