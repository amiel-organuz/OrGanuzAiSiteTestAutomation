---
name: organuz-fraud-detection
description: Write, run, and debug the fraud / account-takeover (ATO) tests for the Organuz product app (tests/fraud/**) — the non-destructive, env-resolved (QA_TARGET_ENV dev/prod) checks that assert the product resists account takeover and abuse. Use when editing tests/fraud/**, the fraud target/support helpers, or adding fraud/ATO checks across dev & production.
---

# Organuz fraud detection & account takeover (`fraud` project)

Authorized, **non-destructive** fraud / account-takeover testing of the Organuz **product** app —
the calculator origin plus its auth/RPC backend — for the environment selected by `QA_TARGET_ENV`
(dev `dev1.app.organize.organuz.com` by default, prod `energy.organuz.com` on demand). It is the
sibling of the `security` project (which pentests the organuz.ai Supabase backend). **A failure is a
real fraud finding, not a flake to skip.**

- Files: `tests/fraud/account-takeover.spec.ts` (ATO-01..08), `tests/fraud/anti-fraud-controls.spec.ts`
  (FRAUD-01..06), `tests/fraud/support/target.ts` (targets, fabricated identities, canary, helpers).
- Project in `playwright.config.ts`: `name: 'fraud'`, `testMatch: tests/fraud/**`, browserless
  (`APIRequestContext`), `baseURL: config.app.baseUrl` (env-resolved). In the `parallel-tests.yml`
  matrix (runs on dev; prod runs on demand with `QA_TARGET_ENV=prod`).

## Run it

```bash
npx playwright test --project=fraud                 # dev (default)
QA_TARGET_ENV=prod npx playwright test --project=fraud   # production
```

## The two-tier certainty model

1. **App-origin checks** (transport/HTTPS+redirect, HSTS, clickjacking headers, CORS-with-credentials,
   secret & cookie hygiene, reflected-XSS) target `config.app.baseUrl`, which resolves **correctly on
   both dev and prod** — no backend contract needed. These always run.
2. **Auth-backend checks** (forged/empty-token rejection, injection→JSON-not-HTML, error non-leakage,
   OTP brute-force uniformity, backend CORS) target the resolved gateway (dev → `organuz.flamiingo.com`;
   prod → `FRAUD_AUTH_BACKEND` or the prod admin origin). They **self-skip via the reachability canary**
   (`authBackendBlockReason`) when the gateway is unreachable or serves an HTML block/challenge page to
   the runner — the same env-gated skip the `monitoring` suite uses. A genuine finding still fails.

## Non-destructive guarantees — keep these invariant

- Every identity is fabricated (`FAKE` in `target.ts`): a reserved-range phone registered to nobody,
  wrong OTP codes, a forged opaque token. Login/verify against them can only ever **fail**.
- The suite **NEVER triggers an OTP send** (a real SMS costs money and hits real users on prod). It
  exercises **verify-only** paths. Do not add a probe that requests/sends an OTP.
- No writes, no fuzzing volume, no service key. Bound any burst (see `MAX_OTP_ATTEMPTS`).

## Sanctioned skips & env splits (do not "fix" by making them always-run)

- **ATO-08** (dev magic OTP `7777` must not authenticate on prod) skips on **dev** (7777 is an
  intentional dev convenience — see `RegistrationFlows.ts`) and until `FRAUD_OTP_VERIFY_CALL` names the
  live verify RPC method.
- **FRAUD-05** (OTP brute-force uniformity) skips until `FRAUD_OTP_VERIFY_CALL` is set.
- **FRAUD-02** (cookie hygiene) skips when the SPA sets no cookies on the initial document.
- **ATO-02 (HSTS)** and **ATO-03 (clickjacking)** are **prod-strict / dev-informational**: they
  hard-fail on prod but only record a `known-gap` annotation on the gated dev app (which currently sends
  neither header). This keeps the default dev pipeline green while enforcing the control where real
  sessions live. See `hardeningGapNote`.

## Activating the OTP-semantics probes (ATO-08, FRAUD-05)

Capture the login network traffic once (the RPC POST body is `action=token&token=&call=<method>` — see
`TokenInterceptor.ts`), read the `call=` value of the OTP-verify request, then set
`FRAUD_OTP_VERIFY_CALL=<that method>` (env / CI secret). A wrong-method guess self-skips
(`isUnknownRoute`) rather than asserting on a bad route, so a wrong value is safe but inert.

## Overrides (env vars)

- `FRAUD_AUTH_BACKEND` — auth gateway origin (defaults: dev → flamiingo, prod → admin origin).
- `FRAUD_APP_TOKEN` — public app token for prod (dev uses `config.devApi.token`).
- `FRAUD_OTP_VERIFY_CALL` — the OTP-verify RPC method name; activates ATO-08 / FRAUD-05.

## Conventions

- Report layer is English (titles, Allure epic/feature/story, comments, assertion messages); see
  `organuz-hebrew-tests`.
- Use the shared `HttpStatus` constants (`src/utils/httpStatus.ts`) instead of bare status numbers —
  shared with `security` and `organuz-api`.
- Run `npx tsc --noEmit` before running tests. Adding/removing a fraud check → keep local ⇄ CI parity
  (`test-suite-parity`): the `fraud` shard is in the `parallel-tests.yml` matrix.
