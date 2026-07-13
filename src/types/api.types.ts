export interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  data?: unknown;
  timeout?: number;
  retries?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestLog {
  method: HttpMethod;
  path: string;
  url: string;
  params?: Record<string, string | number | boolean>;
  headers: Record<string, string>;
  data?: unknown;
  timeout: number;
  attempt: number;
  maxAttempts: number;
}

export interface ApiResponseLog {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
}

export interface ApiErrorLog {
  name: string;
  message: string;
  durationMs: number;
}

export interface ApiExchangeLog {
  request: ApiRequestLog;
  response?: ApiResponseLog;
  error?: ApiErrorLog;
}

export type ApiExchangeLogger = (exchange: ApiExchangeLog) => void | Promise<void>;
