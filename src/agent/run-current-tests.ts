/**
 * Runs the repository's current Playwright projects through the QA agent
 * orchestrator. This keeps the ADO/Sheets/OneDrive sides stubbed, but swaps the
 * execution engine to the real Playwright CLI runner.
 */
import { agentConfig } from './config';
import {
  CliPlaywrightRunner,
  StubAzureDevOpsConnector,
  StubGoogleSheetsConnector,
  StubOneDriveConnector,
} from './connectors';
import { Orchestrator } from './Orchestrator';
import type { DataRow, RunEnvironment, TestSuite } from './types';

const environment: RunEnvironment = {
  name: agentConfig.run.environment,
  baseUrl: process.env.WEB_BASE_URL || 'https://www.organuz.ai',
};

const currentTestsSuite: TestSuite = {
  planId: agentConfig.azureDevOps.planId,
  suiteId: agentConfig.azureDevOps.suiteId,
  name: 'Current repository Playwright tests',
  cases: [
    {
      id: 'PW-API',
      title: 'Run API Playwright project',
      steps: ['Run npx playwright test --project=api'],
      acceptanceCriteria: [{ id: 'AC-API', description: 'API project exits successfully' }],
      tags: ['@playwright', '@api'],
    },
    {
      id: 'PW-CHROMIUM',
      title: 'Run Chromium UI Playwright project',
      steps: ['Run npx playwright test --project=chromium'],
      acceptanceCriteria: [{ id: 'AC-UI', description: 'Chromium project exits successfully' }],
      tags: ['@playwright', '@ui'],
    },
    {
      id: 'PW-AGENT',
      title: 'Run agent regression Playwright project',
      steps: ['Run npx playwright test --project=agent'],
      acceptanceCriteria: [{ id: 'AC-AGENT', description: 'Agent regression project exits successfully' }],
      tags: ['@playwright', '@agent'],
    },
  ],
};

const rows: DataRow[] = [
  {
    caseId: 'PW-API',
    environment: environment.name,
    inputs: { project: 'api' },
    expected: { exitCode: '0' },
  },
  {
    caseId: 'PW-CHROMIUM',
    environment: environment.name,
    inputs: { project: 'chromium' },
    expected: { exitCode: '0' },
  },
  {
    caseId: 'PW-AGENT',
    environment: environment.name,
    inputs: { project: 'agent' },
    expected: { exitCode: '0' },
  },
];

async function main(): Promise<void> {
  const ado = new StubAzureDevOpsConnector(currentTestsSuite);
  const sheets = new StubGoogleSheetsConnector({ environments: [environment], rows });
  const oneDrive = new StubOneDriveConnector();
  const runner = new CliPlaywrightRunner();

  const orchestrator = new Orchestrator({ ado, sheets, oneDrive, runner }, agentConfig);
  const summary = await orchestrator.run();

  console.log('\n=== CURRENT TESTS SUMMARY (JSON) ===');
  console.log(JSON.stringify(summary, null, 2));

  if (summary.totals.failed > 0 || summary.totals.blocked > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
