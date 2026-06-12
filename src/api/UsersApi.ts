import { APIResponse } from '@playwright/test';
import { ApiClient } from './ApiClient';
import { ApiService } from './ApiService';
import { RequestOptions } from './ApiClient';
import { User, CreateUserPayload } from '../types/api.types';

export class UsersApi extends ApiService {
  constructor(client: ApiClient) {
    super(client);
  }

  getAll(opts: RequestOptions = {}): Promise<APIResponse> {
    return this.get('/users', opts);
  }

  getById(id: number): Promise<APIResponse> {
    return this.get(`/users/${id}`);
  }

  getPosts(userId: number): Promise<APIResponse> {
    return this.get(`/users/${userId}/posts`);
  }

  getAlbums(userId: number): Promise<APIResponse> {
    return this.get(`/users/${userId}/albums`);
  }

  getTodos(userId: number): Promise<APIResponse> {
    return this.get(`/users/${userId}/todos`);
  }

  create(payload: CreateUserPayload): Promise<APIResponse> {
    return this.post('/users', { data: payload });
  }

  update(id: number, payload: Partial<CreateUserPayload>): Promise<APIResponse> {
    return this.put(`/users/${id}`, { data: payload });
  }

  remove(id: number): Promise<APIResponse> {
    return this.delete(`/users/${id}`);
  }

  async getByIdAs(id: number): Promise<{ response: APIResponse; body: User }> {
    const response = await this.getById(id);
    const body: User = await response.json();
    return { response, body };
  }
}
