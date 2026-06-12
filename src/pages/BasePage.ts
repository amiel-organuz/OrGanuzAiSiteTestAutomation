import { Page, Locator } from '@playwright/test';
import { resolveFirst } from '../utils/selfHeal';

export abstract class BasePage {
  constructor(readonly page: Page) {}

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForVisible(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
  }

  /**
   * Resolves the first working locator from multiple strategies, emitting a
   * warning when healing occurs. Use this in action/assertion methods where the
   * target element is context-dependent; prefer selfHeal() for static locators
   * defined in the constructor.
   */
  protected findFirstWorking(description: string, ...strategies: Locator[]): Promise<Locator> {
    return resolveFirst(description, ...strategies);
  }

  get url(): string {
    return this.page.url();
  }

  get title(): Promise<string> {
    return this.page.title();
  }
}
