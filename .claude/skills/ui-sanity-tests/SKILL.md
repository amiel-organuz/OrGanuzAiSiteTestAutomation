---
name: ui-sanity-tests
description: Marketing-site sanity tests (the chromium project, tests/ui/**) — visibility-only @other-smoke checks against prod www.organuz.ai driven by the HomePage/BlogPage objects. Use when adding, fixing, or reviewing tests under tests/ui/**.
---

# UI sanity tests — `chromium` project

**Scope:** `tests/ui/**` → prod marketing site `www.organuz.ai` (`baseURL: config.web.baseUrl`), default-filtered to `@other-smoke`. 12 tests today.

## Files
- `tests/ui/homepage/hero.spec.ts` (1), `navigation.spec.ts` (1), `sections.spec.ts` (5), `contact.spec.ts` (1)
- `tests/ui/content/homepage-content.spec.ts` (3), `blog.spec.ts` (1)
- Page objects: `src/pages/HomePage.ts`, `BlogPage.ts` (locators use `selfHeal(...)`, plus assertion helpers like `expectNavLinksVisible`, `expectAllAgentsVisible`, `expectAllUserTypeButtonsVisible`, `expectContactFormVisible`).

## Rules
- **Visibility only** — never submit the contact form or newsletter; that hits the real CRM. Assert fields are visible, don't `fill`+`submit`.
- **Tag `@other-smoke`** (plus `@ui`) on every test — the chromium project has `grep: /@other-smoke/`, so an untagged test silently doesn't run.
- Import `test`/`expect` from `src/fixtures`; use the `homePage`/`blogPage` fixtures and the `allureEpic/Feature/Story/Severity/Step` helpers.
- `homePage.navigate()` waits for the hero before asserting — call it in `beforeEach`.
- Prefer the page object's existing locators/helpers over new inline selectors (they carry `selfHeal` fallbacks).

## Run
```bash
npx playwright test --project=chromium
```

## Extend
Add a spec under `tests/ui/**`, reuse a HomePage/BlogPage helper (or add a `selfHeal`ed locator to the page object first), tag `@other-smoke @ui`, then bump the chromium count in CLAUDE.md **and** the `test-suite-parity` skill (same commit).
