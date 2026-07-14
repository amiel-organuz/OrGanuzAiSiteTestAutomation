/**
 * Endpoints and constants for the external-API monitoring group.
 *
 * The Organuz product characterizes a property on a live map: it locates the
 * address and draws the roof over aerial imagery. Two external services from the
 * Survey of Israel / national GIS make that possible, and both have caused
 * product incidents when they broke:
 *
 *  - **Govmap** (`www.govmap.gov.il`) — the map API + address search/geocoding.
 *  - **Ofek** (`basemaps.govmap.gov.il`) — the national orthophoto ("אופק")
 *    aerial tiles the roof scan runs on, plus the label overlay tiles.
 *
 * Values come from `config.json → monitoring` (env-overridable) so a layer
 * rename or host change is a one-line update. Discovered by capturing the dev
 * app's network on the calculator address/roof step.
 */
import cfg from '../../../config.json';

const m = cfg.monitoring;

export const GOVMAP = {
  /** Govmap API host. */
  apiBaseUrl: process.env.GOVMAP_API_URL ?? m.govmap.apiBaseUrl,
  /** Public embed token the product initialises the viewer with (not a secret). */
  embedToken: process.env.GOVMAP_EMBED_TOKEN ?? m.govmap.embedToken,
  /** The Organuz app origin the embed token is authorized for (bound in the auth handshake). */
  embedHostUrl: process.env.GOVMAP_EMBED_HOST ?? m.govmap.embedHostUrl,
  /** A real address the product would search for. */
  knownAddress: m.govmap.knownAddress,
  /** The street part of that address, used to sanity-check search results. */
  knownStreet: m.govmap.knownStreet,
};

export const OFEK = {
  /** Orthophoto / label tile host. */
  tilesBaseUrl: process.env.OFEK_TILES_URL ?? m.ofek.tilesBaseUrl,
  /** Current national orthophoto layer (renamed yearly — drift is a real signal). */
  orthoLayer: process.env.OFEK_ORTHO_LAYER ?? m.ofek.orthoLayer,
  /** Current label/line overlay layer. */
  labelsLayer: process.env.OFEK_LABELS_LAYER ?? m.ofek.labelsLayer,
  /** The tile server only serves requests refered from the Govmap origin. */
  referer: process.env.OFEK_REFERER ?? m.ofek.referer,
  /** A known-good tile coordinate (Tel Aviv). */
  sampleTile: m.ofek.sampleTile as { z: number; x: number; y: number },
};

/** Per-request latency ceiling for a healthy dependency. */
export const LATENCY_BUDGET_MS = Number(process.env.MONITORING_LATENCY_MS ?? m.latencyBudgetMs);

/** Orthophoto (aerial) tile URL for a z/x/y coordinate. */
export function orthoTileUrl(z: number, x: number, y: number): string {
  return `${OFEK.tilesBaseUrl}/tms/${OFEK.orthoLayer}/${z}/${x}/${y}.jpg`;
}

/** Label/line overlay tile URL for a z/x/y coordinate. */
export function labelTileUrl(z: number, x: number, y: number): string {
  return `${OFEK.tilesBaseUrl}/backgroundMaps/${OFEK.labelsLayer}/${z}/${x}/${y}.png`;
}

/** Headers the Ofek tile server requires (a Govmap-origin Referer). */
export const TILE_HEADERS = { Referer: OFEK.referer } as const;

/** Body the product sends to Govmap address autocomplete. */
export function autocompleteBody(searchText: string) {
  return { searchText, language: 'he', isAccurate: false, maxResults: 10 };
}
