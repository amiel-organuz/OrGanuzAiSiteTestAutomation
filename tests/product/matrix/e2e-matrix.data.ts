export type ProductPersonaId = 'customer' | 'consultant' | 'company' | 'company-employee';
export type ArenaType = 'ARENA_TYPE_MAIN' | 'ARENA_TYPE_RAMOT';
export type PropertyType =
  | 'PROPERTY_TYPE_PRIVATE_HOUSE'
  | 'PROPERTY_TYPE_BUILDING'
  | 'PROPERTY_TYPE_COMMERCIAL'
  | 'PROPERTY_TYPE_AGRICULTURAL'
  | 'PROPERTY_TYPE_PUBLIC';
export type PolygonType = 'building' | 'parking' | 'sports-court';
export type RoofSurfaceType = 'concrete' | 'tiles' | 'iscoverit' | 'parking' | 'sports-court';
export type PanelMode = 'quotable' | 'below-minimum' | 'none';

export interface ProductPersona {
  readonly id: ProductPersonaId;
  readonly name: string;
  readonly role: string;
  readonly expectedPostFundingDestination: 'quotations' | 'results';
  readonly canOpenQuotationsFromResults: boolean;
  readonly canOpenCompanyPricing: boolean;
  readonly canOpenCompanyManagement: boolean;
}

export interface PropertyCharacterizationData {
  readonly id: string;
  readonly arenaType: ArenaType;
  readonly address: string;
  readonly propertyType: PropertyType;
  readonly polygons: readonly PolygonType[];
  readonly roofSurfaces: readonly RoofSurfaceType[];
  readonly panelMode: PanelMode;
  readonly minimumPanelCount: number;
  readonly wantFinancingOffer: boolean;
  readonly expectedBehavior: string;
  readonly skipsObjectAndRoofSteps: boolean;
  readonly onlyBuildingAreaCanBeMarked: boolean;
  readonly roofState?: Record<string, unknown>;
  readonly roofObjects?: Record<string, unknown>;
  readonly roofLevels?: Record<string, unknown>;
}

export const PROPERTY_TYPES: readonly PropertyType[] = [
  'PROPERTY_TYPE_PRIVATE_HOUSE',
  'PROPERTY_TYPE_BUILDING',
  'PROPERTY_TYPE_COMMERCIAL',
  'PROPERTY_TYPE_AGRICULTURAL',
  'PROPERTY_TYPE_PUBLIC',
] as const;

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  PROPERTY_TYPE_PRIVATE_HOUSE: 'בית פרטי',
  PROPERTY_TYPE_BUILDING: 'בניין מגורים',
  PROPERTY_TYPE_COMMERCIAL: 'מבנה מסחרי',
  PROPERTY_TYPE_AGRICULTURAL: 'מבנה חקלאי',
  PROPERTY_TYPE_PUBLIC: 'מבנה ציבורי',
};

export const POLYGON_TYPES: readonly PolygonType[] = ['building', 'parking', 'sports-court'] as const;

export const ROOF_SURFACE_TYPES: readonly RoofSurfaceType[] = [
  'concrete',
  'tiles',
  'iscoverit',
  'parking',
  'sports-court',
] as const;

export const RUNTIME_ONLY_FIELDS = [
  'projectId',
  'quotationId',
  'entrepreneurQuotationId',
  'token',
] as const;

export const PRODUCT_PERSONAS: readonly ProductPersona[] = [
  {
    id: 'customer',
    name: 'Customer',
    role: 'Property owner / end user',
    expectedPostFundingDestination: 'quotations',
    canOpenQuotationsFromResults: true,
    canOpenCompanyPricing: false,
    canOpenCompanyManagement: false,
  },
  {
    id: 'consultant',
    name: 'Consultant',
    role: 'Characterizes properties for customers',
    expectedPostFundingDestination: 'results',
    canOpenQuotationsFromResults: true,
    canOpenCompanyPricing: false,
    canOpenCompanyManagement: false,
  },
  {
    id: 'company',
    name: 'Company / Contractor',
    role: 'Characterizes a property and downloads its own quotation',
    expectedPostFundingDestination: 'results',
    canOpenQuotationsFromResults: false,
    canOpenCompanyPricing: true,
    canOpenCompanyManagement: true,
  },
  {
    id: 'company-employee',
    name: 'Company Employee',
    role: 'Employee under a company',
    expectedPostFundingDestination: 'results',
    canOpenQuotationsFromResults: false,
    canOpenCompanyPricing: false,
    canOpenCompanyManagement: false,
  },
] as const;

