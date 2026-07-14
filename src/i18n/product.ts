/**
 * Locale resource dictionary for the Organuz product app (dev calculator).
 *
 * Centralizes the user-facing strings the tests assert on so specs/components
 * reference keys, not literals — the seam that lets the same test target the
 * Hebrew or the English UI. See the organuz-product-en / organuz-hebrew-tests skills.
 */
export type ProductLocale = 'he' | 'en';

/** The label the header language control shows for each language (also its menu option). */
export const productLangLabel: Record<ProductLocale, string> = {
  he: 'עברית',
  en: 'English',
};

/** Strings that exist in both languages (used by the wizard sanity specs). */
export const productText: Record<ProductLocale, {
  continue: string | RegExp;
  wizardProgress: string;
  loginEntry: RegExp;
}> = {
  he: {
    continue: 'בוא נמשיך',
    wizardProgress: 'התקדמות השלבים',
    loginEntry: /הרשמה\s*\/\s*כניסה|הרשמה|התחברות/,
  },
  en: {
    continue: /Let's continue/i,
    wizardProgress: 'Wizard progress',
    loginEntry: /Login\s*\/\s*Register|Register|Sign\s?in|Log\s?in/i,
  },
};

/** Signed-out login entry, matched in EITHER language (used by isLoggedIn/isAuthenticated). */
export const anyLoginEntry = /הרשמה\s*\/\s*כניסה|הרשמה|התחברות|sign in|sign up|log ?in|login|register/i;

/**
 * Hebrew-only product chrome. The password gate, the personal-area menu, and the
 * company (contractor) areas are Hebrew regardless of the calculator's language
 * toggle, so these have a single value.
 */
export const productChrome = {
  gatePasswordField: 'סיסמה',
  gateSubmit: 'כנס',
  personalArea: 'איזור אישי',
  logout: 'התנתק',
  // Company / contractor elevated areas (see organuz-product-roles).
  contractorPricing: /מחירון קבלני/,
  entrepreneurPricing: /מחירון יזמי/,
  companyManagement: /ניהול פרטי החברה/,
  priceSimulator: /סימולטור מחיר/,
  investmentSimulator: /סימולטור השקעה/,
  saveDraft: /שמירה כטיוטה/,
} as const;
