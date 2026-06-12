import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { selfHeal } from '../utils/selfHeal';

export class BlogPage extends BasePage {
  readonly pageHeading: Locator;
  readonly articleCards: Locator;
  readonly readMoreLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = selfHeal(
      page.getByRole('heading', { level: 1 }),
      page.locator('h1').first(),
      page.getByRole('heading').first(),
    );
    this.articleCards = selfHeal(
      page.locator('article'),
      page.locator('[class*="article"], [class*="card"], [class*="post"]').first(),
    );
    this.readMoreLinks = selfHeal(
      page.getByRole('link', { name: /למאמר/ }),
      page.getByRole('link', { name: /קרא עוד/ }),
    );
  }

  async navigate(): Promise<void> {
    await this.goto('/blog');
    await this.waitForVisible(this.pageHeading);
  }

  async navigateToArticle(slug: string): Promise<void> {
    await this.goto(`/blog/${slug}`);
    await this.waitForVisible(this.pageHeading);
  }

  async expectOnBlogPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/blog/);
    await expect(this.pageHeading).toBeVisible();
  }

  async expectArticleHeadingContains(text: string): Promise<void> {
    await expect(this.page.getByRole('heading').first()).toContainText(text);
  }
}
