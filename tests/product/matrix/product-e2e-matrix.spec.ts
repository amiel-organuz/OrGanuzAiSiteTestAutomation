import { expect, test } from '@playwright/test';
import {
  ALL_MATRIX_SCENARIOS,
  EXPECTED_MAIN_SCENARIO_IDS,
  EXPECTED_PERSONA_SCENARIO_COUNT,
  MAIN_E2E_SCENARIOS,
  POLYGON_TYPES,
  PRODUCT_PERSONAS,
  PROPERTY_TYPES,
  ROOF_SURFACE_TYPES,
  RUNTIME_ONLY_FIELDS,
  UI_ONLY_SCENARIOS,
} from './e2e-matrix.data';

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
