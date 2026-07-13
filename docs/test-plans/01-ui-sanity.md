# Test Plan 1 — UI Sanity (Marketing Site)

| | |
|---|---|
| **Project** | `chromium` |
| **Specs** | `tests/ui/**` |
| **Default filter** | `@other-smoke` |
| **Target** | Marketing site — **prod** `https://www.organuz.ai` |
| **Page objects** | `src/pages` (`HomePage`, `BlogPage`) |
| **Cases** | 12 |
| **Skips** | None — this group is always expected to pass |
| **Skill** | `ui-sanity-tests` |

## Scope

Visibility-only sanity of the public marketing site: the homepage renders its
hero, primary navigation, the six-agent roster, projects/FAQ sections, the
contact form, and the blog index. These are read-only assertions against
production — no forms are submitted, no data is written. They confirm the
marketing site is up and its key sections are present after a deploy.

## Preconditions

- Public internet access to `www.organuz.ai` (no credentials).
- Hebrew (RTL) content — some assertions match Hebrew strings (e.g. hero mentions "אור").

## Cases

| ID | Case | Asserts | Tags |
|----|------|---------|------|
| UI-01 | Hero heading is visible and mentions "אור" | Hero `h1` renders and contains the brand term | `@ui @other-smoke` |
| UI-02 | Hero subtitle is visible | Hero subtitle text is present | `@ui @other-smoke` |
| UI-03 | Hero user-type selector buttons are visible | The audience-selector buttons render in the hero | `@ui @other-smoke` |
| UI-04 | Primary navigation links are visible | Header primary nav links render | `@ui @other-smoke` |
| UI-05 | Header CTA link is visible and points to the app | Header CTA is present and its href targets the product app | `@ui @other-smoke` |
| UI-06 | "Why Organuz" section is visible | Section heading renders | `@ui @other-smoke` |
| UI-07 | "Meet Or" section and its CTA are visible | Section heading + CTA render | `@ui @other-smoke` |
| UI-08 | All six AI agents are showcased | The agent roster shows all six agents | `@ui @other-smoke` |
| UI-09 | Projects showcase section is visible | Projects section heading renders | `@ui @other-smoke` |
| UI-10 | FAQ section shows the first question | FAQ section heading + first question render | `@ui @other-smoke` |
| UI-11 | Contact form exposes all of its fields | Every contact-form field is present (not submitted) | `@ui @other-smoke` |
| UI-12 | Blog index loads with at least one article | Blog index renders ≥ 1 article | `@ui @other-smoke` |

## Run

```bash
npx playwright test --project=chromium
```

## Notes

- Default-filtered to `@other-smoke`; other `@ui` tests (if added) don't run in
  the default suite unless tagged. Adding/removing an `@other-smoke` UI test
  changes the documented count (12) — update `CLAUDE.md` and the parity skill.
- Never submit the contact form or perform writes — this runs against production.
