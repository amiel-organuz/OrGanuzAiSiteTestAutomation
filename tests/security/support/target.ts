/**
 * Target + helpers for the security / penetration-testing suite.
 *
 * Scope: the Organuz Supabase / PostgREST backend (`config.organuzApi`), tested
 * with the PUBLIC anon key only — the same key shipped in the site bundle. Every
 * check here is NON-DESTRUCTIVE: it either reads, or sends a write that a correctly
 * configured backend REJECTS (so nothing is created/changed), or targets a
 * non-existent row so zero rows are affected even if a policy were mis-set. No
 * DoS, no fuzzing volume, no service-role key.
 */
import { config } from '../../../src/utils/config';

export const API = {
  /** Supabase project origin, e.g. https://<ref>.supabase.co (no trailing slash). */
  baseUrl: config.organuzApi.baseUrl.replace(/\/+$/, ''),
  /** The public anon key (JWT) shipped in the bundle. Not a secret; RLS-scoped. */
  anonKey: config.organuzApi.anonKey,
};

export const PATHS = {
  projects: '/rest/v1/projects',
  unknownTable: '/rest/v1/__nonexistent_table_zzz',
  adminUsers: '/auth/v1/admin/users',
  edgeFn: '/functions/v1/__nonexistent_fn_zzz',
};

/** Standard Supabase anon auth headers (apikey + Bearer). */
export const anonHeaders: Record<string, string> = {
  apikey: API.anonKey,
  Authorization: `Bearer ${API.anonKey}`,
};

export const jsonWrite: Record<string, string> = {
  ...anonHeaders,
  'content-type': 'application/json',
};

/** A UUID that matches no real row — makes UPDATE/DELETE probes affect zero rows. */
export const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

/** A clearly-labelled marker so any write that slips through is identifiable. */
export const WRITE_MARKER = '__qa_pentest_marker_do_not_use__';

/** Response keys that would indicate sensitive data exposure in a public row. */
export const SENSITIVE_KEYS = [
  'password', 'passwd', 'pwd', 'secret', 'token', 'access_token', 'refresh_token',
  'api_key', 'apikey', 'private_key', 'service_role', 'ssn', 'credit_card', 'cvv',
];

/** Decode one part (0 = header, 1 = payload) of a JWT without verifying it. */
export function decodeJwtPart(jwt: string, index: 0 | 1): Record<string, unknown> {
  const part = jwt.split('.')[index] ?? '';
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}
