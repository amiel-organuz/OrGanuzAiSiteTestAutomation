import { ApiClient } from './ApiClient';
import { parseResponse, type ParsedResponse } from './apiResponse';
import type { RequestOptions } from '../types/api.types';
import { RestApiConstants } from './RestApiConstants';

const { Tables, SELECT_ALL, Headers, Prefer } = RestApiConstants;
const PROJECTS_PATH = RestApiConstants.resource(Tables.projects);

/**
 * Thin service wrapper over the organuz Supabase/PostgREST API.
 * Read-only helpers only — the anon role is intentionally not permitted to write.
 *
 * Every endpoint returns a {@link ParsedResponse}: the body is already read and parsed
 * (`res.json` / `res.text`), alongside `status`, `headers`, and `contentType`.
 */
export class OrganuzApi {
  constructor(private readonly client: ApiClient) {}

  /** GET /rest/v1/projects — full table (select=* by default). */
  async getProjects<T = unknown>(opts: RequestOptions = {}): Promise<ParsedResponse<T>> {
    return parseResponse<T>(await this.client.get(PROJECTS_PATH, {
      ...opts,
      params: { select: SELECT_ALL, ...(opts.params ?? {}) },
    }));
  }

  /** GET a single project row filtered by its UUID. */
  async getProjectById<T = unknown>(id: string, opts: RequestOptions = {}): Promise<ParsedResponse<T>> {
    return parseResponse<T>(await this.client.get(PROJECTS_PATH, {
      ...opts,
      params: { id: RestApiConstants.eq(id), select: SELECT_ALL, ...(opts.params ?? {}) },
    }));
  }

  /** GET an arbitrary REST resource (used for negative/unknown-table checks). */
  async getTable<T = unknown>(table: string, opts: RequestOptions = {}): Promise<ParsedResponse<T>> {
    return parseResponse<T>(await this.client.get(RestApiConstants.resource(table), {
      ...opts,
      params: { select: SELECT_ALL, ...(opts.params ?? {}) },
    }));
  }

  /** Attempt an insert — expected to be rejected by row-level security for the anon role. */
  async insertProject<T = unknown>(payload: unknown, opts: RequestOptions = {}): Promise<ParsedResponse<T>> {
    return parseResponse<T>(await this.client.post(PROJECTS_PATH, { ...opts, data: payload }));
  }

  /**
   * Attempt to PATCH the row with the given id. The anon role has no UPDATE policy,
   * so with `return=representation` this comes back as an empty array (zero rows
   * modified). Pass a non-existent id to guarantee no real row is ever targeted.
   */
  async updateProject<T = unknown>(id: string, payload: unknown, opts: RequestOptions = {}): Promise<ParsedResponse<T>> {
    return parseResponse<T>(await this.client.patch(PROJECTS_PATH, {
      ...opts,
      params: { id: RestApiConstants.eq(id), ...(opts.params ?? {}) },
      headers: { [Headers.prefer]: Prefer.returnRepresentation, ...(opts.headers ?? {}) },
      data: payload,
    }));
  }

  /**
   * Attempt to DELETE the row with the given id. The anon role has no DELETE policy,
   * so with `return=representation` this comes back as an empty array (zero rows
   * removed). Pass a non-existent id to guarantee no real row is ever targeted.
   */
  async deleteProject<T = unknown>(id: string, opts: RequestOptions = {}): Promise<ParsedResponse<T>> {
    return parseResponse<T>(await this.client.delete(PROJECTS_PATH, {
      ...opts,
      params: { id: RestApiConstants.eq(id), ...(opts.params ?? {}) },
      headers: { [Headers.prefer]: Prefer.returnRepresentation, ...(opts.headers ?? {}) },
    }));
  }
}
