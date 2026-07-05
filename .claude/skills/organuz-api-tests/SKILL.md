---
name: organuz-api-tests
description: Write or debug contract/API tests against the Organuz backend (Supabase / PostgREST) — the projects REST resource and edge functions. Use when working on tests/organuz-api/** or the OrganuzApi client/fixture.
---

# Organuz backend API tests

Organuz.ai is a Vite SPA backed by **Supabase / PostgREST** at `https://yrvgdswzbinmdyzxzblp.supabase.co` (discovered by grepping the site JS bundle). Tests: `tests/organuz-api/**` (Playwright project `organuz-api`, `baseURL = config.organuzApi.baseUrl`). Client: `src/api/OrganuzApi.ts` + the `organuzApi` fixture (`src/fixtures/index.ts`). Types: `src/types/organuz.types.ts`.

## Auth
Supabase REST needs both `apikey:` and `Authorization: Bearer` headers with the **public anon key** (role `anon`, baked into the client bundle — safe for read-only tests). Stored in `config.json → organuzApi.anonKey` (env override `ORGANUZ_API_ANON_KEY`). The `organuzApi` fixture (an `ApiClient`) sets these; the built-in `request` fixture carries NO key — use it for the 401 no-auth and OPTIONS preflight cases.

## Confirmed contracts (assert these)
- `GET /rest/v1/projects?select=*` + key → **200**, JSON array of `Project` rows (bilingual he/en fields, numeric `solar_capacity_kw`/`storage_capacity_kwh`/`roi_years`, `ai_capabilities` string[], uuid `id`, timestamps). Schema + `PROJECT_REQUIRED_FIELDS` in `src/types/organuz.types.ts`.
- No apikey → **401** · unknown table → **404** · invalid column → **400** · anon `POST` insert → **401** (RLS makes anon read-only).
- PostgREST features: `select=` projection, `order=col.desc`, `limit=`, `Prefer: count=exact` → `Content-Range: 0-N/total`, single-object via `Accept: application/vnd.pgrst.object+json`, filter `id=eq.<uuid>` (empty result `[]` for no match).
- Edge functions `send-contact-email`, `send-newsletter-subscription` at `/functions/v1/<name>`: assert only the **OPTIONS CORS preflight** (200) to prove deployment. NEVER POST them — that sends real email / creates a subscription.

## Suites
`contracts/` (schema/type/bilingual), `resources/` (query behaviours), `security/` (auth/RLS/negative), `functions/` (CORS preflight). Use the shared `test`/`expect` from `src/fixtures` + allure helpers + `@organuz-api` tags. Run: `npx playwright test --project=organuz-api`.

## Gotchas
- When zero rows match a status, that metric/series is simply absent — use `... or vector(0)` style tolerance or assert on presence, not a hardcoded count (project count was 5, but don't hardcode).
