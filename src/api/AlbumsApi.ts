import { APIResponse } from '@playwright/test';
import { ApiClient } from './ApiClient';
import { ApiService } from './ApiService';
import { Album, CreateAlbumPayload, Photo } from '../types/api.types';

export class AlbumsApi extends ApiService {
  constructor(client: ApiClient) {
    super(client);
  }

  getAll(): Promise<APIResponse> {
    return this.get('/albums');
  }

  getById(id: number): Promise<APIResponse> {
    return this.get(`/albums/${id}`);
  }

  getPhotos(albumId: number): Promise<APIResponse> {
    return this.get(`/albums/${albumId}/photos`);
  }

  create(payload: CreateAlbumPayload): Promise<APIResponse> {
    return this.post('/albums', { data: payload });
  }

  update(id: number, payload: Partial<CreateAlbumPayload>): Promise<APIResponse> {
    return this.put(`/albums/${id}`, { data: payload });
  }

  remove(id: number): Promise<APIResponse> {
    return this.delete(`/albums/${id}`);
  }

  async getByIdAs(id: number): Promise<{ response: APIResponse; body: Album }> {
    const response = await this.getById(id);
    const body: Album = await response.json();
    return { response, body };
  }

  async getPhotosAs(albumId: number): Promise<{ response: APIResponse; body: Photo[] }> {
    const response = await this.getPhotos(albumId);
    const body: Photo[] = await response.json();
    return { response, body };
  }
}
