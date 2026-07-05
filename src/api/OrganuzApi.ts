import { APIResponse } from '@playwright/test';
import { ApiClient, RequestOptions } from './ApiClient';

/**
 * Thin service wrapper over the organuz Supabase/PostgREST API.
 * Read-only helpers only — the anon role is intentionally not permitted to write.
 */
export class OrganuzApi {
  constructor(private readonly client: ApiClient) {}

  /** GET /rest/v1/projects — full table (select=* by default). */
  getProjects(opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.get('/rest/v1/projects', {
      ...opts,
      params: { select: '*', ...(opts.params ?? {}) },
    });
  }

  /** GET a single project row filtered by its UUID. */
  getProjectById(id: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.get('/rest/v1/projects', {
      ...opts,
      params: { id: `eq.${id}`, select: '*', ...(opts.params ?? {}) },
    });
  }

  /** GET an arbitrary REST resource (used for negative/unknown-table checks). */
  getTable(table: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.get(`/rest/v1/${table}`, {
      ...opts,
      params: { select: '*', ...(opts.params ?? {}) },
    });
  }

  /** Attempt an insert — expected to be rejected by row-level security for the anon role. */
  insertProject(payload: unknown, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.post('/rest/v1/projects', { ...opts, data: payload });
  }

  /**
   * Attempt to PATCH the row with the given id. The anon role has no UPDATE policy,
   * so with `return=representation` this comes back as an empty array (zero rows
   * modified). Pass a non-existent id to guarantee no real row is ever targeted.
   */
  updateProject(id: string, payload: unknown, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.patch('/rest/v1/projects', {
      ...opts,
      params: { id: `eq.${id}`, ...(opts.params ?? {}) },
      headers: { Prefer: 'return=representation', ...(opts.headers ?? {}) },
      data: payload,
    });
  }

  /**
   * Attempt to DELETE the row with the given id. The anon role has no DELETE policy,
   * so with `return=representation` this comes back as an empty array (zero rows
   * removed). Pass a non-existent id to guarantee no real row is ever targeted.
   */
  deleteProject(id: string, opts: RequestOptions = {}): Promise<APIResponse> {
    return this.client.delete('/rest/v1/projects', {
      ...opts,
      params: { id: `eq.${id}`, ...(opts.params ?? {}) },
      headers: { Prefer: 'return=representation', ...(opts.headers ?? {}) },
    });
  }
}
