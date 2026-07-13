---
name: test-suite-parity
description: Keep the Playwright suite identical locally and on GitHub Actions — the same projects, the same tests, the same green result. Use whenever adding/removing a test or Playwright project, editing playwright.config.ts, or touching .github/workflows/parallel-tests.yml.
---

# Local ⇄ GitHub Actions test parity

**Invariant:** a plain `npx playwright test` locally runs the *same* set of tests that GitHub Actions runs, and both must be all-green (no failures, no skips, no "did not run"). The two sources of truth are:

1. `playwright.config.ts` — the `projects[]` (each with its `testMatch` + default `grep`).
2. `.github/workflows/parallel-tests.yml` — the `tests` job `strategy.matrix.project`.

The matrix `project:` list MUST equal the project names in `playwright.config.ts`. CI shards by project; locally they all run in one invocation. Same projects ⇒ same tests.

## Current suite (20 tests, all passing)

| Project | testMatch | Default filter | Tests | Needs |
|---|---|---|---|---|
| `chromium` | `tests/ui/**` | `@other-smoke` | 2 | none (prod `www.organuz.ai`, public) |
| `product` | `tests/product/**` | — (all) | 16 | dev reachable + `PRODUCT_PLATFORM_PASSWORD` (token-sanity opens dev calculator); matrix data-contract needs nothing |
| `organuz-api` | `tests/organuz-api/**` | `@other-smoke` | 1 | none (Supabase anon key baked in `config.json`) |
| `agent` | `tests/agent/**` | `@other-smoke` | 1 | none (pure stubs, no network/browser) |

Non-`product` projects intentionally run only their `@other-smoke` test by default (see CLAUDE.md). `product` has no grep filter, so every `tests/product/**` spec runs.

## The rule when you change the suite

Any change that alters what a default run executes must be mirrored in BOTH files, in the same commit:

- **Add/remove a Playwright project** → update `playwright.config.ts` projects AND the workflow `matrix.project` list. (Deleting a project the matrix still names = CI fails on an unknown project.)
- **Add a spec needing a new secret/env** → add it to the workflow `tests` job `env:` (from `secrets.*`) AND document it in `.env.example`.
- **Add a project that drives a browser** → extend the "Install Chromium" step's `if:` (`matrix.project == 'chromium' || matrix.project == 'product'`). `organuz-api`/`agent` need no browser.
- **Delete tests** → make sure nothing left behind (a stale `--grep @tag` job, a `dependencies:` project, a `testIgnore` entry) points at deleted files.

## Env / secret parity

The only secret the green suite needs is `PRODUCT_PLATFORM_PASSWORD` (the dev password-gate, so `token-sanity` can open the dev calculator and extract the UI token):

- **Locally:** in the gitignored `.env` (Restricted). Never commit it.
- **CI:** a GitHub repo secret `PRODUCT_PLATFORM_PASSWORD`, wired in the `tests` job `env:`. Without it the token extraction fails (the gate never opens), so token-sanity's `beforeAll` captures no token and its `beforeEach` assertion fails — CI goes red.
- `QA_TARGET_ENV: dev` is set explicitly in the workflow (also the `config.json` default) so `product` targets `dev1.app.organize.organuz.com`.

## Verify parity

```bash
npx tsc --noEmit                      # must pass first
npx playwright test --reporter=line   # expect 20 passed, 0 skipped, 0 failed, exit 0
# per-project sanity (must match the matrix list):
for p in chromium organuz-api agent product; do
  echo -n "$p "; npx playwright test --project=$p --list 2>/dev/null | grep -c '›'
done
```

Cross-check that `strategy.matrix.project` in `parallel-tests.yml` lists exactly `chromium, organuz-api, agent, product` — no more (deleted project), no fewer (untested project).

## Gotchas

- **`token-sanity` depends on the live dev app.** It hits `dev1.app.organize.organuz.com` + `organuz.flamiingo.com`. When dev is down/rate-limited it fails (its `beforeEach` asserts a token was extracted — it does NOT skip). That's the one environmentally-fragile test in the green set; the other 14 (UI/API/agent smoke + matrix data-contract) have no live dependency.
- **CI reaches the public internet**, so dev/prod are reachable from GitHub-hosted runners — but the run is only as green as dev's uptime at that moment.
- **Don't reintroduce a default skip.** A test that `test.skip(...)`s on an environmental condition shows as "skipped", which violates the all-green invariant. Either make it run or delete it.
