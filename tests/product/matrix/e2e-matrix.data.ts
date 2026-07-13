import type { PropertyCharacterizationData } from './matrix-types';
import {
  MAIN_E2E_SCENARIOS,
  NEGATIVE_PANEL_SCENARIOS,
  UI_ONLY_SCENARIOS,
  RAMOT_SCENARIOS,
} from './property-scenarios.data';

export * from './matrix-types';
export * from './matrix-constants';
export * from './product-personas.data';
export * from './property-scenarios.data';

export const MAIN_PROPERTY_CHARACTERIZATION: PropertyCharacterizationData = {
  ...MAIN_E2E_SCENARIOS[6],
};

export const ALL_MATRIX_SCENARIOS: readonly PropertyCharacterizationData[] = [
  ...MAIN_E2E_SCENARIOS,
  ...NEGATIVE_PANEL_SCENARIOS,
  ...UI_ONLY_SCENARIOS,
  ...RAMOT_SCENARIOS,
] as const;

export const EXPECTED_MAIN_SCENARIO_IDS = [
  'CALC-ROOF-001',
  'CALC-ROOF-002',
  'CALC-ROOF-003',
  'CALC-ROOF-004',
  'CALC-ROOF-005',
  'CALC-ROOF-006',
  'CALC-ROOF-007',
  'CALC-ROOF-008',
  'CALC-ROOF-009',
  'CALC-ROOF-010',
  'CALC-ROOF-011',
  'CALC-ROOF-012',
] as const;

// Pinned independently (12 main scenarios × 4 personas) so the data-contract test
// verifies the matrix size against a fixed expectation instead of comparing the
// product to itself. Update this literal deliberately when the matrix grows.
export const EXPECTED_PERSONA_SCENARIO_COUNT = 48;
