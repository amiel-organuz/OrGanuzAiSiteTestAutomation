/**
 * Locale resource dictionary for the Organuz marketing site (www.organuz.ai).
 *
 * The default site is Hebrew (RTL); these are the strings the sub-page-object
 * components assert on. Grouped by component so each sub-page-object reads its
 * own slice. See the ui-sanity-tests / organuz-hebrew-tests skills.
 */
export const marketingText = {
  header: {
    logo: 'Organuz',
    languageToEnglish: 'EN',
    cta: 'להתחלה',
    nav: {
      why: 'למה Organuz',
      or: 'הכירו את אור',
      agents: 'הסוכנים',
      projects: 'פרויקטים לדוגמא',
      blog: 'מרכז הידע',
      faq: 'שאלות נפוצות',
    },
  },
  hero: {
    subtitle: 'הדרך הפשוטה להקים מערכת סולארית ואגירת חשמל.',
    startNow: 'התחילו עכשיו',
    userTypes: {
      privateHomes: 'בתים פרטיים',
      residentialBuildings: 'בנייני מגורים',
      businesses: 'עסקים',
      agriculture: 'חקלאות',
      authorities: 'רשויות',
      marketPlayers: 'שחקני שוק',
    },
  },
  why: {
    heading: 'למה Organuz?',
    tabs: {
      propertyOwners: 'בעלי נכסים',
      solarCompanies: 'חברות סולאריות',
      authoritiesCorp: 'רשויות ותאגידים',
      investors: 'משקיעים וגופי מימון',
    },
  },
  or: {
    heading: 'סוכן אחד. בכל שלב במסע האנרגיה שלכם.',
    talkToOr: 'דברו עם אור',
  },
  agents: {
    heading: 'סוכן לכל תרחיש שימוש',
    // Agent display names are English brand names, identical in both site languages.
    names: [
      'Solara Wattson',
      'Franklin Ampere',
      'Lumina Maxwell',
      'Kelvin Volta',
      'Edison Watts',
      'Maxwell Charge',
    ],
  },
  projects: {
    heading: 'פרויקטים פעילים',
    next: 'פרויקטים הבאים',
    prev: 'פרויקטים קודמים',
  },
  blog: {
    heading: 'משאבים להשגת המטרות שלכם',
    filters: {
      all: 'הכל',
      energy: 'אנרגיה',
      storage: 'אחסון',
      solar: 'אנרגיה סולארית',
      electricity: 'חשמל',
    },
    viewAll: 'צפה בכל המאמרים',
  },
  faq: {
    heading: 'שאלות נפוצות',
  },
  contact: {
    heading: 'שלח לנו הודעה',
    fields: {
      name: 'שם מלא',
      email: 'כתובת אימייל',
      phone: 'טלפון',
      message: 'הודעה',
    },
    submit: 'שלח הודעה',
  },
  newsletter: {
    emailPlaceholder: 'הכנס את כתובת האימייל שלך',
    subscribe: 'הירשם',
  },
} as const;