export const MAIN_E2E_SCENARIOS: readonly PropertyCharacterizationData[] = [
  {
    id: 'CALC-ROOF-001',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_PRIVATE_HOUSE',
    polygons: ['building'],
    roofSurfaces: ['concrete'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-002',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_PRIVATE_HOUSE',
    polygons: ['building'],
    roofSurfaces: ['tiles'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-003',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_PRIVATE_HOUSE',
    polygons: ['building'],
    roofSurfaces: ['iscoverit'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-004',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_BUILDING',
    polygons: ['building'],
    roofSurfaces: ['concrete'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-005',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_BUILDING',
    polygons: ['building'],
    roofSurfaces: ['tiles'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-006',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_BUILDING',
    polygons: ['building'],
    roofSurfaces: ['iscoverit'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-007',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_COMMERCIAL',
    polygons: ['building'],
    roofSurfaces: ['concrete', 'iscoverit'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-008',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_AGRICULTURAL',
    polygons: ['building'],
    roofSurfaces: ['iscoverit'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'continue according to persona after funding',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-009',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_AGRICULTURAL',
    polygons: ['building', 'sports-court'],
    roofSurfaces: ['iscoverit', 'sports-court'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'mark building only; sports court is calculated as fully marked',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: true,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-010',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_PUBLIC',
    polygons: ['sports-court'],
    roofSurfaces: ['sports-court'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'skip object and roof marking steps; continue according to persona',
    skipsObjectAndRoofSteps: true,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-011',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_PUBLIC',
    polygons: ['parking'],
    roofSurfaces: ['parking'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'skip object and roof marking steps; continue according to persona',
    skipsObjectAndRoofSteps: true,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
  {
    id: 'CALC-ROOF-012',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_PUBLIC',
    polygons: ['building', 'parking', 'sports-court'],
    roofSurfaces: ['iscoverit', 'parking', 'sports-court'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'mark building only; parking and sports court are calculated as fully marked',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: true,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
] as const;

export const NEGATIVE_PANEL_SCENARIOS: readonly PropertyCharacterizationData[] = [
  {
    id: 'CALC-ROOF-021',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_BUILDING',
    polygons: ['building'],
    roofSurfaces: ['concrete'],
    panelMode: 'below-minimum',
    minimumPanelCount: 4,
    wantFinancingOffer: false,
    expectedBehavior: 'show insufficient panels modal and do not create quotations',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
] as const;

export const UI_ONLY_SCENARIOS: readonly PropertyCharacterizationData[] = [
  {
    id: 'CALC-ROOF-022',
    arenaType: 'ARENA_TYPE_MAIN',
    address: 'HaBarzel 32, Tel Aviv-Yafo',
    propertyType: 'PROPERTY_TYPE_BUILDING',
    polygons: ['building'],
    roofSurfaces: ['concrete'],
    panelMode: 'none',
    minimumPanelCount: 0,
    wantFinancingOffer: false,
    expectedBehavior: 'no API/JSON scenario; request is not sent without panel marking',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
] as const;

export const RAMOT_SCENARIOS: readonly PropertyCharacterizationData[] = [
  {
    id: 'RAMOT-001',
    arenaType: 'ARENA_TYPE_RAMOT',
    address: 'Ramot, Jerusalem',
    propertyType: 'PROPERTY_TYPE_BUILDING',
    polygons: ['building'],
    roofSurfaces: ['concrete'],
    panelMode: 'quotable',
    minimumPanelCount: 5,
    wantFinancingOffer: false,
    expectedBehavior: 'customer reaches pre-characterized quotations or submits a characterization request; consultant characterizes properties',
    skipsObjectAndRoofSteps: false,
    onlyBuildingAreaCanBeMarked: false,
    roofState: {},
    roofObjects: {},
    roofLevels: {},
  },
] as const;

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

export const EXPECTED_PERSONA_SCENARIO_COUNT = MAIN_E2E_SCENARIOS.length * PRODUCT_PERSONAS.length;

export const LEGACY_MAIN_PROPERTY_CHARACTERIZATION: PropertyCharacterizationData = {
  id: 'LEGACY-MAIN',
  arenaType: 'ARENA_TYPE_MAIN',
  address: 'HaBarzel 32, Tel Aviv-Yafo',
  propertyType: 'PROPERTY_TYPE_COMMERCIAL',
  polygons: ['building'],
  roofSurfaces: ['concrete'],
  panelMode: 'quotable',
  minimumPanelCount: 5,
  wantFinancingOffer: false,
  expectedBehavior: 'legacy single scenario',
  skipsObjectAndRoofSteps: false,
  onlyBuildingAreaCanBeMarked: false,
  roofState: {},
  roofObjects: {},
  roofLevels: {},
};
