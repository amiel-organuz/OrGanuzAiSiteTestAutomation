/**
 * Target + helpers for the fraud-detection / account-takeover (ATO) suite.
 *
 * Scope: the Organuz PRODUCT app — the calculator origin (`config.app.baseUrl`) and
 * the auth/RPC backend behind it — for the environment selected by QA_TARGET_ENV
 * (dev `dev1.app.organize.organuz.com` by default, prod `energy.organuz.com`). This
 * is the anti-abuse sibling of the `security` suite (which targets the organuz.ai
 * Supabase backend). A FAILURE here is a real fraud/ATO finding.
 *
 * Two tiers of check, matching the two tiers of certainty:
 *  1. APP-ORIGIN checks (transport, framing, CORS, secret/cookie hygiene) run against
 *     the correctly env-resolved app origin — they hold on BOTH dev and prod and never
 *     depend on the backend's business contract.
 *  2. AUTH-BACKEND checks (forged-token rejection, injection posture, OTP brute-force)
 *     run against the resolved gateway and self-SKIP via a reachability canary when the
 *     gateway is unreachable or serves an HTML block/challenge page to the runner — the
 *     same sanctioned, env-gated skip pattern the monitoring suite uses. A genuine
 *     finding (forged creds honoured, secrets leaked) still FAILS.
 *
 * Non-destructive by construction: every identity below is fabricated and belongs to
 * no real account, so OTP *verify* attempts can only ever fail and never touch real
 * data. The suite NEVER triggers an OTP *send* (which would cost a real SMS on prod) —
 * it only exercises verify/read paths. No writes, no fuzzing volume, no service key.
 */
import type { APIRequestContext } from '@playwright/test';
import { config } from '../../../src/utils/config';
import { HttpStatus } from '../../../src/utils/httpStatus';

/** The env-resolved product app origin (dev calculator / prod energy.organuz.com). */
export const APP = {
  origin: config.app.baseUrl.replace(/\/+$/, ''),
  env: config.env.name,
};

/**
 * The auth/RPC backend for the selected environment.
 *  - dev/test → the flamiingo RPC gateway (`config.devApi`), whose public app token is
 *    baked into the bundle.
 *  - prod → not carried in repo config; resolved from `FRAUD_AUTH_BACKEND` (else the
 *    prod admin origin) and confirmed at runtime by the reachability canary. The prod
 *    public app token, if needed, comes from `FRAUD_APP_TOKEN`.
 */
export const AUTH = {
  baseUrl: (
    process.env.FRAUD_AUTH_BACKEND ||
    (APP.env === 'prod' ? config.app.adminUrl : config.devApi.baseUrl)
  ).replace(/\/+$/, ''),
  /** Public app token baked into the bundle (dev). Empty on prod unless provided. */
  publicToken: APP.env === 'prod' ? (process.env.FRAUD_APP_TOKEN ?? '') : config.devApi.token,
};

/**
 * The RPC method the app calls to verify a phone OTP, used by the brute-force / magic-OTP
 * probes. The exact `call=` name isn't carried in repo config; override with
 * `FRAUD_OTP_VERIFY_CALL` once confirmed from the live network. When the resolved method
 * isn't recognised by the backend the OTP probes self-skip (contract unconfirmed) rather
 * than assert on a wrong route — see `isUnknownRoute`.
 */
export const OTP_VERIFY_CALL = process.env.FRAUD_OTP_VERIFY_CALL ?? '';

/**
 * Clearly-fabricated identities. None belong to a real account, so any login/verify
 * attempt against them can only FAIL — no SMS reaches a real user, no real data is read.
 */
export const FAKE = {
  /** Valid-format Israeli mobile in the reserved 050-000… range — registered to nobody. */
  phone: '+972500000000',
  /** Wrong OTP codes for the brute-force uniformity probe (all must be rejected). */
  wrongOtps: ['000000', '111111', '123456', '999999', '424242'] as const,
  /** The dev app's fixed convenience OTP. Accepting this on PROD would be a critical ATO. */
  devMagicOtp: '7777',
  /** A forged opaque session token belonging to no session. */
  forgedToken: '__qa_fraud_forged_session_token_do_not_use__',
};

/** Bound the brute-force probe — enough to prove wrong codes never authenticate, no flooding. */
export const MAX_OTP_ATTEMPTS = FAKE.wrongOtps.length;

/** Response keys/markers that would indicate a leaked secret in a response or document. */
export const SENSITIVE_MARKERS = [
  'service_role', 'private_key', 'secret_key', 'password', 'passwd',
  'aws_secret', 'BEGIN RSA PRIVATE KEY', 'BEGIN PRIVATE KEY',
];

/** Substrings that betray an internal stack trace / server internals leaking in an error. */
export const INTERNAL_LEAK_MARKERS = [
  'stack trace', 'at Object.', 'node_modules', 'traceback (most recent call last)',
  '/var/www', '/home/', 'sqlstate', 'syntax error at or near', 'pg_', 'mysql',
];

export const BACKEND_SKIP_REASON =
  'auth backend not confirmed reachable (unreachable or served an HTML block/challenge ' +
  'page to the runner) — env-gated skip, not a finding';

export const OTP_CONTRACT_SKIP_REASON =
  'OTP verify RPC method not confirmed for this env — set FRAUD_OTP_VERIFY_CALL to the ' +
  'live call name to activate the brute-force / magic-OTP probes';

/** Build a form-encoded RPC body in the gateway's `action=token&token=&call=` shape. */
export function rpcBody(call: string, extra: Record<string, string> = {}, token = AUTH.publicToken): string {
  return new URLSearchParams({ action: 'token', token, call, ...extra }).toString();
}

/** True when a response body looks like an HTML page (block/challenge/error) rather than an API reply. */
export function looksLikeHtml(contentType: string | undefined, body: string): boolean {
  if (/text\/html/i.test(contentType ?? '')) return true;
  return /^\s*<(?:!doctype|html)\b/i.test(body);
}

/**
 * True when the backend reply indicates the RPC route/method is unknown — so an OTP probe
 * should SKIP (its guessed method name is wrong for this env) rather than pass or fail.
 */
export function isUnknownRoute(status: number, body: string): boolean {
  if (status === HttpStatus.NOT_FOUND) return true;
  return /unknown (?:method|call|action)|method not found|no such (?:call|route)/i.test(body);
}

/**
 * Reachability canary for the auth backend. Returns a skip reason string when the gateway
 * is unreachable or answers with an HTML block/challenge page (a geo/bot block to the
 * runner); returns '' when it answers as a real API endpoint. Never mutates anything.
 */
export async function authBackendBlockReason(request: APIRequestContext): Promise<string> {
  try {
    const res = await request.post(AUTH.baseUrl + '/', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: rpcBody('__qa_fraud_canary__'),
      timeout: 15_000,
      failOnStatusCode: false,
    });
    const body = await res.text().catch(() => '');
    if (looksLikeHtml(res.headers()['content-type'], body)) return BACKEND_SKIP_REASON;
    return '';
  } catch {
    return BACKEND_SKIP_REASON;
  }
}

/** A response bearing a real per-user session token would mean the fake creds were honoured. */
export function grantsSession(body: string): boolean {
  // A successful auth reply carries a session/access token distinct from the public token.
  const m = body.match(/"(?:session_token|access_token|token|jwt|auth_token)"\s*:\s*"([^"]+)"/i);
  if (!m) return false;
  const granted = m[1];
  return granted.length > 0 && granted !== AUTH.publicToken;
}
