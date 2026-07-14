import type {
  ArenaType,
  PanelMode,
  PolygonType,
  PropertyCharacterizationData,
  PropertyType,
  RoofSurfaceType,
} from './matrix-types';
import { MAIN_PROPERTY_CHARACTERIZATION } from './e2e-matrix.data';

/**
 * Fluent builder for PropertyCharacterizationData (Builder pattern).
 *
 * Wizard scenarios have many fields; a builder produces valid variations from a sensible
 * default (the canonical MAIN characterization) with only the differing fields spelled out
 * — keeping test intent readable instead of copying a 15-field literal. The checked-in
 * matrix data stays the source of truth; this is for ad-hoc/one-off scenarios in specs.
 */
export class PropertyCharacterizationBuilder {
  private data: PropertyCharacterizationData;

  constructor(base: PropertyCharacterizationData = MAIN_PROPERTY_CHARACTERIZATION) {
    this.data = { ...base };
  }

  static from(base?: PropertyCharacterizationData): PropertyCharacterizationBuilder {
    return new PropertyCharacterizationBuilder(base);
  }

  withId(id: string): this {
    this.data = { ...this.data, id };
    return this;
  }

  onArena(arenaType: ArenaType): this {
    this.data = { ...this.data, arenaType };
    return this;
  }

  atAddress(address: string): this {
    this.data = { ...this.data, address };
    return this;
  }

  ofType(propertyType: PropertyType): this {
    this.data = { ...this.data, propertyType };
    return this;
  }

  withPolygons(...polygons: PolygonType[]): this {
    this.data = { ...this.data, polygons };
    return this;
  }

  withRoofSurfaces(...roofSurfaces: RoofSurfaceType[]): this {
    this.data = { ...this.data, roofSurfaces };
    return this;
  }

  withPanels(panelMode: PanelMode, minimumPanelCount: number): this {
    this.data = { ...this.data, panelMode, minimumPanelCount };
    return this;
  }

  wantsFinancing(wantFinancingOffer = true): this {
    this.data = { ...this.data, wantFinancingOffer };
    return this;
  }

  build(): PropertyCharacterizationData {
    return { ...this.data };
  }
}
