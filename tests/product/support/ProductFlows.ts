import { Page } from '@playwright/test';
import { ProductAppPage, ProductRuntimeIds } from './ProductAppPage';
import { unlockProductEnvironment } from './env-gate';
import { PropertyCharacterizationData, ProductPersonaId } from '../matrix/e2e-matrix.data';

/**
 * High-level, reusable product-app flows so specs stay short and readable.
 * Wraps ProductAppPage step methods into named end-to-end sequences.
 * See the organuz-product-e2e skill for the underlying wizard.
 */
export class ProductFlows {
  readonly app: ProductAppPage;

  constructor(private readonly page: Page) {
    this.app = new ProductAppPage(page);
  }

  /** Open the calculator shell, unlocking the dev/test password gate (no-op on prod). */
  async openCalculator(): Promise<void> {
    await this.page.goto('/');
    await unlockProductEnvironment(this.page);
  }

  /** Log in as a persona using its env credentials (phone + fixed dev OTP 7777). */
  async loginAs(personaId: ProductPersonaId): Promise<ProductRuntimeIds> {
    const key = personaId.toUpperCase().replace(/-/g, '_');
    const phone = process.env[`${key}_PHONE`];
    const otpCode = process.env[`${key}_OTP_CODE`];
    if (!phone) {
      throw new Error(`Missing ${key}_PHONE for product persona "${personaId}".`);
    }
    return this.app.login({ phone, otpCode });
  }

  /** Open the header user menu (exposes "איזור אישי" and "התנתק"). */
  async openUserMenu(): Promise<void> {
    await this.app.openUserMenu();
  }

  /** Open the user menu → personal area (…/pricing/my-offers). */
  async openPersonalArea(): Promise<void> {
    await this.app.openPersonalArea();
  }

  /** Click a personal-area sidebar entry by its Hebrew label (e.g. "מחירון קבלני"). */
  async openSidebarEntry(name: string | RegExp): Promise<void> {
    await this.app.openSidebarEntry(name);
  }

  /** Open the user menu → log out. */
  async logout(): Promise<void> {
    await this.app.logout();
  }

  /** Assert the app is signed out (public calculator + login entry available). */
  async expectLoggedOut(): Promise<void> {
    await this.app.expectLoggedOut();
  }

  /**
   * Drive the characterization wizard through its automated portion:
   * property type + address → satellite roof scan → AI-detected boundary →
   * obstacles → roof-type step. Returns the runtime ids from the URL.
   */
  async characterizeToRoofType(scenario: PropertyCharacterizationData): Promise<ProductRuntimeIds> {
    await this.app.createProject(scenario);
    return this.app.advanceAutoDetectedRoof();
  }
}
