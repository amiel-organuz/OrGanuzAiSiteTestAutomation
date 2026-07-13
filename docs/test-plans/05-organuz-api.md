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

Contract-level checks against the Organuz Supabase/PostgREST backend using the
public anon key. The default suite asserts the `projects` REST resource honors
its schema contract. No writes, no privileged access — RLS keeps the anon key
read-only.

## Preconditions

- Public internet access to the Supabase host; anon key from `config.json`.

## Cases

| ID | Case | Asserts | Allure | Tags |
|----|------|---------|--------|------|
| API-01 | GET /rest/v1/projects honors the projects schema contract | Response rows conform to the expected `projects` schema/shape | Epic: Organuz API · Feature: Projects contract · Story: projects resource schema | `@organuz-api @contract @other-smoke` |

## Run

```bash
npx playwright test --project=organuz-api
```

## Notes

- Default-filtered to `@other-smoke`; additional `@organuz-api`/`@contract`
  specs (edge-function preflights, RLS checks) only enter the default suite when
  tagged `@other-smoke`. Adding one changes the documented count (1) — update
  `CLAUDE.md` and the parity skill.
- Keep the anon key public/read-only; never introduce writes or a service key here.
