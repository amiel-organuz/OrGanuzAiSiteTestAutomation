import { APIResponse } from '@playwright/test';
import { ApiClient, RequestOptions } from './ApiClient';

export abstract class ApiService {
  constructor(protected readonly client: ApiClient) {}

  protected get(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.get(path, opts);
  }

  protected post(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.post(path, opts);
  }

  protected put(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.put(path, opts);
  }

  protected patch(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.patch(path, opts);
  }

  protected delete(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.delete(path, opts);
  }
}
