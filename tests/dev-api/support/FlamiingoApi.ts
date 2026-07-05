import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Client for the Organuz dev/test product-app backend at organuz.flamiingo.com.
 *
 * It is NOT REST — it is an RPC gateway: every call is `POST /` with a
 * form-encoded body `action=token&token=<token>&call=<method>` (+ params).
 * Success responses are JSON `{ status: "ok", ... }`; the `token` is public
 * (baked into the app bundle). See the organuz-api-tests / dev-api docs.
 */
export class FlamiingoApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  /** Invoke an RPC method. Pass `token` explicitly to test auth failures. */
  call(
    method: string,
    params: Record<string, string> = {},
    token: string = this.token,
  ): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/`, {
      form: { action: 'token', token, call: method, ...params },
      failOnStatusCode: false,
    });
  }
}
