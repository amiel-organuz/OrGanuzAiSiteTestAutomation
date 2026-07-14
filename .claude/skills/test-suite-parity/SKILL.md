---
name: test-suite-parity
description: Keep the Playwright suite identical locally and on GitHub Actions — the same projects, the same tests, the same green result. Use whenever adding/removing a test or Playwright project, editing playwright.config.ts, or touching .github/workflows/parallel-tests.yml.
---

# Local ⇄ GitHub Actions test parity

**Invariant:** a plain `npx playwright test` locally runs the *same* set of tests that GitHub Actions runs, and both must be all-green (no failures, no skips, no "did not run"). The two sources of truth are:

1. `playwright.config.ts` — the `projects[]` (each with its `testMatch` + default `grep`).
2. `.github/workflows/parallel-tests.yml` — the `tests` job `strategy.matrix.project`.

The matrix `project:` list MUST equal the *invokable* project names in `playwright.config.ts`. CI shards by project; locally they all run in one invocation. Same projects ⇒ same tests. (`product-setup` is the exception: it is a setup dependency of `product-authenticated`, not a standalone shard — running `--project=product-authenticated` pulls it in, so the matrix names `product-authenticated` and not `product-setup`.)

## Current suite (3 active tests; the `chromium` + product projects are currently DISABLED)

> **State change:** `chromium` and the three product projects (`product`, `product-setup`, `product-authenticated`) are **commented out** in `playwright.config.ts` — the spec files are kept; re-enable by uncommenting the project blocks (and re-adding `devices` to the `@playwright/test` import + uncommenting `productUse`). So a plain `npx playwright test` currently runs **3 tests**: `agent` (2) + `organuz-api` (1), all green. With `MONITORING_ENABLED=true` the opt-in `monitoring` project adds 50, for **53** total.
>
> **Parity is currently held by trimming both files.** `.github/workflows/parallel-tests.yml` has `strategy.matrix.project` trimmed to `organuz-api, agent` (the `chromium` / `product` / `product-authenticated` entries are commented out there), matching the active projects in `playwright.config.ts`. So local and CI both run the same 3 tests. **Re-enable the disabled projects in BOTH files in the same change** — uncommenting the config blocks without uncommenting the matrix entries (or vice-versa) re-breaks parity.

| Project | testMatch | Default filter | Tests | Status / needs |
|---|---|---|---|---|
| `organuz-api` | `tests/organuz-api/**` | `@other-smoke` | 1 | **active** — none (Supabase anon key baked in `config.json`) |
| `agent` | `tests/agent/**` | `@other-smoke` | 2 | **active** — none (pure stubs): orchestrator run-loop + `TestPlanAgent` (URL → MCP exploration → plan) |
| `monitoring` *(opt-in, not in the default count)* | `tests/monitoring/**` | — | 50 | **active only when `MONITORING_ENABLED=true`**; live Govmap + Ofek. Now **skips** (not fails) when the runner is served an HTML block/challenge page (geo/bot block) via `tests/monitoring/support/availability.ts`; a real break still fails. Runs on cron in `monitoring.yml` **and** as a **non-blocking** `monitoring` job in `parallel-tests.yml` (`continue-on-error: true`) — never a matrix shard, so it can't red the gate |
| `chromium` | `tests/ui/**` | `@other-smoke` | (12) | **DISABLED** (commented in config) — marketing `www.organuz.ai`, public |
| `product` | `tests/product/**` (ignore `flows/**`) | — (all) | (31) | **DISABLED** (commented in config) — product app `*.organuz.com` |
| `product-setup` | `tests/product/support/auth.setup.ts` | — | (3) | **DISABLED** — per-role login → `storageState` (dependency of `product-authenticated`) |
| `product-authenticated` | `tests/product/flows/**` | — | (10) | **DISABLED** — resumes saved per-role sessions |

Non-`product` active projects run only their `@other-smoke`-tagged tests by default (see CLAUDE.md). Parenthesised counts are what each disabled project ran **when enabled**.

**When re-enabled**, the former baseline was **59 tests: 46 green + 13 credential-gated skips**, with these sanctioned skips (never failures): (1) `token-sanity` (3) skips when the live dev gateway is down and no UI token can be extracted — a token that IS observed but malformed still fails; (2) the live per-role specs (`product-setup` 3 + `product-authenticated` 10 = 13) skip when a role has no credential/saved session. With the current active-only set, the baseline is simply **3 passed, 0 skipped**.

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
- **Slack (both workflows):** `SLACK_WEBHOOK_URL` and `SLACK_WEBHOOK_BOT_URL` repo secrets post the report/alert links from `parallel-tests.yml` and `monitoring.yml`. Both are optional and non-fatal (an unset or failing webhook is skipped) and are **not** part of the green test baseline.
- `QA_TARGET_ENV: dev` is set explicitly in the workflow (also the `config.json` default) so `product` targets `dev1.app.organize.organuz.com`.

## Verify parity

```bash
npx tsc --noEmit                      # must pass first
npx playwright test --reporter=line   # current baseline (chromium + product disabled): 3 passed, 0 skipped, 0 failed
# per-project sanity — active projects only while chromium/product are disabled:
for p in organuz-api agent; do
  echo -n "$p "; npx playwright test --project=$p --list 2>/dev/null | grep -c '›'
done
# When re-enabled the baseline is 46 passed, 13 skipped (a dev outage moves up to 8 product tests to skipped),
# and the loop should also cover: chromium product product-authenticated.
```

Cross-check `strategy.matrix.project` in `parallel-tests.yml` against the **currently active** invokable projects. Right now both are trimmed to `organuz-api, agent` (the `chromium` / `product` / `product-authenticated` matrix entries are commented out, matching the disabled config blocks) — in sync. The fully-enabled matrix is `chromium, organuz-api, agent, product`; when you re-enable the config projects, uncomment the matching matrix entries in the same change.

## Gotchas

- **`token-sanity` depends on the live dev app.** It hits `dev1.app.organize.organuz.com` + `organuz.flamiingo.com`. When dev is down/rate-limited it fails (its `beforeEach` asserts a token was extracted — it does NOT skip). That's the one environmentally-fragile test in the green set; the other 14 (UI/API/agent smoke + matrix data-contract) have no live dependency.
- **CI reaches the public internet**, so dev/prod are reachable from GitHub-hosted runners — but the run is only as green as dev's uptime at that moment.
- **Don't reintroduce a default skip.** A test that `test.skip(...)`s on an environmental condition shows as "skipped", which violates the all-green invariant. Either make it run or delete it.
