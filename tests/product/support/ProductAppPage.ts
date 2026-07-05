import { expect, Locator, Page } from '@playwright/test';
import {
  PROPERTY_TYPE_LABELS,
  type ProductPersona,
  type PropertyCharacterizationData,
} from '../matrix/e2e-matrix.data';
import { unlockProductEnvironment } from './env-gate';

export interface ProductCredentials {
  readonly phone?: string;
  readonly otpCode?: string;
  readonly email?: string;
  readonly password?: string;
}

export interface ProductRuntimeIds {
  projectId?: string;
  quotationId?: string;
  entrepreneurQuotationId?: string;
  token?: string;
}

export class ProductAppPage {
  constructor(private readonly page: Page) {}

  async login(credentials: ProductCredentials): Promise<ProductRuntimeIds> {
    await this.page.goto(process.env.PRODUCT_LOGIN_PATH ?? '/');
    // DEV/TEST sit behind a shared password gate before the app loads (no-op on prod).
    await unlockProductEnvironment(this.page);

    // Idempotent: a persisted session ("זכרו אותי") may already be authenticated.
    if (await this.isLoggedIn()) {
      return this.captureRuntimeIds();
    }
    await this.openLoginDialogIfNeeded();

    if (credentials.phone) {
      const phoneField = await this.firstVisible([
        this.page.getByRole('textbox', { name: /טלפון|נייד|phone|mobile/i }),
        this.page.getByTestId('phone'),
      ]);
      // fill() (not pressSequentially) — the phone input has a mask that mangles
      // char-by-char typing; a single fill sets a valid number and enables send.
      await phoneField.fill(credentials.phone);

      const sendCode = this.page
        .getByRole('button', { name: /שלחו לי קוד|send.*code|verification|otp/i })
        .first();
      const otpHeading = this.page
        .getByRole('heading', { name: /הזנת קוד|verification|קוד אימות|enter.*code/i })
        .first();
      await expect(sendCode).toBeEnabled({ timeout: 10_000 });
      await sendCode.click();

      // The code step is occasionally slow/dropped — resend once if it doesn't render.
      try {
        await otpHeading.waitFor({ state: 'visible', timeout: 12_000 });
      } catch {
        await this.clickFirstVisible([
          this.page.getByRole('button', { name: /שלחו שנית|resend|send.*again/i }),
          sendCode,
        ]).catch(() => undefined);
        await otpHeading.waitFor({ state: 'visible', timeout: 15_000 });
      }

      if (credentials.otpCode) {
        await this.fillOtpCode(credentials.otpCode);
        await this.clickFirstVisible([
          this.page.getByTestId('verify-otp'),
          this.page.getByRole('button', { name: /אישור והתחברות|verify|continue|login|אימות|המשך|כניסה/i }),
        ]);
      }
    } else if (credentials.email && credentials.password) {
      await this.fillFirstVisible(['email', 'user'], credentials.email);
      await this.fillFirstVisible(['password'], credentials.password);
      await this.clickFirstVisible([
        this.page.getByTestId('login-submit'),
        this.page.getByRole('button', { name: /log in|sign in|login|כניסה|התחברות/i }),
      ]);
    } else {
      throw new Error('Product login requires either phone credentials or email/password credentials.');
    }

    await this.clickFirstVisible([
      this.page.getByTestId('login-submit'),
      this.page.getByRole('button', { name: /log in|sign in|login|כניסה|התחברות/i }),
      this.page.getByRole('button', { name: /continue|המשך/i }),
    ]).catch(() => undefined);
    // Avoid networkidle: the calculator's embedded map iframe keeps the network busy.
    await this.page.waitForLoadState('domcontentloaded');

    return this.captureRuntimeIds();
  }

  /**
   * Enter a verification code. The dev/test login uses N single-digit boxes
   * (one textbox per digit); other UIs may use a single field. Handles both.
   */
  private async fillOtpCode(code: string): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    const scope = (await dialog.count()) ? dialog : this.page.locator('body');

