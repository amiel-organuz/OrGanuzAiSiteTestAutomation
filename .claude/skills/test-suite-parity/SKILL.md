---
name: test-suite-parity
description: Keep the Playwright suite identical locally and on GitHub Actions — the same projects, the same tests, the same green result. Use whenever adding/removing a test or Playwright project, editing playwright.config.ts, or touching .github/workflows/parallel-tests.yml.
---

# Local ⇄ GitHub Actions test parity

**Invariant:** a plain `npx playwright test` locally runs the *same* set of tests that GitHub Actions runs, and both must be all-green (no failures, no skips, no "did not run"). The two sources of truth are:

1. `playwright.config.ts` — the `projects[]` (each with its `testMatch` + default `grep`).
2. `.github/workflows/parallel-tests.yml` — the `tests` job `strategy.matrix.project`.

The matrix `project:` list MUST equal the *invokable* project names in `playwright.config.ts`. CI shards by project; locally they all run in one invocation. Same projects ⇒ same tests. (`product-setup` is the exception: it is a setup dependency of `product-authenticated`, not a standalone shard — running `--project=product-authenticated` pulls it in, so the matrix names `product-authenticated` and not `product-setup`.)

## Current suite (58 tests: 45 green + 13 credential-gated skips)

| Project | testMatch | Default filter | Tests | Needs |
|---|---|---|---|---|
| `chromium` | `tests/ui/**` | `@other-smoke` | 12 | none (prod `www.organuz.ai`, public marketing site) |
| `product` | `tests/product/**` (ignore `flows/**`) | — (all) | 31 | token-sanity (3) + public-app-sanity (5) open the dev calculator (`PRODUCT_PLATFORM_PASSWORD`, skip on dev outage); the matrix (13) + role (10) data-contracts need nothing |
| `product-setup` | `tests/product/support/auth.setup.ts` | — | 3 | per-role `<ROLE>_PHONE`/`_OTP_CODE`; **skips** each role without them (dependency of product-authenticated) |
| `product-authenticated` | `tests/product/flows/**` | — | 10 | a saved session per role from product-setup; **skips** the role otherwise |
| `organuz-api` | `tests/organuz-api/**` | `@other-smoke` | 1 | none (Supabase anon key baked in `config.json`) |
| `agent` | `tests/agent/**` | `@other-smoke` | 1 | none (pure stubs, no network/browser) |

Non-`product` projects intentionally run only their `@other-smoke`-tagged tests by default (see CLAUDE.md). The plain `product` project runs everything under `tests/product/**` except `flows/**` (those need saved sessions and run in `product-authenticated`).

**Sanctioned skips** (never failures): (1) `token-sanity` (3) skips when the live dev gateway is down and no UI token can be extracted — a token that IS observed but malformed still fails; (2) the live per-role specs (`product-setup` 3 + `product-authenticated` 10 = 13) skip when a role has no credential/saved session, so they are dormant until per-role secrets are added. Everything else must pass. Baseline with the dev gate but no role secrets: **45 passed, 13 skipped**.

## The rule when you change the suite

Any change that alters what a default run executes must be mirrored in BOTH files, in the same commit:

- **Add/remove a Playwright project** → update `playwright.config.ts` projects AND the workflow `matrix.project` list. (Deleting a project the matrix still names = CI fails on an unknown project.)
- **Add a spec needing a new secret/env** → add it to the workflow `tests` job `env:` (from `secrets.*`) AND document it in `.env.example`.
- **Add a project that drives a browser** → extend the "Install Chromium" step's `if:` (currently `chromium || product || product-authenticated`). `organuz-api`/`agent` need no browser.
- **Add a setup/dependency project** → name the *dependent* project in the matrix (its `dependencies` pull the setup in); do not shard the setup separately, or it runs twice (and would double-login).
- **Delete tests** → make sure nothing left behind (a stale `--grep @tag` job, a `dependencies:` project, a `testIgnore` entry) points at deleted files.

## Env / secret parity

The green baseline needs `PRODUCT_PLATFORM_PASSWORD` (the dev password-gate, so `token-sanity` can open the dev calculator and extract the UI token). The live per-role specs additionally consume `<ROLE>_PHONE`/`<ROLE>_OTP_CODE` for `CUSTOMER`/`CONSULTANT`/`COMPANY` — all optional; when unset those roles simply skip:

- **Locally:** in the gitignored `.env` (Restricted). Never commit it.
- **CI:** a GitHub repo secret `PRODUCT_PLATFORM_PASSWORD`, wired in the `tests` job `env:`. Without it the gate never opens, so token-sanity's `beforeAll` captures no token and its `beforeEach` **skips** the 3 tests (the dev app is treated as unavailable). The job stays green but coverage silently drops — so a missing/rotated secret shows up as 3 skips, not a failure.
- `QA_TARGET_ENV: dev` is set explicitly in the workflow (also the `config.json` default) so `product` targets `dev1.app.organize.organuz.com`.

## Verify parity

```bash
npx tsc --noEmit                      # must pass first
npx playwright test --reporter=line   # baseline: 45 passed, 13 skipped, 0 failed, exit 0 (a dev outage moves up to 8 product tests to skipped)
# per-project sanity (must match the matrix list):
for p in chromium organuz-api agent product product-authenticated; do
  echo -n "$p "; npx playwright test --project=$p --list 2>/dev/null | grep -c '›'
done
```

Cross-check that `strategy.matrix.project` in `parallel-tests.yml` lists exactly `chromium, organuz-api, agent, product` — no more (deleted project), no fewer (untested project).

## Gotchas

- **`token-sanity` depends on the live dev app.** It hits `dev1.app.organize.organuz.com` + `organuz.flamiingo.com`. When dev is down/rate-limited it fails (its `beforeEach` asserts a token was extracted — it does NOT skip). That's the one environmentally-fragile test in the green set; the other 14 (UI/API/agent smoke + matrix data-contract) have no live dependency.
- **CI reaches the public internet**, so dev/prod are reachable from GitHub-hosted runners — but the run is only as green as dev's uptime at that moment.
- **Don't reintroduce a default skip.** A test that `test.skip(...)`s on an environmental condition shows as "skipped", which violates the all-green invariant. Either make it run or delete it.
