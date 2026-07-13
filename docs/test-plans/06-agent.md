# Test Plan 6 — QA Agent (Orchestrator + Test-Plan Generator)

| | |
|---|---|
| **Project** | `agent` |
| **Specs** | `tests/agent/orchestrator/orchestrator.spec.ts`, `tests/agent/test-plan/test-plan-agent.spec.ts` |
| **Default filter** | `@other-smoke` |
| **Target** | **Offline** — pure stubs, no network or browser |
| **Code under test** | `src/agent/**` (`Orchestrator`, `TestPlanAgent`, connectors) |
| **Cases** | 2 |
| **Skips** | None — deterministic stubs |

## Scope

Unit-level regression of the QA agent, run entirely against in-memory stubs so
it needs no network or browser. Two capabilities are covered:

1. **Orchestrator** — the run loop that reads a plan, executes cases, isolates a
   crashing runner, and writes results back idempotently.
2. **TestPlanAgent** — the URL→plan generator that explores a page through the
   Playwright MCP (`PageExplorer`) and synthesises a `TestSuite`.

## Preconditions

- None beyond a typecheck. All connectors are stubs / fakes.

## Cases

### `orchestrator.spec.ts` — "QA agent orchestrator"

| ID | Case | Asserts | Tags |
|----|------|---------|------|
| AGT-01 | Marks runner crashes as blocked and continues running the suite | A thrown runner error isolates that case as `blocked`, the next case still runs, an error-log artifact is attached, and results are reported (`blocked`, `passed`) | `@other-smoke` |

### `test-plan-agent.spec.ts` — "TestPlanAgent"

| ID | Case | Asserts | Tags |
|----|------|---------|------|
| AGT-02 | Generates a plan from a URL via the Playwright MCP explorer | The input URL reaches the MCP `navigate` call; ids/name derive from host + page title; every case is `@generated`; a page-load case, a headings case, one de-duped case per nav link, and a form case are produced (fields + submit picked up) | `@other-smoke` |

## Run

```bash
npx playwright test --project=agent
# Try the generator against any URL (offline stub explorer):
npm run agent:plan -- https://www.organuz.ai
```

## Notes

- Both cases are `@other-smoke` so both run in the default suite — the `agent`
  project count is **2**. Adding/removing an `@other-smoke` agent test changes
  that count; update `CLAUDE.md`, the parity skill, and `Readme.md`.
- `TestPlanAgent` emits the same `TestSuite` shape the `Orchestrator` consumes,
  so a generated plan can flow straight into the run loop (see `src/agent/README.md`).
