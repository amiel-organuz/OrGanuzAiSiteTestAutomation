/**
 * Offline demo of the QA MCP agent loop, wired entirely to in-memory stub
 * connectors. Run with:
 *
 *   npm run agent:demo
 *
 * It reads a seeded Azure DevOps suite, pulls seeded Sheets data, "executes"
 * each case through the stub Playwright runner, uploads evidence to the stub
 * OneDrive, writes results back, files bugs idempotently, re-runs the flaky
 * case once, and prints a run summary as JSON.
 *
 * Swap any Stub* connector for a real REST/MCP-backed implementation behind the
 * same interface and the orchestrator is unchanged.
 */
import { agentConfig } from '../config';
import {
  StubAzureDevOpsConnector,
  StubGoogleSheetsConnector,
  StubOneDriveConnector,
  StubPlaywrightRunner,
} from '../connectors';
import { Orchestrator } from '../Orchestrator';
import { demoDataRows, demoEnvironments, demoSuite } from './seed';

async function main(): Promise<void> {
  const ado = new StubAzureDevOpsConnector(demoSuite);
  const sheets = new StubGoogleSheetsConnector({ environments: demoEnvironments, rows: demoDataRows });
  const oneDrive = new StubOneDriveConnector();
  const runner = new StubPlaywrightRunner();

  const demoConfig = {
    ...agentConfig,
    requirements: {
      path: 'test-requirements-docs',
      source: 'onedrive' as const,
    },
  };

  const orchestrator = new Orchestrator({ ado, sheets, oneDrive, runner }, demoConfig);
  const summary = await orchestrator.run();

  console.log('\n=== RUN SUMMARY (JSON) ===');
  console.log(JSON.stringify(summary, null, 2));

  console.log('\n=== ENRICHED TEST CASES WITH ACCEPTANCE CRITERIA ===');
  for (const c of demoSuite.cases) {
    console.log(`\nTest Case ${c.id}: ${c.title}`);
    console.log(`Acceptance Criteria:`);
    for (const ac of c.acceptanceCriteria) {
      console.log(`  - [${ac.id}] ${ac.description}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
