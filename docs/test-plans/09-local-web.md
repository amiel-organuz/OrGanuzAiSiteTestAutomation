# Test Plan 9 — Local Web (Local-Only Marketing E2E)

| | |
|---|---|
| **Project** | `local-web` |
| **Specs** | `tests/local-web/**` (`*.local.spec.ts`) |
| **Target** | Marketing site — **prod** `https://www.organuz.ai` (real Chromium) |
| **Page objects / fixtures** | `HomeFlows` via `tests/ui/support/fixtures`; local guard in `tests/local-web/support.ts` |
| **Cases** | ~50 |
| **Skips** | **Whole group self-skips on CI** (`process.env.CI` set) — sanctioned local/CI divergence |
| **Skill** | none |

## Scope

A deeper, visibility-only sweep of the public marketing homepage than the
`chromium` UI sanity group (Plan 1). It drives a real Chromium browser against
production and asserts that each homepage section renders — hero and header
navigation, the audience selector and "Why Organuz" tabs, the "Meet Or" / agents
/ projects sections, the FAQ questions, and the contact-form fields. Every check
is **read-only**: nothing is filled or submitted, so no automation data reaches
the real CRM.

These specs are meant to run **only on a developer machine**. Each spec calls
`localOnly()` (from `tests/local-web/support.ts`), which registers a
`beforeEach` guard that `test.skip`s every test in the file when
`process.env.CI` is set. As a result the group runs (and passes) locally but is
**skipped on GitHub Actions**, and the `local-web` project is **not in the CI
matrix**. This is a sanctioned local/CI divergence — see the `test-suite-parity`
skill.

## Preconditions

- Public internet access to `www.organuz.ai`; no credentials required.
- Run locally (i.e. `CI` unset). On CI the whole group self-skips by design.
- The site is Hebrew / right-to-left (RTL), so some assertions match Hebrew
  strings (for example the hero contains "אור").

## Cases

Grouped by spec file (all tagged `@ui @local-only`, visibility-only):

| Spec | Covers |
|------|--------|
| `home-hero-nav.local.spec.ts` | Hero H1 + it contains "אור", hero subtitle, header CTA visible and its href targets the app, and each primary nav link (Why Organuz, Meet Or, Agents, Sample Projects, Knowledge Hub, FAQ) is visible |
| `home-audiences-why.local.spec.ts` | Each audience button (Private homes, Residential buildings, Businesses, Agriculture, Authorities, Market players) is visible; the "Why Organuz" heading and each of its tabs (Property owners, Solar companies, Authorities & corporations, Investors & financiers) is visible |
| `home-or-agents-projects.local.spec.ts` | "Meet Or" heading + "Talk to Or" link, the agents-section heading and each agent card (`AgentNames`), and the active-projects heading |
| `home-faq.local.spec.ts` | The FAQ section heading, plus each known FAQ question (`FaqQuestions`) rendered as an accordion button or plain text (tolerant locator) |
| `home-contact.local.spec.ts` | Each contact-form field (Full name, Email, Phone, Message, Submit) is visible — **never filled or submitted** |

Section rosters (`AgentNames`, `FaqQuestions`, nav links, audiences, tabs) come
from `tests/constants.ts`, so the exact per-file count tracks those lists; the
group totals ~50 cases.

## Run

```bash
# Local only — leave CI unset:
npx playwright test --project=local-web
```

## Notes

- The group is a **superset in depth** of Plan 1 (UI sanity). Plan 1 is the
  CI-safe `@other-smoke` subset; this group is the fuller local-only sweep.
- Keep it read-only against production — never fill or submit the contact form.
- If the group ever needs to run on CI, remove the `localOnly()` guard and add
  `local-web` to the CI matrix in lockstep (`test-suite-parity` skill); until
  then, its skip on CI is expected and must stay green.
