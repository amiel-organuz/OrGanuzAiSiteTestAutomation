/**
 * Account-takeover (ATO) checks for the Organuz product app.
 *
 * Authorized, non-destructive fraud testing of Organuz's OWN product surface for the
 * env selected by QA_TARGET_ENV (dev default, prod on demand). Two tiers:
 *  - APP-ORIGIN checks (transport, framing, CORS, secret hygiene) run on both dev and
 *    prod against the correctly-resolved app origin.
 *  - AUTH-BACKEND checks self-skip via a reachability canary when the gateway isn't
 *    confirmed (env-gated skip), and fail on a genuine finding.
 *
 * Every identity is fabricated (see support/target FAKE) so login/verify attempts can
 * only fail; the suite never triggers an OTP send. A FAILURE is a real ATO finding.
 *
 * Browserless (`APIRequestContext`). Tagged @fraud @account-takeover @security.
 */
import { test, expect } from '@playwright/test';
import { allureEpic, allureFeature, allureStory, allureSeverity } from '../../src/utils/allure';
import { HttpStatus } from '../../src/utils/httpStatus';
import {
  APP,
  AUTH,
  FAKE,
  OTP_VERIFY_CALL,
  SENSITIVE_MARKERS,
  OTP_CONTRACT_SKIP_REASON,
  rpcBody,
  authBackendBlockReason,
  isUnknownRoute,
  grantsSession,
} from './support/target';

test.describe('Account takeover (Organuz product app)', { tag: ['@fraud', '@account-takeover', '@security'] }, () => {
  test.beforeEach(async () => {
    await allureEpic('Fraud & account takeover');
    await allureFeature('Account takeover');
  });

  // ---- App-origin (env-portable: holds on both dev and prod) -----------------
  test('ATO-01 the app origin is served over HTTPS and redirects HTTP → HTTPS', async ({ request }) => {
    await allureStory('transport is encrypted');
    await allureSeverity('critical');
    expect(APP.origin, 'app origin must be https').toMatch(/^https:\/\//i);

    const httpUrl = APP.origin.replace(/^https:/i, 'http:');
    const res = await request.get(httpUrl, { maxRedirects: 0, failOnStatusCode: false }).catch(() => null);
    if (res) {
      const status = res.status();
      // Either an upgrade redirect to https, or the plain-HTTP endpoint refuses to serve.
      if (HttpStatus.isRedirect(status)) {
        expect(res.headers()['location'] ?? '', 'HTTP must redirect to HTTPS').toMatch(/^https:/i);
      } else {
        expect(status, 'plain HTTP must not serve a 2xx page').not.toBeLessThan(HttpStatus.CLIENT_ERROR_MIN);
      }
    }
  });

  test('ATO-02 the app origin sends HSTS (Strict-Transport-Security)', async ({ request }) => {
    await allureStory('HSTS prevents downgrade / session interception');
    await allureSeverity('normal');
    const res = await request.get(APP.origin + '/', { failOnStatusCode: false });
    expect(res.headers()['strict-transport-security'] ?? '', 'HSTS header must be present').toMatch(/max-age=\d+/i);
  });

  test('ATO-03 the app cannot be framed by another origin (clickjacking → takeover)', async ({ request }) => {
    await allureStory('clickjacking defense');
    await allureSeverity('normal');
    const res = await request.get(APP.origin + '/', { failOnStatusCode: false });
    const xfo = (res.headers()['x-frame-options'] ?? '').toLowerCase();
    const csp = (res.headers()['content-security-policy'] ?? '').toLowerCase();
    const framingBlocked = /deny|sameorigin/.test(xfo) || /frame-ancestors/.test(csp);
    expect(framingBlocked, 'app must send X-Frame-Options or CSP frame-ancestors').toBeTruthy();
  });

  test('ATO-04 the app origin does not reflect an arbitrary Origin with credentials (CSRF token theft)', async ({ request }) => {
    await allureStory('CORS credential leak');
    await allureSeverity('critical');
    const evil = 'https://evil.attacker.example';
    const res = await request.fetch(APP.origin + '/', {
      method: 'OPTIONS',
      headers: {
        Origin: evil,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization',
      },
      failOnStatusCode: false,
    });
    const allowOrigin = res.headers()['access-control-allow-origin'] ?? '';
    const allowCreds = (res.headers()['access-control-allow-credentials'] ?? '').toLowerCase();
    const reflectsEvilWithCreds = (allowOrigin === evil || allowOrigin === '*') && allowCreds === 'true';
    expect(reflectsEvilWithCreds, 'must not allow an attacker Origin together with credentials').toBeFalsy();
  });

  test('ATO-05 the initial document leaks no secrets beyond the public app token', async ({ request }) => {
    await allureStory('no secret leakage in the bundle');
    await allureSeverity('critical');
    const res = await request.get(APP.origin + '/', { failOnStatusCode: false });
    const body = (await res.text().catch(() => '')).toLowerCase();
    for (const marker of SENSITIVE_MARKERS) {
      expect(body, `the served document must not contain "${marker}"`).not.toContain(marker.toLowerCase());
    }
  });

  // ---- Auth backend (guarded by the reachability canary) ---------------------
  test('ATO-06 a forged session token is rejected — no authenticated data returned', async ({ request }) => {
    await allureStory('forged token rejected');
    await allureSeverity('blocker');
    const block = await authBackendBlockReason(request);
    test.skip(!!block, block);

    const res = await request.post(AUTH.baseUrl + '/', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: rpcBody('__qa_fraud_probe__', {}, FAKE.forgedToken),
      failOnStatusCode: false,
    });
    const body = await res.text().catch(() => '');
    expect(grantsSession(body), 'a forged token must not be honoured with a session').toBeFalsy();
  });

  test('ATO-07 an RPC call with no token is not honoured (auth is required)', async ({ request }) => {
    await allureStory('auth required');
    await allureSeverity('critical');
    const block = await authBackendBlockReason(request);
    test.skip(!!block, block);

    const res = await request.post(AUTH.baseUrl + '/', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: rpcBody('__qa_fraud_probe__', {}, ''),
      failOnStatusCode: false,
    });
    const body = await res.text().catch(() => '');
    expect(grantsSession(body), 'an empty token must not yield a session').toBeFalsy();
  });

  test('ATO-08 the dev fixed OTP (7777) does NOT authenticate a fabricated phone on prod', async ({ request }) => {
    await allureStory('dev magic OTP must not work in production');
    await allureSeverity('blocker');
    // On dev the fixed OTP 7777 is an intentional convenience — asserting it fails there
    // would be wrong. This probe is meaningful only against non-dev environments.
    test.skip(APP.env === 'dev', 'dev intentionally accepts the fixed OTP 7777; probe applies to prod');
    test.skip(!OTP_VERIFY_CALL, OTP_CONTRACT_SKIP_REASON);
    const block = await authBackendBlockReason(request);
    test.skip(!!block, block);

    const res = await request.post(AUTH.baseUrl + '/', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: rpcBody(OTP_VERIFY_CALL, { phone: FAKE.phone, code: FAKE.devMagicOtp }),
      failOnStatusCode: false,
    });
    const body = await res.text().catch(() => '');
    test.skip(isUnknownRoute(res.status(), body), OTP_CONTRACT_SKIP_REASON);
    expect(grantsSession(body), 'the dev magic OTP must never authenticate on production').toBeFalsy();
  });
});
