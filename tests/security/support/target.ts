/**
 * Target + helpers for the security / penetration-testing suite.
 *
 * Scope: the Organuz Supabase / PostgREST backend (`config.organuzApi`), tested
 * with the PUBLIC anon key only — the same key shipped in the site bundle. Every
 * check is safe by default: it either reads or targets a non-existent row so zero
 * rows are affected even if a policy were mis-set. Probes whose failure could
 * mutate data are guarded behind an explicit disposable-target acknowledgement.
 * No DoS, no fuzzing volume, no service-role key.
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
  // GoTrue auth endpoints (account-takeover surface).
  token: '/auth/v1/token',
  user: '/auth/v1/user',
  verify: '/auth/v1/verify',
};

/**
 * Clearly-fabricated identities for the account-takeover probes. None of these
 * belong to a real account, so login/verify attempts against them can only ever
 * FAIL — they never send a message to a real user and never touch real data.
 */
export const FAKE = {
  email: 'qa_pentest_nonexistent@example.invalid',
  password: 'Wr0ng-Pentest-Password!__do_not_use',
  phone: '+972000000000',
  otp: '000000',
  refreshToken: '__qa_pentest_forged_refresh_token__',
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

/**
 * Write-denial probes are unsafe against a real dataset: the test is specifically
 * looking for a broken RLS policy, so a failure could create or delete data before
 * the assertion runs. Require both an explicit switch and an exact origin
 * acknowledgement so these probes can only run intentionally against a disposable
 * security-test project.
 */
export const WRITE_PROBES_ENABLED =
  process.env.SECURITY_WRITE_PROBES === 'true' &&
  process.env.SECURITY_WRITE_TARGET === API.baseUrl;

export const WRITE_PROBES_SKIP_REASON =
  'mutating denial probe disabled; use a disposable backend and set ' +
  'SECURITY_WRITE_PROBES=true plus SECURITY_WRITE_TARGET=<exact backend origin>';

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

/** Base64url-encode an object as a JWT segment (no padding). */
function b64urlSegment(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Forge an UNSIGNED / bogus-signature user JWT for account-takeover probes.
 *
 * The payload is elevated (an arbitrary `sub`, `role: 'authenticated'`, far-future
 * `exp`) but the signature is invalid — `alg: 'none'` carries an empty signature,
 * any other alg carries a garbage one. A backend that verifies signatures MUST
 * reject it; a passing test would mean a forged token is honoured. Non-destructive:
 * the token authenticates nothing, so no request it rides on can succeed.
 */
export function forgeUserJwt(alg: 'none' | 'HS256' = 'HS256'): string {
  const header = { alg, typ: 'JWT' };
  const payload = {
    sub: '11111111-1111-4111-8111-111111111111',
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'supabase',
    // Fixed far-future literal (avoids Date.now so the value is deterministic).
    exp: 4102444800, // 2100-01-01T00:00:00Z
    iat: 1700000000,
    email: FAKE.email,
  };
  const signature = alg === 'none' ? '' : 'forged_signature_not_valid';
  return `${b64urlSegment(header)}.${b64urlSegment(payload)}.${signature}`;
}
