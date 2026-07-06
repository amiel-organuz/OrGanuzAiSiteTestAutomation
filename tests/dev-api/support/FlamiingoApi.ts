import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Client for the Organuz dev/test product-app backend at organuz.flamiingo.com.
 *
 * It is NOT REST — it is an RPC gateway: every call is `POST /` with a
 * form-encoded body `action=token&token=<token>&call=<method>` (+ params).
 * Success responses are JSON `{ status: "ok", ... }`; the `token` is public
 * (baked into the app bundle). See the organuz-api-tests / dev-api docs.
 */
/**
 * The dev host is occasionally toggled into a maintenance state that answers every
 * request with a plain-text banner (e.g. "Debug Mode Off") instead of JSON, and it
 * sometimes flaps in and out of it. Transient banners are retried; a sustained one
 * is returned as-is so the dev-api availability guard can skip the suite.
 */
const MAINTENANCE_BANNER = /debug mode (?:on|off)|maintenance|temporarily unavailable/i;
const MAX_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = 300;

export class FlamiingoApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  /** True when a response body is the dev maintenance banner rather than an API payload. */
  static isMaintenanceBanner(body: string): boolean {
    const trimmed = body.trim();
    return !trimmed.startsWith('{') && !trimmed.startsWith('[') && MAINTENANCE_BANNER.test(trimmed);
  }

  /**
   * Invoke an RPC method. Pass `token` explicitly to test auth failures.
   * Retries transient maintenance banners; returns the last response either way.
   */
  async call(
    method: string,
    params: Record<string, string> = {},
    token: string = this.token,
  ): Promise<APIResponse> {
    let response!: APIResponse;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      response = await this.request.post(`${this.baseUrl}/`, {
        form: { action: 'token', token, call: method, ...params },
        failOnStatusCode: false,
      });
      if (!FlamiingoApi.isMaintenanceBanner(await response.text())) {
        return response;
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * attempt));
      }
    }
    return response;
  }
}
