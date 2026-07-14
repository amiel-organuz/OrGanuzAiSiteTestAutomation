# Test Plan 5 — Organuz API Contracts (Supabase / PostgREST)

| | |
|---|---|
| **Project** | `organuz-api` |
| **Specs** | `tests/organuz-api/contracts/projects-contract.spec.ts` |
| **Default filter** | `@other-smoke` |
| **Target** | Organuz Supabase backend — `/rest/v1/projects`, edge functions (public anon key) |
| **Client** | `src/api` (`OrganuzApi`) |
| **Cases** | 1 |
| **Skips** | None — anon key baked into `config.json` |
| **Skill** | `organuz-api-tests` |

## Scope

Contract-level checks against the Organuz backend, which is built on Supabase
and exposes its tables through PostgREST (a REST API generated from the
database). The tests authenticate with the public anon key — the read-only
anonymous key that ships in the client. In the default suite, one test asserts
that the `projects` REST resource honors its schema contract. There are no
writes and no privileged access: row-level security (RLS) keeps the anon key
read-only.

## Preconditions

- Public internet access to the Supabase host, plus the anon key from
  `config.json`.

## Cases

| ID | Case | Asserts | Allure | Tags |
|----|------|---------|--------|------|
| API-01 | GET /rest/v1/projects honors the projects schema contract | Response rows conform to the expected `projects` schema/shape | Epic: Organuz API · Feature: Projects contract · Story: projects resource schema | `@organuz-api @contract @other-smoke` |

## Run

```bash
npx playwright test --project=organuz-api
```

## Notes

- The group is filtered to the `@other-smoke` tag by default. Additional
  `@organuz-api` or `@contract` specs (such as edge-function preflights or RLS
  checks) only enter the default suite once they are tagged `@other-smoke`.
  Adding one changes the documented count (1) — update `CLAUDE.md` and the
  parity skill.
- Keep the anon key public and read-only. Never introduce writes or a service
  key here.
