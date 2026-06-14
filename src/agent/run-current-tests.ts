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
import type { AcceptanceCriterion, DataRow, RunEnvironment, TestCase, TestSuite } from './types';

interface ProjectMapping {
  id: string;
  title: string;
  project: string;
  tags: string[];
  acceptanceCriterion: AcceptanceCriterion;
}

const environment: RunEnvironment = {
  name: agentConfig.run.environment,
  baseUrl: process.env.WEB_BASE_URL || 'https://www.organuz.ai',
};

const projectMappings: ProjectMapping[] = [
  {
    id: 'PW-API',
    title: 'Run API Playwright project',
    project: 'api',
    tags: ['@playwright', '@api'],
    acceptanceCriterion: { id: 'AC-API', description: 'API project exits successfully' },
  },
  {
    id: 'PW-CHROMIUM',
    title: 'Run Chromium UI Playwright project',
    project: 'chromium',
    tags: ['@playwright', '@ui'],
    acceptanceCriterion: { id: 'AC-UI', description: 'Chromium project exits successfully' },
  },
  {
    id: 'PW-AGENT',
    title: 'Run agent regression Playwright project',
    project: 'agent',
    tags: ['@playwright', '@agent'],
    acceptanceCriterion: { id: 'AC-AGENT', description: 'Agent regression project exits successfully' },
  },
];

const currentTestsSuite: TestSuite = {
  planId: agentConfig.azureDevOps.planId,
  suiteId: agentConfig.azureDevOps.suiteId,
  name: 'Current repository Playwright tests',
  cases: projectMappings.map(toTestCase),
};

const rows: DataRow[] = projectMappings.map(toDataRow);

function toTestCase(mapping: ProjectMapping): TestCase {
  return {
    id: mapping.id,
    title: mapping.title,
    steps: [`Run npx playwright test --project=${mapping.project}`],
    acceptanceCriteria: [mapping.acceptanceCriterion],
    tags: mapping.tags,
  };
}

function toDataRow(mapping: ProjectMapping): DataRow {
  return {
    caseId: mapping.id,
    environment: environment.name,
    inputs: { project: mapping.project },
    expected: { exitCode: '0' },
  };
}

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
