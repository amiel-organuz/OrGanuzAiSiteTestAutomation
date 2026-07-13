import { Page, Request, expect } from '@playwright/test';
import { config } from '../../../src/utils/config';

/**
 * Extracts the token the product UI uses for its backend calls, straight off the
 * wire, via Playwright request interception.
 *
 * The dev/test product app talks to the RPC gateway (organuz.flamiingo.com) with a
 * form-encoded `POST /` whose body is `action=token&token=<token>&call=<method>`.
 * Before login every call carries the PUBLIC app token baked into the bundle; after
 * login the authenticated calls carry the user's SESSION token in that same `token`
 * field. This helper attaches a request listener, records every backend POST's token,
 * and exposes methods to read them back (latest, distinct, or the post-login session
 * token — the one that differs from the known public token).
 *
 * Usage:
 *   const tokens = new TokenInterceptor(page).start();
 *   await product.loginAs('customer');
 *   const uiToken = await tokens.waitForToken();      // any token the UI sent
 *   const session = tokens.sessionToken();            // the non-public (per-user) one
 */
export interface InterceptedTokenCall {
  readonly token: string;
  readonly call: string;
  readonly url: string;
}

export class TokenInterceptor {
  private readonly captured: InterceptedTokenCall[] = [];
  private attached = false;

  /**
   * @param page         the page whose requests to observe
   * @param backendHost  RPC gateway host to watch (default: config.devApi host,
   *                      i.e. organuz.flamiingo.com)
   * @param publicToken  the public app token baked into the bundle, used to tell the
   *                      session token apart (default: config.devApi.token)
   */
  constructor(
    private readonly page: Page,
    private readonly backendHost: string = new URL(config.devApi.baseUrl).host,
    private readonly publicToken: string = config.devApi.token,
  ) {}

  /** Begin capturing backend-POST tokens. Idempotent; returns `this` for chaining. */
  start(): this {
    if (!this.attached) {
      this.page.on('request', this.onRequest);
      this.attached = true;
    }
    return this;
  }

  /** Stop capturing. Idempotent; returns `this`. */
  stop(): this {
    if (this.attached) {
      this.page.off('request', this.onRequest);
      this.attached = false;
    }
    return this;
  }

  private readonly onRequest = (req: Request): void => {
    if (req.method() !== 'POST') return;
    let host: string;
    try {
      host = new URL(req.url()).host;
    } catch {
      return;
    }
    if (host !== this.backendHost) return;

    const postData = req.postData();
    const token = TokenInterceptor.tokenFromBody(postData);
    if (!token) return;

    const call = new URLSearchParams(postData ?? '').get('call') ?? '';
    this.captured.push({ token, call, url: req.url() });
  };

  /** Pull the `token` field out of a form-encoded (or JSON) RPC POST body. */
  static tokenFromBody(body: string | null): string | undefined {
    if (!body) return undefined;
    const form = new URLSearchParams(body);
    const formToken = form.get('token');
    if (formToken) return formToken;
    try {
      const json = JSON.parse(body);
      if (json && typeof json.token === 'string') return json.token;
    } catch {
      /* not JSON */
    }
    return undefined;
  }

  /** Every backend POST observed so far, in order, with its call + url. */
  all(): readonly InterceptedTokenCall[] {
    return this.captured;
  }

  /** Distinct token values seen, in first-seen order. */
  distinctTokens(): string[] {
    return [...new Set(this.captured.map((c) => c.token))];
  }

  /** The most recently observed token, or undefined if none yet. */
  latest(): string | undefined {
    return this.captured.at(-1)?.token;
  }

  /**
   * The UI's per-user SESSION token: the most recent captured token that is not the
   * public app token. Undefined before login (only the public token has been seen).
   */
  sessionToken(): string | undefined {
    for (let i = this.captured.length - 1; i >= 0; i--) {
      if (this.captured[i].token !== this.publicToken) return this.captured[i].token;
    }
    return undefined;
  }

  /** Discard everything captured so far (e.g. to isolate post-login traffic). */
  clear(): void {
    this.captured.length = 0;
  }

  /**
   * Wait until at least one backend token is captured and return the latest.
   * `sessionOnly` waits specifically for a non-public (post-login) token.
   */
  async waitForToken(options: { timeoutMs?: number; sessionOnly?: boolean } = {}): Promise<string> {
    const { timeoutMs = 15_000, sessionOnly = false } = options;
    const read = () => (sessionOnly ? this.sessionToken() : this.latest());
    await expect
      .poll(() => read() ?? '', {
        message: `waiting for the UI to send a ${sessionOnly ? 'session ' : ''}token to ${this.backendHost}`,
        timeout: timeoutMs,
      })
      .not.toBe('');
    return read() as string;
  }
}
