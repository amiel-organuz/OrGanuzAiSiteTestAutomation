import { logger } from '../utils/logger';
import type { AgentConfig } from './config';
import type {
  Artifact,
  BugItem,
  CaseResult,
  DataRow,
  ExecutionResult,
  OrchestratorDeps,
  RunEnvironment,
  RunSummary,
  TestCase,
} from './types';
import { appendError, errorMessage } from './services/ErrorUtils';
import { RequirementsEnricher } from './services/RequirementsEnricher';
import { ResultTextFormatter } from './services/ResultTextFormatter';
import { RunSummaryBuilder } from './services/RunSummaryBuilder';
import { RunSummaryLogger } from './services/RunSummaryLogger';

/**
 * The QA agent. Implements the agent loop from the design:
 *
 *   1. Read the target suite + acceptance criteria from Azure DevOps Test Plans.
 *   1.5. (Optional) When requirements.path is set, read PDF/DOCX/XLSX docs
 *      (from OneDrive or the local filesystem) and enrich each case's
 *      acceptance criteria by matching on case id.
 *   2. Pull matching data rows + target environment from Google Sheets.
 *   3. For each case, Playwright executes the flow and asserts expected vs
 *      actual, capturing a trace and video.
 *   4. On any result, push screenshots/video/trace to OneDrive and keep links.
 *   5. Write pass/fail back onto the case in Azure DevOps; on failure file a bug
 *      (idempotently) with repro steps, environment, and evidence links; append
 *      a row to the Google results sheet.
 *   6. Re-run flagged-flaky failures once, then emit a run summary.
 *
 * Azure DevOps is kept read-only while reading the plan and only widened to
 * write access for the reporting step (step 5).
 */
export class Orchestrator {
  private readonly formatter: ResultTextFormatter;
  private readonly summaryBuilder: RunSummaryBuilder;
  private readonly summaryLogger: RunSummaryLogger;

  constructor(private readonly deps: OrchestratorDeps, private readonly config: AgentConfig) {
    this.formatter = deps.formatter ?? new ResultTextFormatter();
    this.summaryBuilder = deps.summaryBuilder ?? new RunSummaryBuilder();
    this.summaryLogger = deps.summaryLogger ?? new RunSummaryLogger();
  }

  async run(): Promise<RunSummary> {
    const { ado, sheets } = this.deps;
    const { azureDevOps, run, evidence } = this.config;
    const startedAt = new Date().toISOString();

    // --- Step 1: read the suite (read-only scope). -------------------------
    ado.setReadOnly(azureDevOps.startReadOnly);
    const suite = await ado.getSuite(azureDevOps.planId, azureDevOps.suiteId);
    const cases = run.maxCases > 0 ? suite.cases.slice(0, run.maxCases) : suite.cases;

    // --- Step 1.5: optionally read requirements docs. -----------------------
    const requirementsSummary = await new RequirementsEnricher(
      this.deps.oneDrive,
      this.config.requirements,
    ).enrich(cases);

    // --- Step 2: resolve environment + pull data rows. ---------------------
    const env = await sheets.getEnvironment(run.environment);
    const rows = await sheets.getDataRows(cases.map((c) => c.id), run.environment);
    const rowByCase = new Map(rows.map((r) => [r.caseId, r]));

    const folder = `${evidence.folderPrefix}/${startedAt.slice(0, 10)}/${suite.suiteId}`;
    const results: CaseResult[] = [];
    const bugsFiled: BugItem[] = [];

    for (const testCase of cases) {
      const result = await this.runCase(testCase, rowByCase.get(testCase.id), env, folder, bugsFiled);
      results.push(result);
    }

    const finishedAt = new Date().toISOString();
    const summary = this.summaryBuilder.build(
      suite,
      env,
      startedAt,
      finishedAt,
      results,
      bugsFiled,
      requirementsSummary,
    );
    this.summaryLogger.log(summary);

    // --- Optional: dispatch the GitHub Actions workflow (CI pipeline). ------
    await this.maybeTriggerWorkflow();

    return summary;
  }

  /**
   * When a GitHub connector is wired in and github.triggerWorkflow is enabled,
   * dispatch the configured workflow. Failures here are logged but never fail
   * the local run — the run summary is already complete by this point.
   */
  private async maybeTriggerWorkflow(): Promise<void> {
    const { github } = this.deps;
    const { triggerWorkflow, workflowFile, ref } = this.config.github;
    if (!github || !triggerWorkflow) return;

    try {
      const result = await github.triggerWorkflow({ ref });
      logger.info(
        `GitHub Actions workflow ${result.workflowFile} dispatched on ${result.ref}` +
          (result.runUrl ? ` — ${result.runUrl}` : ''),
      );
    } catch (err) {
      logger.fail(`Failed to dispatch GitHub Actions workflow ${workflowFile}`, err);
    }
  }

