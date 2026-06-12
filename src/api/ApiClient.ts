import { APIRequestContext, APIResponse } from '@playwright/test';
import { Timeout } from './Timeout';
import { ApiConstants } from './ApiConstants';

export interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  data?: unknown;
  timeout?: number;
  retries?: number;
}

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
    },
  ) {
    this.baseUrl        = options.baseUrl.replace(/\/$/, '');
    this.defaultTimeout = options.timeout ?? 15_000;
    this.defaultHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      Accept: 'application/json',
      ...options.headers,
    };
  }

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
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    opts: RequestOptions,
  ): Promise<APIResponse> {
    const url = `${this.baseUrl}${path}`;
    const retries = opts.retries ?? DEFAULT_RETRIES;
    const timeout = new Timeout(opts.timeout ?? this.defaultTimeout);
    const headers = { ...this.defaultHeaders, ...opts.headers };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
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

        if (response.status() >= ApiConstants.INTERNAL_SERVER_ERROR && attempt < retries) {
          await this.sleep(RETRY_BACKOFF_MS * (attempt + 1));
          continue;
        }

        return response;
      } catch (err) {
        lastError = err as Error;
        if (attempt < retries) {
          await this.sleep(RETRY_BACKOFF_MS * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error(`Request failed: ${method} ${url}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
