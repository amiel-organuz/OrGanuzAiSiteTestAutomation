import { Page, Locator, expect } from '@playwright/test';
import { selfHeal } from '../../utils/selfHeal';
import { marketingText as T } from '../../i18n/marketing';

/** Sub-page-object for the hero: H1 heading, subtitle, the six audience buttons, CTA. */
export class HeroSection {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly startNowLink: Locator;
  readonly userTypePrivateHomes: Locator;
  readonly userTypeResidentialBuildings: Locator;
  readonly userTypeBusinesses: Locator;
  readonly userTypeAgriculture: Locator;
  readonly userTypeAuthorities: Locator;
  readonly userTypeMarketPlayers: Locator;

  constructor(private readonly page: Page) {
    const t = T.hero;
    this.heading = selfHeal(page.getByRole('heading', { level: 1 }), page.locator('h1').first());
    this.subtitle = selfHeal(
      page.getByText(t.subtitle),
      page.getByText(/הדרך הפשוטה/),
      page.getByText(/סולארית ואגירת חשמל/),
    );
    const btn = (name: string, re: RegExp, exact = false) =>
      selfHeal(page.getByRole('button', { name, exact }), page.getByRole('button', { name: re }));
    this.userTypePrivateHomes = btn(t.userTypes.privateHomes, /בתים פרטיים/);
    this.userTypeResidentialBuildings = btn(t.userTypes.residentialBuildings, /בנייני מגורים/);
    this.userTypeBusinesses = btn(t.userTypes.businesses, /עסקים/);
    this.userTypeAgriculture = btn(t.userTypes.agriculture, /חקלאות/);
    this.userTypeAuthorities = btn(t.userTypes.authorities, /^רשויות$/, true);
    this.userTypeMarketPlayers = btn(t.userTypes.marketPlayers, /שחקני שוק/);
    this.startNowLink = selfHeal(
      page.getByRole('link', { name: t.startNow }),
      page.getByRole('link', { name: /התחילו/ }),
    ).first();
  }

  async expectAllUserTypeButtonsVisible(): Promise<void> {
    await expect(this.userTypePrivateHomes).toBeVisible();
    await expect(this.userTypeResidentialBuildings).toBeVisible();
    await expect(this.userTypeBusinesses).toBeVisible();
    await expect(this.userTypeAgriculture).toBeVisible();
    await expect(this.userTypeAuthorities).toBeVisible();
    await expect(this.userTypeMarketPlayers).toBeVisible();
  }
}