    // The code-entry step renders after "send code" — wait for it before reading fields.
    await this.page
      .getByRole('heading', { name: /הזנת קוד|verification|קוד אימות|enter.*code/i })
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    // Multi-box OTP: wait for at least a second digit box to appear.
    await scope.getByRole('textbox').nth(1).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);

    const boxes = scope.getByRole('textbox');
    const count = await boxes.count();

    if (count > 1) {
      const digits = code.split('');
      for (let i = 0; i < Math.min(count, digits.length); i++) {
        await boxes.nth(i).fill(digits[i]);
      }
      return;
    }

    await this.fillFirstVisible(['otp', 'code', 'verification-code'], code);
  }

  /**
   * Step 1 of the dev calculator wizard: choose property type + address, confirm
   * the auto-located property, and wait for the satellite roof scan to produce a
   * roof id (…/calculator/roof/<roofId>/marking). See the organuz-product-e2e skill.
   */
  async createProject(data: PropertyCharacterizationData): Promise<ProductRuntimeIds> {
    // Property type (Hebrew label button) then address autocomplete.
    await this.selectPropertyType(data.propertyType);
    const address = this.page.getByRole('combobox').first();
    await address.click();
    // Type character-by-character so the address autocomplete fires its key handlers.
    await address.pressSequentially(data.address, { delay: 60 });
    await this.page.getByRole('option').first().waitFor({ state: 'visible', timeout: 20_000 });
    await this.page.getByRole('option').first().click();

    await this.clickPrimaryContinue(); // בוא נמשיך → /address/get-address
    await this.clickFirstVisible([
      this.page.getByRole('button', { name: /זהו הנכס המבוקש|אפשר להמשיך/ }),
    ]);

    // Satellite scan runs, then routes to the roof-marking step with a runtime id.
    await this.page.getByText('טוען...').first().waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => undefined);
    await this.page.waitForURL(/\/roof\/[^/]+\/marking/i, { timeout: 45_000 });

    return this.captureRuntimeIds();
  }

  /** Click the wizard's primary "continue" button (בוא נמשיך) once it is enabled. */
  private async clickPrimaryContinue(): Promise<void> {
    const cont = this.page.getByRole('button', { name: 'בוא נמשיך' }).last();
    await expect(cont).toBeEnabled({ timeout: 20_000 });
    await cont.click();
  }

  /**
   * Wizard steps 2–3: the AI auto-detects the roof boundary (סימון השטח) and lets
   * you skip obstacle marking (placement-elements). Advances both and stops at the
   * roof-type step (…/roof/<id>/type), which requires manual map drawing.
   * Returns the runtime ids parsed from the URL path.
   */
  async advanceAutoDetectedRoof(): Promise<ProductRuntimeIds> {
    await this.clickPrimaryContinue(); // auto-detected boundary → placement-elements
    await this.page.waitForURL(/\/roof\/[^/]+\/placement-elements/i, { timeout: 30_000 });
    await this.clickPrimaryContinue(); // skip obstacles → roof type
    await this.page.waitForURL(/\/roof\/[^/]+\/type/i, { timeout: 30_000 });
    return this.captureRoofRuntimeIds();
  }

  /** Parse the project + roof ids out of the calculator URL path. */
  captureRoofRuntimeIds(): ProductRuntimeIds {
    const match = this.page.url().match(/\/([^/]+)\/calculator\/roof\/([^/]+)\//i);
    return { projectId: match?.[1], quotationId: match?.[2] };
  }

  async characterizeRoof(data: PropertyCharacterizationData): Promise<ProductRuntimeIds> {
    await this.markPolygons(data);
    await this.markRoofSurfaces(data);
    await this.markMinimumQuotableRoof(data.minimumPanelCount);
    await this.clickFirstVisible([
      this.page.getByTestId('roof-next'),
      this.page.getByRole('button', { name: /calculate|next|continue|חשב|המשך/i }),
    ]);
    await this.page.waitForLoadState('networkidle');

    return this.captureRuntimeIds();
  }

  async expectInsufficientPanelsModal(): Promise<void> {
    await expect(this.page.getByText(/not enough panels|insufficient panels|פחות מ.?5|אין מספיק פאנלים/i).first()).toBeVisible();
  }

  async answerFunding(data: PropertyCharacterizationData): Promise<ProductRuntimeIds> {
    const choice = data.wantFinancingOffer
      ? /yes|interested|כן|מעוניין/i
      : /no|not now|לא/i;

    await this.clickFirstVisible([
      this.page.getByTestId(data.wantFinancingOffer ? 'financing-yes' : 'financing-no'),
      this.page.getByRole('radio', { name: choice }),
      this.page.getByRole('button', { name: choice }),
    ]);
    await this.clickFirstVisible([
      this.page.getByTestId('funding-next'),
      this.page.getByRole('button', { name: /next|continue|finish|סיום|המשך/i }),
    ]);
    await this.page.waitForLoadState('networkidle');

    return this.captureRuntimeIds();
  }

  async expectPostFundingDestination(persona: ProductPersona): Promise<void> {
    const destination = persona.expectedPostFundingDestination === 'quotations'
      ? /quotation|quote|הצעות|הצעת מחיר/i
      : /result|summary|תוצאות|סיכום/i;

    await expect(this.page).toHaveURL(destination);
  }

  async openQuotationsFromResults(): Promise<void> {
    await this.clickFirstVisible([
      this.page.getByTestId('continue-to-quotations'),
      this.page.getByRole('link', { name: /quotation|quote|הצעות|הצעת מחיר/i }),
      this.page.getByRole('button', { name: /quotation|quote|הצעות|הצעת מחיר/i }),
    ]);
    await expect(this.page).toHaveURL(/quotation|quote|הצעות/i);
  }

  async downloadOwnQuotation(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickFirstVisible([
      this.page.getByTestId('download-own-quotation'),
      this.page.getByRole('link', { name: /download|quotation|הורדה|הצעת מחיר/i }),
      this.page.getByRole('button', { name: /download|quotation|הורדה|הצעת מחיר/i }),
    ]);
    await downloadPromise;
  }

  async expectAccessBlocked(path: string): Promise<void> {
    await this.page.goto(path);
    await expect(this.page.getByText(/forbidden|unauthorized|access denied|403|אין הרשאה|גישה נדחתה/i).first()).toBeVisible();
  }

  captureRuntimeIds(): ProductRuntimeIds {
    const url = new URL(this.page.url());

    return {
      projectId: this.findRuntimeValue(url, ['projectId', 'project', 'pid']),
      quotationId: this.findRuntimeValue(url, ['quotationId', 'quotation', 'qid']),
      entrepreneurQuotationId: this.findRuntimeValue(url, ['entrepreneurQuotationId']),
      token: this.findRuntimeValue(url, ['token']),
    };
  }

  private async fillFirstVisible(testIds: readonly string[], value: string): Promise<void> {
    const locators = testIds.flatMap((testId) => [
      this.page.getByTestId(testId),
      this.page.getByLabel(new RegExp(testId.replace('-', '.*'), 'i')),
      this.page.locator(`input[name="${testId}"]`),
    ]);

    await (await this.firstVisible(locators)).fill(value);
  }

  /** The header user-menu button, whose accessible name is "<name>, <role>". */
  userMenuButton(): Locator {
    return this.page.getByRole('button', { name: /בעל נכס|יועץ|קבלן|חברת|יזם/ }).first();
  }

  /** Open the user menu and go to the personal area (…/pricing/my-offers). */
  async openPersonalArea(): Promise<void> {
    await this.userMenuButton().click();
    await this.page.getByRole('menuitem', { name: 'איזור אישי' }).click();
    await this.page.waitForURL(/\/pricing\//i, { timeout: 20_000 });
  }

  /** Open the user menu and log out. */
  async logout(): Promise<void> {
    await this.userMenuButton().click();
    await this.page.getByRole('menuitem', { name: 'התנתק' }).click();
  }

  /** True when the app is already authenticated (login entry point is gone). */
  private async isLoggedIn(): Promise<boolean> {
    const loginEntry = this.page
      .getByRole('button', { name: /הרשמה\s*\/\s*כניסה|הרשמה|התחברות|sign in|log in/i })
      .first();
    // Give the header a moment to render, then treat "no login button" as logged in.
    const loginVisible = await loginEntry.isVisible({ timeout: 4_000 }).catch(() => false);
    return !loginVisible;
  }

  private async openLoginDialogIfNeeded(): Promise<void> {
    const loginInput = this.page.getByLabel(/phone|mobile|טלפון|נייד|email|דוא/i).first();
    if (await loginInput.isVisible().catch(() => false)) {
      return;
    }

    await this.clickFirstVisible([
      this.page.getByTestId('login-open'),
      this.page.getByRole('button', { name: /login|sign in|register|כניסה|התחברות|הרשמה/i }),
      this.page.getByRole('link', { name: /login|sign in|register|כניסה|התחברות|הרשמה/i }),
    ]);
  }

  private async selectPropertyType(propertyType: PropertyCharacterizationData['propertyType']): Promise<void> {
    const label = PROPERTY_TYPE_LABELS[propertyType];
    // Wait for the property-type buttons to render after login before clicking.
    const button = this.page.getByRole('button', { name: new RegExp(label, 'i') }).first();
    await button.waitFor({ state: 'visible', timeout: 20_000 });
    await button.click();
  }

  private async selectArena(data: PropertyCharacterizationData): Promise<void> {
    if (data.arenaType === 'ARENA_TYPE_RAMOT') {
      await this.clickIfVisible([
        this.page.getByTestId('arena-ramot'),
        this.page.getByRole('button', { name: /רמות|ramot/i }),
        this.page.getByRole('link', { name: /רמות|ramot/i }),
      ]);
      return;
    }

    await this.clickIfVisible([
      this.page.getByTestId('arena-main'),
      this.page.getByRole('button', { name: /זירה מרכזית|main arena/i }),
      this.page.getByRole('link', { name: /זירה מרכזית|main arena/i }),
    ]);
  }

  private async markPolygons(data: PropertyCharacterizationData): Promise<void> {
    for (const polygon of data.polygons) {
      await this.clickIfVisible([
        this.page.getByTestId(`polygon-${polygon}`),
        this.page.getByRole('button', { name: new RegExp(polygon.replace('-', '.*'), 'i') }),
      ]);
    }
  }

  private async markRoofSurfaces(data: PropertyCharacterizationData): Promise<void> {
    if (data.skipsObjectAndRoofSteps) {
      return;
    }

    for (const surface of data.roofSurfaces) {
      await this.clickIfVisible([
        this.page.getByTestId(`roof-surface-${surface}`),
        this.page.getByRole('button', { name: roofSurfaceName(surface) }),
        this.page.getByRole('radio', { name: roofSurfaceName(surface) }),
      ]);
    }
  }

  private async markMinimumQuotableRoof(panelCount: number): Promise<void> {
    await this.fillIfVisible(this.page.getByTestId('panel-count'), String(panelCount));
    await this.fillIfVisible(this.page.getByLabel(/panel|פאנל/i), String(panelCount));
  }

  private async fillIfVisible(locator: Locator, value: string): Promise<boolean> {
    if (!(await locator.first().isVisible().catch(() => false))) {
      return false;
    }

    await locator.first().fill(value);
    return true;
  }

  private async clickFirstVisible(locators: readonly Locator[]): Promise<void> {
    await (await this.firstVisible(locators)).click();
  }

  private async clickIfVisible(locators: readonly Locator[]): Promise<boolean> {
    for (const locator of locators) {
      const first = locator.first();
      if (await first.isVisible().catch(() => false)) {
        await first.click();
        return true;
      }
    }

    return false;
  }

  private async firstVisible(locators: readonly Locator[]): Promise<Locator> {
    for (const locator of locators) {
      const first = locator.first();
      if (await first.isVisible().catch(() => false)) {
        return first;
      }
    }

    throw new Error('No visible product app locator matched the expected flow step.');
  }

  private findRuntimeValue(url: URL, keys: readonly string[]): string | undefined {
    for (const key of keys) {
      const value = url.searchParams.get(key);
      if (value) {
        return value;
      }
    }

    const match = url.pathname.match(/\/(?:projects?|quotations?|quotes?)\/([^/?#]+)/i);
    return match?.[1];
  }
}

function roofSurfaceName(surface: PropertyCharacterizationData['roofSurfaces'][number]): RegExp {
  const names: Record<PropertyCharacterizationData['roofSurfaces'][number], RegExp> = {
    concrete: /concrete|בטון/i,
    tiles: /tiles|רעפים/i,
    iscoverit: /iscoverit|איסכורית|איזכורית/i,
    parking: /parking|חניה/i,
    'sports-court': /sports|court|מגרש ספורט/i,
  };

  return names[surface];
}
