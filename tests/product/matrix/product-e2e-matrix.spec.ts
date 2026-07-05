import { expect, test, type Page } from '@playwright/test';
import { ProductAppPage } from '../support/ProductAppPage';
import {
  ALL_MATRIX_SCENARIOS,
  EXPECTED_MAIN_SCENARIO_IDS,
  EXPECTED_PERSONA_SCENARIO_COUNT,
  MAIN_E2E_SCENARIOS,
  NEGATIVE_PANEL_SCENARIOS,
  POLYGON_TYPES,
  PRODUCT_PERSONAS,
  PROPERTY_TYPES,
  ROOF_SURFACE_TYPES,
  RUNTIME_ONLY_FIELDS,
  UI_ONLY_SCENARIOS,
  type ProductPersona,
  type PropertyCharacterizationData,
} from './e2e-matrix.data';

const productE2eEnabled = process.env.PRODUCT_E2E_ENABLED === 'true';

test.describe('Product E2E matrix data contract', { tag: '@product' }, () => {
  test('keeps runtime-only values out of checked-in matrix data', () => {
    const serializedData = JSON.stringify(ALL_MATRIX_SCENARIOS);

    for (const field of RUNTIME_ONLY_FIELDS) {
      expect(serializedData).not.toContain(field);
    }
  });

  test('runs every characterization scenario across all required personas', () => {
    expect(PRODUCT_PERSONAS.map((persona) => persona.id)).toEqual([
      'customer',
      'consultant',
      'company',
      'company-employee',
    ]);
    expect(MAIN_E2E_SCENARIOS.length * PRODUCT_PERSONAS.length).toBe(EXPECTED_PERSONA_SCENARIO_COUNT);
  });

  test('matches the required CALC-ROOF main scenario ids from the document', () => {
    expect(MAIN_E2E_SCENARIOS.map((scenario) => scenario.id)).toEqual([...EXPECTED_MAIN_SCENARIO_IDS]);
  });

  test('covers every calculator property type from the document', () => {
    const covered = new Set(ALL_MATRIX_SCENARIOS.map((scenario) => scenario.propertyType));
    for (const propertyType of PROPERTY_TYPES) {
      expect(covered.has(propertyType), `${propertyType} is covered`).toBeTruthy();
    }
  });

  test('covers building, parking, and sports-court polygon behavior', () => {
    const covered = new Set(ALL_MATRIX_SCENARIOS.flatMap((scenario) => scenario.polygons));
    for (const polygonType of POLYGON_TYPES) {
      expect(covered.has(polygonType), `${polygonType} is covered`).toBeTruthy();
    }
  });

  test('covers all roof and surface types from the document', () => {
    const covered = new Set(ALL_MATRIX_SCENARIOS.flatMap((scenario) => scenario.roofSurfaces));
    for (const roofSurface of ROOF_SURFACE_TYPES) {
      expect(covered.has(roofSurface), `${roofSurface} is covered`).toBeTruthy();
    }
  });

  test('keeps roof payload placeholders available for runtime marking data', () => {
    for (const scenario of ALL_MATRIX_SCENARIOS) {
      expect(scenario).toHaveProperty('roofState');
      expect(scenario).toHaveProperty('roofObjects');
      expect(scenario).toHaveProperty('roofLevels');
    }
  });

  test('marks no-panel scenario as UI-only and keeps it out of API/JSON E2E flows', () => {
    expect(UI_ONLY_SCENARIOS).toHaveLength(1);
    expect(UI_ONLY_SCENARIOS[0]).toMatchObject({
      id: 'CALC-ROOF-022',
      panelMode: 'none',
    });
    expect(MAIN_E2E_SCENARIOS.map((scenario) => scenario.id)).not.toContain('CALC-ROOF-022');
  });
});

test.describe('Product calculator and quotation E2E matrix', { tag: ['@product', '@critical'] }, () => {
  test.skip(
    !productE2eEnabled,
    'Set PRODUCT_E2E_ENABLED=true plus persona credentials to run live product E2E flows.',
  );

  for (const scenario of MAIN_E2E_SCENARIOS) {
    for (const persona of PRODUCT_PERSONAS) {
      test(`${scenario.id} - ${persona.name} completes characterization and reaches expected destination`, async ({ page }) => {
        await runSuccessfulCharacterization(page, persona, scenario);
      });
    }
  }

  for (const scenario of NEGATIVE_PANEL_SCENARIOS) {
    test(`${scenario.id} shows insufficient panels and does not continue to quotations`, async ({ page }) => {
      const persona = PRODUCT_PERSONAS.find((candidate) => candidate.id === 'customer');
      expect(persona).toBeDefined();

      const app = new ProductAppPage(page);
      await app.login(credentialsFor(persona as ProductPersona));
      await app.createProject(scenario);
      await app.characterizeRoof(scenario);
      await app.expectInsufficientPanelsModal();
      expect(app.captureRuntimeIds().quotationId).toBeFalsy();
    });
  }

  test('Company Employee can characterize a property but is blocked from company pricing and management', async ({ page }) => {
    const persona = PRODUCT_PERSONAS.find((candidate) => candidate.id === 'company-employee');
    expect(persona).toBeDefined();

    const app = new ProductAppPage(page);
    await app.login(credentialsFor(persona as ProductPersona));
    await app.createProject(MAIN_E2E_SCENARIOS[0]);
    await app.characterizeRoof(MAIN_E2E_SCENARIOS[0]);
    await app.answerFunding(MAIN_E2E_SCENARIOS[0]);
    await app.expectPostFundingDestination(persona as ProductPersona);

    await app.expectAccessBlocked(process.env.PRODUCT_COMPANY_PRICING_PATH ?? '/company/pricing');
    await app.expectAccessBlocked(process.env.PRODUCT_COMPANY_MANAGEMENT_PATH ?? '/company/management');
  });
});

async function runSuccessfulCharacterization(
  page: Page,
  persona: ProductPersona,
  scenario: PropertyCharacterizationData,
): Promise<void> {
  const credentials = credentialsFor(persona);
  const app = new ProductAppPage(page);

  const loginRuntime = await app.login(credentials);
  const projectRuntime = await app.createProject(scenario);
  const roofRuntime = await app.characterizeRoof(scenario);
  const fundingRuntime = await app.answerFunding(scenario);

  expect(mergeRuntimeIds(loginRuntime, projectRuntime, roofRuntime, fundingRuntime).projectId).toBeTruthy();
  await app.expectPostFundingDestination(persona);

  if (persona.canOpenQuotationsFromResults && persona.expectedPostFundingDestination === 'results') {
    await app.openQuotationsFromResults();
  }

  if (persona.id === 'company') {
    await app.downloadOwnQuotation();
  }
}

function credentialsFor(persona: ProductPersona) {
  const key = persona.id.toUpperCase().replace(/-/g, '_');
  const phone = process.env[`${key}_PHONE`];
  const otpCode = process.env[`${key}_OTP_CODE`];
  const email = process.env[`${key}_EMAIL`];
  const password = process.env[`${key}_PASSWORD`];

  if (phone) {
    return { phone, otpCode };
  }

  if (email && password) {
    return { email, password };
  }

  throw new Error(`Missing ${key}_PHONE or ${key}_EMAIL/${key}_PASSWORD for product E2E persona ${persona.id}.`);
}

function mergeRuntimeIds<T extends object[]>(...ids: T) {
  return Object.assign({}, ...ids);
}
