---
name: flaky-test-triage
description: Detect and triage flaky Playwright tests — a test that FAILS AT LEAST ONCE across 3+ runs but does NOT fail every time. Tag it @KNOWN_FLAKY and file an idempotent bug in the system of record (Azure DevOps; Jira as the alternate). Use when a test intermittently fails, when confirming/quarantining flakiness, or when wiring flaky detection into a run.
---

# Flaky test triage (@KNOWN_FLAKY + file a bug)

## Definition (the rule this skill enforces)
Run a test **N ≥ 3** times. Classify by the outcomes:

| Failures across N≥3 runs | Verdict | Action |
| --- | --- | --- |
| **≥1 but not all** (non-deterministic) | **FLAKY** | tag `@KNOWN_FLAKY` + file/loop a bug |
| **all N fail** | real regression, NOT flaky | fix it, or `@KNOWN_BUGS` if triaged/known |
| **0 fail** | stable | do nothing |

"Fails at least once but passes at least once" is the whole test — an all-fail run is a real bug, not flakiness, and must not be quarantined as flaky.

## 1. Detect
Run the suspect test repeatedly (locally, retries are off — `playwright.config.ts` sets `retries: 0` locally, `2` on CI):

```bash
# N=3 (bump to 5–10 for low-frequency flakes). --workers=1 keeps runs comparable.
npx playwright test <path/to/file.spec.ts> -g "<test title>" --project=<project> --repeat-each=3 --workers=1
```
- **≥1 fail and ≥1 pass** → flaky → go to step 2.
- CI already surfaces this: with `retries: 2`, Playwright marks a test **flaky** (`RunSummary.totals.flaky`, `CaseResult.rerun`) when it fails then passes on retry. A flaky verdict in the CI Allure report / merged blob is the same signal — no need to re-run locally to confirm.
- Do NOT chase environment-gated skips (dev OTP cooldown, `AppUnavailableError`) — those are sanctioned skips (see `organuz-product-e2e`), not flakiness.

## 2. Tag `@KNOWN_FLAKY`
Add the tag to the test's tag array — same mechanism as the existing `@KNOWN_BUGS` tag, and a short comment naming the symptom + the filed bug id:

```ts
// @KNOWN_FLAKY(AB#12345): intermittently times out waiting for the map iframe on slow dev.
test('…', { tag: '@KNOWN_FLAKY' }, async ({ … }) => { … });
```
- Keep the test **running** by default (a quarantine that never runs rots). If it must be excluded from a green gate, filter with `--grep-invert "@KNOWN_FLAKY"` in that job only, and say so in the job — never silently.
- Combine with existing tags: `{ tag: ['@product', '@sanity', '@KNOWN_FLAKY'] }`.

## 3. File a bug (idempotent) — Azure DevOps is the system of record
The repo models the bug loop in `src/types/agent.types.ts` (`AzureDevOpsConnector`, `BugItem`). File through it so re-runs don't spawn duplicates:

```ts
// Idempotency FIRST — reuse an open bug for this case instead of filing a new one.
const existing = await ado.findOpenBug(caseId);
if (!existing) {
  await ado.fileBug({
    caseId,
    title: `[FLAKY] ${testTitle}`,
    reproSteps: `Ran \`--repeat-each=3\`; failed ${failCount}/3.\n\n${firstErrorMessage}`,
    environment: process.env.QA_TARGET_ENV ?? 'dev',
    evidence: artifacts, // trace/screenshot/video links (OneDrive in the modeled flow)
  });
}
```
- **ADO config** lives in the gitignored `.env` ("Azure DevOps target + blast-radius scoping", `.env.example`). Keep the connector read-only for reads and only widen to write for the file-bug step (`setReadOnly(false)`), per the design note in `agent.types.ts`.
- **Jira (alternate):** if the team tracks in Jira instead, file the equivalent issue there — same fields (title `[FLAKY] <test>`, repro = fail-rate + first error, environment, evidence links) and the same **find-open-before-create** idempotency guard keyed on the test/case id. Don't file to both.

## 4. Close the loop
When a flaky test is stabilized (a fix lands, or N≥10 runs are clean), remove the `@KNOWN_FLAKY` tag and resolve the bug. Leaving stale `@KNOWN_FLAKY` tags hides regressions the same way silent skips do.

## Related
`organuz-product-e2e` (which skips are sanctioned, not flakiness), `test-suite-parity` (keep the tag/behavior identical locally and on CI), and the `@KNOWN_BUGS` convention in `tests/product/en/public-app-en-sanity.spec.ts`.
