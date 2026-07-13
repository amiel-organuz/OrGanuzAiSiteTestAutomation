import { expect, test } from '@playwright/test';
import {
  ALL_MATRIX_SCENARIOS,
  EXPECTED_MAIN_SCENARIO_IDS,
  EXPECTED_PERSONA_SCENARIO_COUNT,
  MAIN_E2E_SCENARIOS,
  NEGATIVE_PANEL_SCENARIOS,
  POLYGON_TYPES,
  PRODUCT_PERSONAS,
  PROPERTY_TYPES,
  QUOTABLE_MINIMUM_PANEL_COUNT,
  RAMOT_SCENARIOS,
  ROOF_SURFACE_TYPES,
  RUNTIME_ONLY_FIELDS,
  UI_ONLY_SCENARIOS,
} from './e2e-matrix.data';

test.describe('Product matrix data contract', { tag: '@product' }, () => {
  test('keeps runtime-only values out of checked-in matrix data', () => {
    const serializedData = JSON.stringify(ALL_MATRIX_SCENARIOS);

    for (const field of RUNTIME_ONLY_FIELDS) {
      expect(serializedData).not.toContain(field);
    }
  });

  test('keeps the scenario × persona matrix at its expected size', () => {
    expect(PRODUCT_PERSONAS.map((persona) => persona.id)).toEqual([
      'customer',
      'consultant',
      'company',
      'company-employee',
    ]);
    // Compared against a fixed literal (see EXPECTED_PERSONA_SCENARIO_COUNT), so
    // dropping a scenario or persona trips this instead of silently rescaling.
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

  test('keeps roof payload placeholders empty in checked-in data', () => {
    // The placeholders exist for runtime marking data to fill; the checked-in
    // fixtures must ship them empty so captured runtime state never leaks into git.
    for (const scenario of ALL_MATRIX_SCENARIOS) {
      expect(scenario.roofState, `${scenario.id} roofState is an empty placeholder`).toEqual({});
      expect(scenario.roofObjects, `${scenario.id} roofObjects is an empty placeholder`).toEqual({});
      expect(scenario.roofLevels, `${scenario.id} roofLevels is an empty placeholder`).toEqual({});
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

  test('assigns a unique id to every matrix scenario', () => {
    const ids = ALL_MATRIX_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('keeps arena type consistent with each scenario group', () => {
    for (const scenario of MAIN_E2E_SCENARIOS) {
      expect(scenario.arenaType, `${scenario.id} is on the main arena`).toBe('ARENA_TYPE_MAIN');
    }
    for (const scenario of RAMOT_SCENARIOS) {
      expect(scenario.arenaType, `${scenario.id} is on the ramot arena`).toBe('ARENA_TYPE_RAMOT');
    }
  });

  test('keeps the negative scenario below the quotable panel minimum', () => {
    // The quotable scenarios must actually encode the documented business rule...
    const quotableMinimum = Math.min(
      ...MAIN_E2E_SCENARIOS.filter((scenario) => scenario.panelMode === 'quotable').map(
        (scenario) => scenario.minimumPanelCount,
      ),
    );
    expect(quotableMinimum).toBe(QUOTABLE_MINIMUM_PANEL_COUNT);

    // ...and the negative scenario must sit strictly under it (1..min-1).
    for (const scenario of NEGATIVE_PANEL_SCENARIOS) {
      expect(scenario.panelMode).toBe('below-minimum');
      expect(scenario.minimumPanelCount).toBeGreaterThan(0);
      expect(scenario.minimumPanelCount).toBeLessThan(QUOTABLE_MINIMUM_PANEL_COUNT);
    }
  });

  test('grants elevated company privileges to exactly one persona', () => {
    const withManagement = PRODUCT_PERSONAS.filter((persona) => persona.canOpenCompanyManagement);
    const withPricing = PRODUCT_PERSONAS.filter((persona) => persona.canOpenCompanyPricing);
    expect(withManagement.map((persona) => persona.id)).toEqual(['company']);
    expect(withPricing.map((persona) => persona.id)).toEqual(['company']);

    const employee = PRODUCT_PERSONAS.find((persona) => persona.id === 'company-employee');
    expect(employee?.canOpenCompanyManagement).toBe(false);
    expect(employee?.canOpenCompanyPricing).toBe(false);
    expect(employee?.canOpenQuotationsFromResults).toBe(false);
  });

  test('aligns panel counts with each scenario panel mode', () => {
    for (const scenario of ALL_MATRIX_SCENARIOS) {
      switch (scenario.panelMode) {
        case 'quotable':
          expect(
            scenario.minimumPanelCount,
            `${scenario.id} needs a quotable minimum`,
          ).toBeGreaterThanOrEqual(QUOTABLE_MINIMUM_PANEL_COUNT);
          break;
        case 'below-minimum':
          expect(scenario.minimumPanelCount, `${scenario.id} is a partial mark`).toBeGreaterThan(0);
          expect(
            scenario.minimumPanelCount,
            `${scenario.id} stays under the quotable minimum`,
          ).toBeLessThan(QUOTABLE_MINIMUM_PANEL_COUNT);
          break;
        case 'none':
          expect(scenario.minimumPanelCount, `${scenario.id} marks no panels`).toBe(0);
          break;
      }
    }
  });
});
