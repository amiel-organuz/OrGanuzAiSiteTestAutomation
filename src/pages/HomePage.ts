import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { selfHeal } from '../utils/selfHeal';

export class HomePage extends BasePage {
  // ── Header ───────────────────────────────────────────────────────────────
  readonly logo: Locator;
  readonly nav: Locator;
  readonly navWhyLink: Locator;
  readonly navOrLink: Locator;
  readonly navAgentsLink: Locator;
  readonly navProjectsLink: Locator;
  readonly navBlogLink: Locator;
  readonly navFaqLink: Locator;
  readonly languageButton: Locator;
  readonly headerCtaLink: Locator;

  // ── Hero ─────────────────────────────────────────────────────────────────
  readonly heroHeading: Locator;
  readonly heroSubtitle: Locator;
  readonly userTypeBtnPrivateHomes: Locator;
  readonly userTypeBtnResidentialBuildings: Locator;
  readonly userTypeBtnBusinesses: Locator;
  readonly userTypeBtnAgriculture: Locator;
  readonly userTypeBtnAuthorities: Locator;
  readonly userTypeBtnMarketPlayers: Locator;
  readonly startNowLink: Locator;

  // ── Why Organuz ───────────────────────────────────────────────────────────
  readonly whySectionHeading: Locator;
  readonly whyTabPropertyOwners: Locator;
  readonly whyTabSolarCompanies: Locator;
  readonly whyTabAuthoritiesCorp: Locator;
  readonly whyTabInvestors: Locator;

  // ── Or agent ─────────────────────────────────────────────────────────────
  readonly orSectionHeading: Locator;
  readonly talkToOrLink: Locator;

  // ── Agents ────────────────────────────────────────────────────────────────
  readonly agentsSectionHeading: Locator;
  readonly agentSolaraWattson: Locator;
  readonly agentFranklinAmpere: Locator;
  readonly agentLuminaMaxwell: Locator;
  readonly agentKelvinVolta: Locator;
  readonly agentEdisonWatts: Locator;
  readonly agentMaxwellCharge: Locator;

  // ── Projects ──────────────────────────────────────────────────────────────
  readonly projectsSectionHeading: Locator;
  readonly projectsNextButton: Locator;
  readonly projectsPrevButton: Locator;

  // ── Blog ─────────────────────────────────────────────────────────────────
  readonly blogSectionHeading: Locator;
  readonly blogFilterAll: Locator;
  readonly blogFilterEnergy: Locator;
  readonly blogFilterStorage: Locator;
  readonly blogFilterSolar: Locator;
  readonly blogFilterElectricity: Locator;
  readonly viewAllBlogLink: Locator;

  // ── FAQ ──────────────────────────────────────────────────────────────────
  readonly faqSectionHeading: Locator;

  // ── Contact form ─────────────────────────────────────────────────────────
  readonly contactFormHeading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;

  // ── Newsletter ────────────────────────────────────────────────────────────
  readonly newsletterEmailInput: Locator;
  readonly newsletterSubmitButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.logo = selfHeal(
      page.getByRole('link', { name: 'Organuz' }).first(),
      page.getByRole('link', { name: /rganuz/i }).first(),
      page.locator('header a').first(),
    );
    this.nav = selfHeal(
      page.getByRole('navigation'),
      page.locator('nav').first(),
    );
    this.navWhyLink = selfHeal(
      this.nav.getByRole('link', { name: 'למה Organuz' }),
      this.nav.getByRole('link', { name: /למה/ }),
    );
    this.navOrLink = selfHeal(
      this.nav.getByRole('link', { name: 'הכירו את אור' }),
      this.nav.getByRole('link', { name: /הכירו/ }),
    );
    this.navAgentsLink = selfHeal(
      this.nav.getByRole('link', { name: 'הסוכנים' }),
      this.nav.getByRole('link', { name: /סוכנ/ }),
    );
    this.navProjectsLink = selfHeal(
      this.nav.getByRole('link', { name: 'פרויקטים לדוגמא' }),
      this.nav.getByRole('link', { name: /פרויקטים/ }),
    );
    this.navBlogLink = selfHeal(
      this.nav.getByRole('link', { name: 'מרכז הידע' }),
      this.nav.getByRole('link', { name: /מרכז/ }),
    );
    this.navFaqLink = selfHeal(
      this.nav.getByRole('link', { name: 'שאלות נפוצות' }),
      this.nav.getByRole('link', { name: /שאלות/ }),
    );
    this.languageButton = selfHeal(
      page.getByRole('button', { name: 'EN' }),
      page.getByRole('button', { name: /^EN$/i }),
      page.getByText('EN').first(),
    );
    this.headerCtaLink = selfHeal(
      page.getByRole('link', { name: 'להתחלה' }),
      page.getByRole('link', { name: /להתחל/ }),
    );

