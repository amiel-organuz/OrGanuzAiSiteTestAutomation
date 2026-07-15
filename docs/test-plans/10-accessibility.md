# Test Plan 10 — Marketing Accessibility

| | |
|---|---|
| **Project** | `accessibility` |
| **Specs** | `tests/accessibility/homepage-accessibility.spec.ts` |
| **Target** | Public Hebrew marketing homepage (`https://www.organuz.ai`) |
| **Client** | Chromium + `@axe-core/playwright` |
| **Cases** | 30 |
| **CI** | Blocking matrix shard in `parallel-tests.yml` |

## Scope

Thirty top-priority automated accessibility checks cover WCAG 2.0/2.1 A and AA
rules, language and RTL metadata, zoom support, heading structure, landmark
presence, unique IDs, image alternatives, iframe titles, natural focus order,
safe new-tab links, form semantics, and valid ARIA references.

The production page currently has five known critical/serious Axe rule groups.
Each has a non-growing affected-node budget: improvements stay green, while a
new rule or additional affected node fails CI. Delete a budget as soon as its
website issue is fixed; do not raise budgets to accommodate regressions.

## Run

```bash
npx playwright test --project=accessibility
```
