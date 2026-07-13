import { APIRequestContext, APIResponse } from '@playwright/test';
import { Timeout } from './Timeout';
import { ApiConstants } from './ApiConstants';
import type {
  ApiExchangeLog,
  ApiExchangeLogger,
  ApiRequestLog,
  HttpMethod,
  RequestOptions,
} from '../types/api.types';

const DEFAULT_RETRIES = 3;
const RETRY_BACKOFF_MS = 200;

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(
    private readonly request: APIRequestContext,
    options: {
      baseUrl: string;
      timeout?: number;
      headers?: Record<string, string>;
      onExchange?: ApiExchangeLogger;
    },
  ) {
    this.baseUrl        = options.baseUrl.replace(/\/$/, '');
    this.defaultTimeout = options.timeout ?? 15_000;
    this.defaultHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      Accept: 'application/json',
      ...options.headers,
    };
    this.onExchange = options.onExchange;
  }

  private readonly onExchange?: ApiExchangeLogger;

  async get(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.send('GET', path, opts);
  }

  async post(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.send('POST', path, opts);
  }

  async put(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.send('PUT', path, opts);
  }

  async patch(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.send('PATCH', path, opts);
  }

  async delete(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.send('DELETE', path, opts);
  }

  private async send(
    method: HttpMethod,
    path: string,
    opts: RequestOptions,
  ): Promise<APIResponse> {
    const url = `${this.baseUrl}${path}`;
    const retries = opts.retries ?? DEFAULT_RETRIES;
    const timeout = new Timeout(opts.timeout ?? this.defaultTimeout);
    const headers = { ...this.defaultHeaders, ...opts.headers };
    const maxAttempts = retries + 1;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const requestLog: ApiRequestLog = {
        method,
        path,
        url,
        params: opts.params,
        headers,
        data: opts.data,
        timeout: timeout.value,
        attempt: attempt + 1,
        maxAttempts,
      };
      const startedAt = Date.now();

      try {
        const response = await timeout.withTimeout(
          this.request.fetch(url, {
            method,
            headers,
            params: opts.params as Record<string, string>,
            data: opts.data !== undefined ? JSON.stringify(opts.data) : undefined,
            timeout: timeout.value,
            failOnStatusCode: false,
          }),
        );

        await this.logExchange({
          request: requestLog,
          response: {
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            body: await response.text(),
            durationMs: Date.now() - startedAt,
          },
        });

        if (response.status() >= ApiConstants.INTERNAL_SERVER_ERROR && attempt < retries) {
          await this.sleep(RETRY_BACKOFF_MS * (attempt + 1));
          continue;
        }

        return response;
      } catch (err) {
        lastError = err as Error;
        await this.logExchange({
          request: requestLog,
          error: {
            name: lastError.name,
            message: lastError.message,
            durationMs: Date.now() - startedAt,
          },
        });
        if (attempt < retries) {
          await this.sleep(RETRY_BACKOFF_MS * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error(`Request failed: ${method} ${url}`);
  }

  private async logExchange(exchange: ApiExchangeLog): Promise<void> {
    if (!this.onExchange) return;

    try {
      await this.onExchange(exchange);
    } catch {
      // API logging must never hide the actual test result.
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