    // Hero
    this.heroHeading = selfHeal(
      page.getByRole('heading', { level: 1 }),
      page.locator('h1').first(),
    );
    this.heroSubtitle = selfHeal(
      page.getByText('הדרך הפשוטה להקים מערכת סולארית ואגירת חשמל.'),
      page.getByText(/הדרך הפשוטה/),
      page.getByText(/סולארית ואגירת חשמל/),
    );
    this.userTypeBtnPrivateHomes = selfHeal(
      page.getByRole('button', { name: 'בתים פרטיים' }),
      page.getByRole('button', { name: /בתים פרטיים/ }),
    );
    this.userTypeBtnResidentialBuildings = selfHeal(
      page.getByRole('button', { name: 'בנייני מגורים' }),
      page.getByRole('button', { name: /בנייני מגורים/ }),
    );
    this.userTypeBtnBusinesses = selfHeal(
      page.getByRole('button', { name: 'עסקים' }),
      page.getByRole('button', { name: /עסקים/ }),
    );
    this.userTypeBtnAgriculture = selfHeal(
      page.getByRole('button', { name: 'חקלאות' }),
      page.getByRole('button', { name: /חקלאות/ }),
    );
    this.userTypeBtnAuthorities = selfHeal(
      page.getByRole('button', { name: 'רשויות', exact: true }),
      page.getByRole('button', { name: /^רשויות$/ }),
    );
    this.userTypeBtnMarketPlayers = selfHeal(
      page.getByRole('button', { name: 'שחקני שוק' }),
      page.getByRole('button', { name: /שחקני שוק/ }),
    );
    this.startNowLink = selfHeal(
      page.getByRole('link', { name: 'התחילו עכשיו' }),
      page.getByRole('link', { name: /התחילו/ }),
    ).first();

    // Why Organuz
    this.whySectionHeading = selfHeal(
      page.getByRole('heading', { name: 'למה Organuz?' }),
      page.getByRole('heading', { name: /למה Organuz/ }),
    ).first();
    this.whyTabPropertyOwners = selfHeal(
      page.getByRole('button', { name: 'בעלי נכסים' }),
      page.getByRole('button', { name: /בעלי נכסים/ }),
    );
    this.whyTabSolarCompanies = selfHeal(
      page.getByRole('button', { name: 'חברות סולאריות' }),
      page.getByRole('button', { name: /חברות סולאריות/ }),
    );
    this.whyTabAuthoritiesCorp = selfHeal(
      page.getByRole('button', { name: 'רשויות ותאגידים' }),
      page.getByRole('button', { name: /רשויות ותאגיד/ }),
    );
    this.whyTabInvestors = selfHeal(
      page.getByRole('button', { name: 'משקיעים וגופי מימון' }),
      page.getByRole('button', { name: /משקיעים/ }),
    );

