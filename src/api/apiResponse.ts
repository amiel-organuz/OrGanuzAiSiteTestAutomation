import type { APIResponse } from '@playwright/test';
import { HttpStatus } from '../utils/httpStatus';

/**
 * A parsed, already-read view of an HTTP response.
 *
 * Endpoint clients return this instead of a raw Playwright `APIResponse` so specs read
 * the body straight off the object (`res.json` / `res.text` / `res.buffer`) without an
 * extra `await res.json()` per assertion, while still exposing `status`, `headers`, and
 * `contentType` for the status/header checks the API & security suites rely on.
 *
 * The body is read exactly once (as a Buffer) and exposed three ways: `buffer` (binary,
 * e.g. map tiles), `text` (its UTF-8 view), and `json` (the parsed body, or `null` when
 * the payload isn't JSON — so a probe can assert "this error was NOT JSON" safely).
 */
export interface ParsedResponse<T = unknown> {
  /** HTTP status code (e.g. 200, 401). */
  readonly status: number;
  /** True for a 2xx status. */
  readonly ok: boolean;
  /** Lower-cased response headers, as Playwright returns them (multi-value headers merged). */
  readonly headers: Record<string, string>;
  /** Headers as a flat list preserving repeats (e.g. multiple `set-cookie` entries). */
  readonly headersArray: ReadonlyArray<{ readonly name: string; readonly value: string }>;
  /** The `content-type` header (or '' when absent), for content-type hygiene checks. */
  readonly contentType: string;
  /** The raw response body. */
  readonly buffer: Buffer;
  /** The body decoded as UTF-8 text. */
  readonly text: string;
  /** The body parsed as JSON, or `null` when it isn't valid JSON. */
  readonly json: T | null;
}

/**
 * Read an `APIResponse` fully and wrap it as a {@link ParsedResponse}. Never throws:
 * a body that can't be read becomes empty, and a non-JSON body yields `json: null`.
 */
export async function parseResponse<T = unknown>(res: APIResponse): Promise<ParsedResponse<T>> {
  let buffer: Buffer;
  try {
    buffer = await res.body();
  } catch {
    buffer = Buffer.alloc(0);
  }
  const text = buffer.toString('utf8');

  let json: T | null = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text) as T;
    } catch {
      json = null;
    }
  }

  const headers = res.headers();
  const headersArray = res.headersArray().map((h) => ({ name: h.name.toLowerCase(), value: h.value }));
  const status = res.status();
  return {
    status,
    ok: HttpStatus.isSuccess(status),
    headers,
    headersArray,
    contentType: headers['content-type'] ?? '',
    buffer,
    text,
    json,
  };
}
