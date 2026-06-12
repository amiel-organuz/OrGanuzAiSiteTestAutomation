import { APIResponse } from '@playwright/test';
import { ApiClient } from './ApiClient';
import { ApiService } from './ApiService';
import { Comment, CreateCommentPayload } from '../types/api.types';

export class CommentsApi extends ApiService {
  constructor(client: ApiClient) {
    super(client);
  }

  getAll(): Promise<APIResponse> {
    return this.get('/comments');
  }

  getById(id: number): Promise<APIResponse> {
    return this.get(`/comments/${id}`);
  }

  getByPostId(postId: number): Promise<APIResponse> {
    return this.get('/comments', { params: { postId } });
  }

  create(payload: CreateCommentPayload): Promise<APIResponse> {
    return this.post('/comments', { data: payload });
  }

  update(id: number, payload: Partial<CreateCommentPayload>): Promise<APIResponse> {
    return this.put(`/comments/${id}`, { data: payload });
  }

  remove(id: number): Promise<APIResponse> {
    return this.delete(`/comments/${id}`);
  }

  async getByIdAs(id: number): Promise<{ response: APIResponse; body: Comment }> {
    const response = await this.getById(id);
    const body: Comment = await response.json();
    return { response, body };
  }
}