    // Or agent
    this.orSectionHeading = selfHeal(
      page.getByRole('heading', { name: 'סוכן אחד. בכל שלב במסע האנרגיה שלכם.' }),
      page.getByRole('heading', { name: /סוכן אחד/ }),
    );
    this.talkToOrLink = selfHeal(
      page.getByRole('link', { name: 'דברו עם אור' }),
      page.getByRole('link', { name: /דברו עם/ }),
    );

    // Agents
    this.agentsSectionHeading = selfHeal(
      page.getByRole('heading', { name: 'סוכן לכל תרחיש שימוש' }),
      page.getByRole('heading', { name: /סוכן לכל/ }),
    );
    this.agentSolaraWattson = selfHeal(
      page.getByRole('heading', { name: 'Solara Wattson' }),
      page.getByText('Solara Wattson').first(),
    );
    this.agentFranklinAmpere = selfHeal(
      page.getByRole('heading', { name: 'Franklin Ampere' }),
      page.getByText('Franklin Ampere').first(),
    );
    this.agentLuminaMaxwell = selfHeal(
      page.getByRole('heading', { name: 'Lumina Maxwell' }),
      page.getByText('Lumina Maxwell').first(),
    );
    this.agentKelvinVolta = selfHeal(
      page.getByRole('heading', { name: 'Kelvin Volta' }),
      page.getByText('Kelvin Volta').first(),
    );
    this.agentEdisonWatts = selfHeal(
      page.getByRole('heading', { name: 'Edison Watts' }),
      page.getByText('Edison Watts').first(),
    );
    this.agentMaxwellCharge = selfHeal(
      page.getByRole('heading', { name: 'Maxwell Charge' }),
      page.getByText('Maxwell Charge').first(),
    );

    // Projects
    this.projectsSectionHeading = selfHeal(
      page.getByRole('heading', { name: 'פרויקטים פעילים' }),
      page.getByRole('heading', { name: /פרויקטים פעיל/ }),
    );
    this.projectsNextButton = selfHeal(
      page.getByRole('button', { name: 'פרויקטים הבאים' }),
      page.getByRole('button', { name: /הבאים/ }),
    );
    this.projectsPrevButton = selfHeal(
      page.getByRole('button', { name: 'פרויקטים קודמים' }),
      page.getByRole('button', { name: /קודמים/ }),
    );

    // Blog
    this.blogSectionHeading = selfHeal(
      page.getByRole('heading', { name: 'משאבים להשגת המטרות שלכם' }),
      page.getByRole('heading', { name: /משאבים להשגת/ }),
    );
    this.blogFilterAll = selfHeal(
      page.getByRole('button', { name: 'הכל' }),
      page.getByRole('button', { name: /^הכל$/ }),
    );
    this.blogFilterEnergy = selfHeal(
      page.getByRole('button', { name: 'אנרגיה', exact: true }),
      page.getByRole('button', { name: /^אנרגיה$/ }),
    );
    this.blogFilterStorage = selfHeal(
      page.getByRole('button', { name: 'אחסון' }),
      page.getByRole('button', { name: /אחסון/ }),
    );
    this.blogFilterSolar = selfHeal(
      page.getByRole('button', { name: 'אנרגיה סולארית' }),
      page.getByRole('button', { name: /אנרגיה סולארית/ }),
    );
    this.blogFilterElectricity = selfHeal(
      page.getByRole('button', { name: 'חשמל' }),
      page.getByRole('button', { name: /חשמל/ }),
    );
    this.viewAllBlogLink = selfHeal(
      page.getByRole('link', { name: 'צפה בכל המאמרים' }),
      page.getByRole('link', { name: /צפה בכל/ }),
    );

    // FAQ
    this.faqSectionHeading = selfHeal(
      page.getByRole('heading', { name: 'שאלות נפוצות' }),
      page.getByRole('heading', { name: /שאלות נפוצות/ }),
    );

