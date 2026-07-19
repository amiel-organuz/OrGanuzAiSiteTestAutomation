/**
 * Endpoint client for the backend penetration-testing suite.
 *
 * One method per endpoint the SEC probes hit on the Organuz Supabase / PostgREST backend
 * (paths are relative — the `security` project's `baseURL` is `config.organuzApi.baseUrl`).
 * Every method performs the request and returns a {@link ParsedResponse} (body already
 * read + parsed), so probes assert on `res.status` / `res.headers` / `res.json` / `res.text`
 * without re-reading the body. `headers` defaults to the anon set but every method accepts
 * an override so a probe can send no key, a garbage key, or a forged bearer token.
 *
 * Safe by default: reads and zero-row / fabricated-identity targets. Mutating probes are
 * still gated by the caller (see target `WRITE_PROBES_ENABLED`).
 */
import type { APIRequestContext } from '@playwright/test';
import { parseResponse, type ParsedResponse } from '../../../src/api';
import { PATHS, anonHeaders, jsonWrite } from './target';

type Headers = Record<string, string>;

export class BackendApi {
  constructor(private readonly request: APIRequestContext) {}

  // ---- projects (PostgREST resource) ----------------------------------------
  /** GET /rest/v1/projects with an optional query string (e.g. `?limit=1`). */
  async getProjects(query = '', headers: Headers = anonHeaders): Promise<ParsedResponse> {
    return parseResponse(await this.request.get(`${PATHS.projects}${query}`, { headers, failOnStatusCode: false }));
  }

  /** POST /rest/v1/projects — anon INSERT attempt (RLS is expected to deny it). */
  async insertProject(data: unknown, headers: Headers = jsonWrite): Promise<ParsedResponse> {
    return parseResponse(await this.request.post(PATHS.projects, { headers, data, failOnStatusCode: false }));
  }

  /** PATCH /rest/v1/projects with a filter query — anon UPDATE attempt. */
  async patchProjects(query: string, data: unknown, headers: Headers = jsonWrite): Promise<ParsedResponse> {
    return parseResponse(await this.request.patch(`${PATHS.projects}${query}`, { headers, data, failOnStatusCode: false }));
  }

  /** DELETE /rest/v1/projects — unqualified mass-delete attempt. */
  async deleteProjects(headers: Headers = anonHeaders): Promise<ParsedResponse> {
    return parseResponse(await this.request.delete(PATHS.projects, { headers, failOnStatusCode: false }));
  }

  /** CORS preflight (OPTIONS) against the projects resource from the given Origin. */
  async preflightProjects(origin: string, method = 'GET', headers: Headers = anonHeaders): Promise<ParsedResponse> {
    return parseResponse(
      await this.request.fetch(PATHS.projects, {
        method: 'OPTIONS',
        headers: { ...headers, Origin: origin, 'Access-Control-Request-Method': method },
        failOnStatusCode: false,
      }),
    );
  }

  // ---- arbitrary path (unknown table, admin, edge fn, /auth/v1/user) --------
  /** GET an arbitrary backend path with the given headers (default anon). */
  async get(path: string, headers: Headers = anonHeaders): Promise<ParsedResponse> {
    return parseResponse(await this.request.get(path, { headers, failOnStatusCode: false }));
  }

  // ---- GoTrue auth ----------------------------------------------------------
  /** POST /auth/v1/token with a grant_type (password / refresh_token). */
  async token(grantType: string, data: unknown, headers: Headers = jsonWrite): Promise<ParsedResponse> {
    return parseResponse(
      await this.request.post(`${PATHS.token}?grant_type=${grantType}`, { headers, data, failOnStatusCode: false }),
    );
  }

  /** POST /auth/v1/verify — OTP verification. */
  async verifyOtp(data: unknown, headers: Headers = jsonWrite): Promise<ParsedResponse> {
    return parseResponse(await this.request.post(PATHS.verify, { headers, data, failOnStatusCode: false }));
  }

  /** POST /auth/v1/admin/users — privileged create-user attempt (must be blocked for anon). */
  async adminCreateUser(data: unknown, headers: Headers = jsonWrite): Promise<ParsedResponse> {
    return parseResponse(await this.request.post(PATHS.adminUsers, { headers, data, failOnStatusCode: false }));
  }
}