  /** Runs steps 3–6 for a single case. */
  private async runCase(
    testCase: TestCase,
    dataRow: DataRow | undefined,
    env: RunEnvironment,
    folder: string,
    bugsFiled: BugItem[],
  ): Promise<CaseResult> {
    const { ado, oneDrive, sheets } = this.deps;
    const { run } = this.config;

    // --- Step 3: execute. --------------------------------------------------
    let execution = await this.executeCaseSafely(testCase, dataRow, env);
    let rerun = false;

    // --- Step 6 (interleaved): re-run flagged-flaky failures once. ---------
    if (
      execution.status === 'failed' &&
      run.rerunFlakyOnce &&
      testCase.tags.includes(run.flakyTag)
    ) {
      logger.warn(`Case ${testCase.id} failed and is flagged flaky — re-running once`);
      const second = await this.executeCaseSafely(testCase, dataRow, env);
      rerun = true;
      // Passed on re-run => flaky; still failed => failed.
      execution = second.status === 'passed' ? { ...second, status: 'flaky' } : second;
    }

    // --- Step 4: push artifacts to OneDrive, keep links. -------------------
    let artifacts: Artifact[] = [];
    try {
      artifacts = await oneDrive.uploadAll(folder, execution.localArtifacts);
    } catch (err) {
      execution = {
        ...execution,
        status: execution.status === 'passed' ? 'blocked' : execution.status,
        errorMessage: appendError(execution.errorMessage, `Evidence upload failed: ${errorMessage(err)}`),
      };
      logger.fail(`Evidence upload failed for case ${testCase.id}`, err);
    }

    // --- Step 5: write back + (idempotent) bug + results-sheet row. --------
    let bug: BugItem | undefined;
    try {
      ado.setReadOnly(false); // widen scope only now, for the reporting step.
      const comment = this.formatter.resultComment(execution, artifacts);
      await ado.reportCaseResult(testCase.id, execution.status, comment);

      if (execution.status === 'failed' && run.fileBugs) {
        bug = await this.fileBugIfNew(testCase, execution, env, artifacts);
        if (bug) bugsFiled.push(bug);
      }
    } catch (err) {
      execution = {
        ...execution,
        status: execution.status === 'passed' ? 'blocked' : execution.status,
        errorMessage: appendError(execution.errorMessage, `Azure DevOps reporting failed: ${errorMessage(err)}`),
      };
      logger.fail(`Azure DevOps reporting failed for case ${testCase.id}`, err);
    } finally {
      ado.setReadOnly(this.config.azureDevOps.startReadOnly); // re-narrow scope.
    }

    const caseResult: CaseResult = {
      caseId: testCase.id,
      title: testCase.title,
      status: execution.status,
      durationMs: execution.durationMs,
      rerun,
      artifacts,
      errorMessage: execution.errorMessage,
      bug,
    };

    try {
      await sheets.appendResultRow(caseResult);
    } catch (err) {
      logger.fail(`Sheets result logging failed for case ${testCase.id}`, err);
    }
    return caseResult;
  }

  private async executeCaseSafely(
    testCase: TestCase,
    dataRow: DataRow | undefined,
    env: RunEnvironment,
  ): Promise<ExecutionResult> {
    try {
      return await this.deps.runner.execute(testCase, dataRow, env);
    } catch (err) {
      const message = errorMessage(err);
      logger.fail(`Playwright execution crashed for case ${testCase.id}`, err);
      return {
        caseId: testCase.id,
        status: 'blocked',
        durationMs: 0,
        steps: [],
        errorMessage: `Playwright execution crashed: ${message}`,
        localArtifacts: [
          {
            kind: 'log',
            name: `case-${testCase.id}-orchestrator-error.log`,
            path: `orchestrator-error://${encodeURIComponent(message)}`,
          },
        ],
      };
    }
  }

  /** Files a bug only if no open bug already exists for the case (idempotency). */
  private async fileBugIfNew(
    testCase: TestCase,
    execution: ExecutionResult,
    env: RunEnvironment,
    evidence: Artifact[],
  ): Promise<BugItem | undefined> {
    const existing = await this.deps.ado.findOpenBug(testCase.id);
    if (existing) {
      logger.info(`Open bug ${existing} already exists for case ${testCase.id} — skipping`);
      return undefined;
    }
    const bug: BugItem = {
      caseId: testCase.id,
      title: `[QA] ${testCase.title} failed on ${env.name}`,
      reproSteps: this.formatter.reproSteps(testCase, execution, env),
      environment: env.name,
      evidence,
    };
    return this.deps.ado.fileBug(bug);
  }
}