    // Contact form
    this.contactFormHeading = selfHeal(
      page.getByRole('heading', { name: 'שלח לנו הודעה' }),
      page.getByRole('heading', { name: /שלח לנו/ }),
    );
    this.nameInput = selfHeal(
      page.getByRole('textbox', { name: 'שם מלא' }),
      page.getByRole('textbox', { name: /שם מלא/ }),
    );
    this.emailInput = selfHeal(
      page.getByRole('textbox', { name: 'כתובת אימייל' }),
      page.getByRole('textbox', { name: /כתובת אימייל/ }),
    );
    this.phoneInput = selfHeal(
      page.getByRole('textbox', { name: 'טלפון' }),
      page.getByRole('textbox', { name: /טלפון/ }),
    );
    this.messageInput = selfHeal(
      page.getByRole('textbox', { name: 'הודעה' }),
      page.getByRole('textbox', { name: /הודעה/ }),
    );
    this.submitButton = selfHeal(
      page.getByRole('button', { name: 'שלח הודעה' }),
      page.getByRole('button', { name: /שלח הודעה/ }),
    );

    // Newsletter
    this.newsletterEmailInput = selfHeal(
      page.getByRole('textbox', { name: 'הכנס את כתובת האימייל שלך' }),
      page.getByRole('textbox', { name: /אימייל שלך/ }),
      page.locator('footer input[type="email"]').first(),
    );
    this.newsletterSubmitButton = selfHeal(
      page.getByRole('button', { name: 'הירשם' }),
      page.getByRole('button', { name: /הירשם/ }),
      page.locator('footer button').first(),
    );
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.goto('/');
    await this.waitForVisible(this.heroHeading);
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectOnHomePage(): Promise<void> {
    await expect(this.heroHeading).toBeVisible();
  }

  async expectNavLinksVisible(): Promise<void> {
    await expect(this.navWhyLink).toBeVisible();
    await expect(this.navOrLink).toBeVisible();
    await expect(this.navAgentsLink).toBeVisible();
    await expect(this.navProjectsLink).toBeVisible();
    await expect(this.navBlogLink).toBeVisible();
    await expect(this.navFaqLink).toBeVisible();
  }

  async expectAllAgentsVisible(): Promise<void> {
    await expect(this.agentSolaraWattson).toBeVisible();
    await expect(this.agentFranklinAmpere).toBeVisible();
    await expect(this.agentLuminaMaxwell).toBeVisible();
    await expect(this.agentKelvinVolta).toBeVisible();
    await expect(this.agentEdisonWatts).toBeVisible();
    await expect(this.agentMaxwellCharge).toBeVisible();
  }

  async expectAllUserTypeButtonsVisible(): Promise<void> {
    await expect(this.userTypeBtnPrivateHomes).toBeVisible();
    await expect(this.userTypeBtnResidentialBuildings).toBeVisible();
    await expect(this.userTypeBtnBusinesses).toBeVisible();
    await expect(this.userTypeBtnAgriculture).toBeVisible();
    await expect(this.userTypeBtnAuthorities).toBeVisible();
    await expect(this.userTypeBtnMarketPlayers).toBeVisible();
  }

  async expectContactFormVisible(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
    await expect(this.messageInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async fillContactForm(name: string, email: string, phone: string, message: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.phoneInput.fill(phone);
    await this.messageInput.fill(message);
  }

  /** The expandable FAQ question header, addressed by its (Hebrew) text. */
  faqQuestion(questionText: string): Locator {
    return this.page.getByRole('button', { name: questionText });
  }

  async clickFaqQuestion(questionText: string): Promise<void> {
    const btn = await this.findFirstWorking(
      `FAQ question "${questionText}"`,
      this.faqQuestion(questionText),
      this.page.getByText(questionText).first(),
    );
    await btn.click();
  }

  async getFaqAnswerRegion(questionText: string): Promise<Locator> {
    return this.page.getByRole('region', { name: questionText });
  }

  async subscribeNewsletter(email: string): Promise<void> {
    await this.newsletterEmailInput.fill(email);
    await this.newsletterSubmitButton.click();
  }
}
