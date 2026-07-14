import { attachment, step } from 'allure-js-commons';
import type {
  ApiErrorLog,
  ApiExchangeLog,
  ApiExchangeLogger,
  ApiRequestLog,
  ApiResponseLog,
} from '../types/api.types';

/**
 * Allure 3 reporter for the {@link ApiClient} exchange stream.
 *
 * Wire it as `onExchange` and every HTTP call becomes a **named step** in the
 * Allure tree (`API GET /rest/v1/projects → 200 (123 ms)`) carrying typed
 * attachments: the request line + redacted headers, a copy-pasteable `curl`,
 * the response headers, and the response body rendered with the RIGHT content
 * type — a JSON body lands as `application/json` so Allure shows its viewer
 * instead of a wall of text. Secrets (auth/api-key/cookie headers) are redacted.
 *
 * The helpers below are pure and exported so they can be unit-tested without a
 * live Allure runtime.
 */

/** Header names whose values are secrets — never rendered verbatim in a report. */
const REDACTED_HEADERS = new Set([
  'authorization',
  'apikey',
  'x-api-key',
  'proxy-authorization',
  'cookie',
  'set-cookie',
]);
const REDACTED = '••• redacted •••';

/** Attachments over this many characters are truncated (traces stay small). */
const MAX_BODY_CHARS = 12_000;

/** Copy each header, masking the value of any secret-bearing header. */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = REDACTED_HEADERS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

function truncate(value: string): string {
  if (value.length <= MAX_BODY_CHARS) return value;
  return `${value.slice(0, MAX_BODY_CHARS)}\n… truncated ${value.length - MAX_BODY_CHARS} chars`;
}

function formatHeaders(headers: Record<string, string>): string {
  const entries = Object.entries(redactHeaders(headers)).sort(([a], [b]) => a.localeCompare(b));
  return entries.length ? entries.map(([k, v]) => `${k}: ${v}`).join('\n') : '<none>';
}

/** Full URL including query params, so the report/curl are reproducible. */
export function buildUrl(request: Pick<ApiRequestLog, 'url' | 'params'>): string {
  if (!request.params || Object.keys(request.params).length === 0) return request.url;
  const query = Object.entries(request.params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${request.url}?${query}`;
}

/**
 * Render a response/request body for attachment, choosing the content type.
 * JSON (by content-type header or a `{`/`[` lead) is pretty-printed and typed
 * `application/json`; anything else keeps its own media type (or text/plain).
 */
export function renderBody(body: string, contentType?: string): { text: string; type: string } {
  const trimmed = (body ?? '').trim();
  if (!trimmed) return { text: '<empty>', type: 'text/plain' };

  const looksJson = (contentType?.toLowerCase().includes('json') ?? false) || /^[[{]/.test(trimmed);
  if (looksJson) {
    try {
      return { text: JSON.stringify(JSON.parse(trimmed), null, 2), type: 'application/json' };
    } catch {
      /* malformed JSON — fall through and attach the raw text as-is */
    }
  }
  return { text: trimmed, type: contentType?.split(';')[0].trim() || 'text/plain' };
}

/** A copy-pasteable `curl` reproducing the request (secrets redacted). */
export function toCurl(request: ApiRequestLog): string {
  const lines = [`curl -i -X ${request.method}`];
  for (const [key, value] of Object.entries(redactHeaders(request.headers))) {
    lines.push(`  -H '${key}: ${value}'`);
  }
  if (request.data !== undefined) {
    const body = typeof request.data === 'string' ? request.data : JSON.stringify(request.data);
    lines.push(`  --data '${body}'`);
  }
  lines.push(`  '${buildUrl(request)}'`);
  return lines.join(' \\\n');
}

function requestBlock(request: ApiRequestLog): string {
  return [
    `${request.method} ${buildUrl(request)}`,
    `Timeout: ${request.timeout}ms`,
    request.attempt > 1 ? `Attempt: ${request.attempt}/${request.maxAttempts}` : undefined,
    '',
    'Headers:',
    formatHeaders(request.headers),
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

/** One-line step title summarising the exchange. */
export function exchangeStepName(exchange: ApiExchangeLog): string {
  const { request, response, error } = exchange;
  const outcome = response ? `${response.status} ${response.statusText}`.trim() : `✗ ${error?.name ?? 'error'}`;
  const durationMs = response?.durationMs ?? error?.durationMs;
  const retry = request.attempt > 1 ? ` [attempt ${request.attempt}/${request.maxAttempts}]` : '';
  return (
    `API ${request.method} ${request.path} → ${outcome}` +
    (durationMs != null ? ` (${durationMs} ms)` : '') +
    retry
  );
}

async function attachResponse(response: ApiResponseLog): Promise<void> {
  await attachment('Response headers', formatHeaders(response.headers), { contentType: 'text/plain' });
  const rendered = renderBody(response.body, response.headers['content-type']);
  await attachment(`Response body (${response.status})`, truncate(rendered.text), {
    contentType: rendered.type,
  });
}

async function attachError(error: ApiErrorLog): Promise<void> {
  await attachment('Error', `${error.name}: ${error.message}\nAfter ${error.durationMs}ms`, {
    contentType: 'text/plain',
  });
}

/**
 * `ApiExchangeLogger` that renders each exchange as a nested Allure step with
 * typed attachments. Attachment failures are swallowed by the caller
 * (`ApiClient.logExchange`), so reporting can never fail a test.
 */
export const allureApiExchangeLogger: ApiExchangeLogger = async (exchange) => {
  const { request, response, error } = exchange;
  await step(exchangeStepName(exchange), async () => {
    await attachment('Request', requestBlock(request), { contentType: 'text/plain' });
    await attachment('curl', toCurl(request), { contentType: 'text/plain' });
    if (request.data !== undefined) {
      const rendered = renderBody(
        typeof request.data === 'string' ? request.data : JSON.stringify(request.data),
        request.headers['content-type'] ?? request.headers['Content-Type'],
      );
      await attachment('Request body', truncate(rendered.text), { contentType: rendered.type });
    }
    if (response) await attachResponse(response);
    if (error) await attachError(error);
  });
};
