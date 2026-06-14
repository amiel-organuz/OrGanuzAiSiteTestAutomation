import { expect, test } from '@playwright/test';
import { Orchestrator } from '../../src/agent/Orchestrator';
import { agentConfig } from '../../src/agent/config';
import {
  StubAzureDevOpsConnector,
  StubGoogleSheetsConnector,
  StubOneDriveConnector,
} from '../../src/agent/connectors';
import type {
  AzureDevOpsConnector,
  PlaywrightRunner,
} from '../../src/agent/connectors';
import type {
  BugItem,
  CaseResult,
  CaseStatus,
  DataRow,
  ExecutionResult,
  RunEnvironment,
  TestCase,
  TestSuite,
} from '../../src/agent/types';

const env: RunEnvironment = { name: 'staging', baseUrl: 'https://staging.example.test' };

const suite: TestSuite = {
  planId: 'PLAN-TEST',
  suiteId: 'SUITE-TEST',
  name: 'Orchestrator regression suite',
  cases: [
    {
      id: 'TC-CRASH',
      title: 'Runner crash is isolated',
      steps: ['Execute crashing flow'],
      acceptanceCriteria: [],
      tags: ['@smoke'],
    },
    {
      id: 'TC-PASS',
      title: 'Next case still runs',
      steps: ['Execute healthy flow'],
      acceptanceCriteria: [],
      tags: ['@smoke'],
    },
  ],
};

const rows: DataRow[] = suite.cases.map((c) => ({
  caseId: c.id,
  environment: env.name,
  inputs: {},
  expected: { state: 'ok' },
}));

function testConfig() {
  return {
    ...agentConfig,
    azureDevOps: {
      ...agentConfig.azureDevOps,
      planId: suite.planId,
      suiteId: suite.suiteId,
      startReadOnly: true,
    },
    run: {
      ...agentConfig.run,
      environment: env.name,
      fileBugs: true,
      maxCases: 0,
    },
    evidence: {
      ...agentConfig.evidence,
      folderPrefix: 'agent-test-runs',
    },
  };
}

class CrashThenPassRunner implements PlaywrightRunner {
  readonly executed: string[] = [];

  async execute(testCase: TestCase, _dataRow: DataRow | undefined, _env: RunEnvironment): Promise<ExecutionResult> {
    this.executed.push(testCase.id);
    if (testCase.id === 'TC-CRASH') {
      throw new Error('browser disconnected');
    }
    return {
      caseId: testCase.id,
      status: 'passed',
      durationMs: 25,
      steps: [{ description: 'assert state', expected: 'ok', actual: 'ok', passed: true }],
      localArtifacts: [{ kind: 'trace', name: `case-${testCase.id}.zip`, path: `/tmp/${testCase.id}.zip` }],
    };
  }
}

class FailingReportAzureDevOpsConnector implements AzureDevOpsConnector {
  readonly scopeLog: boolean[] = [];
  readonly reported: Array<{ caseId: string; status: CaseStatus; comment?: string }> = [];

  setReadOnly(readOnly: boolean): void {
    this.scopeLog.push(readOnly);
  }

  async getSuite(_planId: string, _suiteId: string): Promise<TestSuite> {
    return { ...suite, cases: [suite.cases[1]] };
  }

  async reportCaseResult(caseId: string, status: CaseStatus, comment?: string): Promise<void> {
    this.reported.push({ caseId, status, comment });
    throw new Error('ADO write failed');
  }

  async findOpenBug(_caseId: string): Promise<string | null> {
    return null;
  }

  async fileBug(bug: BugItem): Promise<BugItem> {
    return { ...bug, id: 'BUG-SHOULD-NOT-BE-FILED' };
  }
}

test.describe('QA agent orchestrator', () => {
  test('marks runner crashes as blocked and continues running the suite', async () => {
    const ado = new StubAzureDevOpsConnector(suite);
    const sheets = new StubGoogleSheetsConnector({ environments: [env], rows });
    const oneDrive = new StubOneDriveConnector();
    const runner = new CrashThenPassRunner();

    const summary = await new Orchestrator({ ado, sheets, oneDrive, runner }, testConfig()).run();

    expect(runner.executed).toEqual(['TC-CRASH', 'TC-PASS']);
    expect(summary.totals).toMatchObject({ total: 2, passed: 1, blocked: 1, failed: 0 });
    expect(summary.results[0]).toMatchObject({
      caseId: 'TC-CRASH',
      status: 'blocked',
      errorMessage: 'Playwright execution crashed: browser disconnected',
    });
    expect(summary.results[0].artifacts[0]).toMatchObject({
      kind: 'log',
      name: 'case-TC-CRASH-orchestrator-error.log',
    });
    expect(ado.reportedResults.map((r) => [r.caseId, r.status])).toEqual([
      ['TC-CRASH', 'blocked'],
      ['TC-PASS', 'passed'],
    ]);
  });

  test('restores Azure DevOps read-only scope when result reporting fails', async () => {
    const ado = new FailingReportAzureDevOpsConnector();
    const sheets = new StubGoogleSheetsConnector({ environments: [env], rows });
    const oneDrive = new StubOneDriveConnector();
    const runner = new CrashThenPassRunner();

    const summary = await new Orchestrator({ ado, sheets, oneDrive, runner }, testConfig()).run();
    const logged = sheets.resultLog[0] as CaseResult;

    expect(ado.reported).toEqual([
      expect.objectContaining({ caseId: 'TC-PASS', status: 'passed' }),
    ]);
    expect(ado.scopeLog).toEqual([true, false, true]);
    expect(summary.totals).toMatchObject({ total: 1, passed: 0, blocked: 1, failed: 0 });
    expect(logged).toMatchObject({
      caseId: 'TC-PASS',
      status: 'blocked',
      errorMessage: 'Azure DevOps reporting failed: ADO write failed',
    });
  });
});
