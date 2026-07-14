import { Page, Locator, expect } from '@playwright/test';
import { selfHeal } from '../../utils/selfHeal';
import { marketingText as T } from '../../i18n/marketing';

/**
 * Sub-page-object for the marketing-site header: logo, the six primary nav links,
 * the language toggle, and the header CTA. Composed by HomePage.
 */
export class HeaderNav {
  private readonly nav: Locator;
  readonly logo: Locator;
  readonly whyLink: Locator;
  readonly orLink: Locator;
  readonly agentsLink: Locator;
  readonly projectsLink: Locator;
  readonly blogLink: Locator;
  readonly faqLink: Locator;
  readonly languageButton: Locator;
  readonly ctaLink: Locator;

  constructor(private readonly page: Page) {
    const t = T.header;
    this.logo = selfHeal(
      page.getByRole('link', { name: t.logo }).first(),
      page.getByRole('link', { name: /rganuz/i }).first(),
      page.locator('header a').first(),
    );
    this.nav = selfHeal(page.getByRole('navigation'), page.locator('nav').first());
    this.whyLink = selfHeal(this.nav.getByRole('link', { name: t.nav.why }), this.nav.getByRole('link', { name: /למה/ }));
    this.orLink = selfHeal(this.nav.getByRole('link', { name: t.nav.or }), this.nav.getByRole('link', { name: /הכירו/ }));
    this.agentsLink = selfHeal(this.nav.getByRole('link', { name: t.nav.agents }), this.nav.getByRole('link', { name: /סוכנ/ }));
    this.projectsLink = selfHeal(this.nav.getByRole('link', { name: t.nav.projects }), this.nav.getByRole('link', { name: /פרויקטים/ }));
    this.blogLink = selfHeal(this.nav.getByRole('link', { name: t.nav.blog }), this.nav.getByRole('link', { name: /מרכז/ }));
    this.faqLink = selfHeal(this.nav.getByRole('link', { name: t.nav.faq }), this.nav.getByRole('link', { name: /שאלות/ }));
    this.languageButton = selfHeal(
      page.getByRole('button', { name: t.languageToEnglish }),
      page.getByRole('button', { name: /^EN$/i }),
      page.getByText(t.languageToEnglish).first(),
    );
    this.ctaLink = selfHeal(
      page.getByRole('link', { name: t.cta }),
      page.getByRole('link', { name: /להתחל/ }),
    );
  }

  async expectNavLinksVisible(): Promise<void> {
    await expect(this.whyLink).toBeVisible();
    await expect(this.orLink).toBeVisible();
    await expect(this.agentsLink).toBeVisible();
    await expect(this.projectsLink).toBeVisible();
    await expect(this.blogLink).toBeVisible();
    await expect(this.faqLink).toBeVisible();
  }
}
