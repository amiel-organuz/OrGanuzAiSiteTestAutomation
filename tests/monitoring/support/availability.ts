/**
 * Block-page detection for the external-API monitoring group.
 *
 * The govmap.gov.il edge (CDN / WAF) sometimes answers with an HTML
 * block/challenge page — HTTP 200 + `text/html` — instead of the real asset,
 * typically when the requesting IP is geo/bot-blocked (e.g. a CI runner outside
 * Israel). In that state the dependency is environmentally unavailable *from
 * this runner*: it is neither a Govmap/Ofek outage nor a product regression, so
 * the monitoring specs should SKIP rather than fail — the same "environmental
 * unavailability → skip" rule the product suite uses.
 *
 * A genuine break still fails as intended: a 5xx, a connection error, or a
 * real-but-wrong payload does NOT look like an HTML page, so it is not treated
 * as "blocked" and the health checks run and fail (the alert).
 *
 * The probe result is memoised per worker so we hit the network once, not once
 * per test.
 */
import { type APIRequestContext } from '@playwright/test';
import { GOVMAP, OFEK, orthoTileUrl, TILE_HEADERS } from './endpoints';

/** True when a response body/content-type looks like an HTML document page. */
function looksLikeHtml(contentType: string, body: Buffer): boolean {
  if (/text\/html/i.test(contentType)) return true;
  const head = body.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

/**
 * Probe a URL that should return a NON-HTML asset (JS bundle, JSON, or an image
 * tile). Returns a skip reason when the edge served an HTML block page instead,
 * or `null` when the response is a real asset / a genuine error we should let
 * the specs surface. Network errors return `null` so real reachability failures
 * still fail the specs.
 */
async function blockReason(
  request: APIRequestContext,
  label: string,
  url: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await request.get(url, headers ? { headers } : undefined);
    const body = await res.body();
    const contentType = res.headers()['content-type'] ?? '';
    if (looksLikeHtml(contentType, body)) {
      return (
        `${label} served an HTML block/challenge page to this runner ` +
        `(HTTP ${res.status()}, content-type "${contentType || 'none'}", ${body.length} bytes) ` +
        `instead of the expected asset — the runner IP is being geo/bot-blocked by the ` +
        `govmap.gov.il edge, so ${label} is environmentally unavailable here. This is not a ` +
        `product bug and not a real ${label} outage; skipping.`
      );
    }
    return null;
  } catch {
    // A network/TLS error is a real reachability failure — let the specs fail on it.
    return null;
  }
}

let govmapMemo: string | null | undefined;
let ofekMemo: string | null | undefined;

/** Skip reason when Govmap serves a block page to this runner, else `null`. */
export async function govmapBlockReason(request: APIRequestContext): Promise<string | null> {
  if (govmapMemo === undefined) {
    govmapMemo = await blockReason(request, 'Govmap', `${GOVMAP.apiBaseUrl}/govmap/api/govmap.api.js`);
  }
  return govmapMemo;
}

/** Skip reason when Ofek serves a block page to this runner, else `null`. */
export async function ofekBlockReason(request: APIRequestContext): Promise<string | null> {
  if (ofekMemo === undefined) {
    const { z, x, y } = OFEK.sampleTile;
    ofekMemo = await blockReason(request, 'Ofek', orthoTileUrl(z, x, y), TILE_HEADERS as Record<string, string>);
  }
  return ofekMemo;
}
