import { logger } from '../../utils/logger';
import type { BugItem, CaseStatus, TestSuite } from '../types';

/**
 * Azure DevOps is the system of record on both ends of the loop.
 *
 * On the way IN  — read which suite/cases to run + acceptance criteria.
 * On the way OUT — write pass/fail back onto the case, and file bugs on failure.
 *
 * Real implementations should honour the read-only scoping discussed in the
 * design: keep the server read-only (X-MCP-Readonly) while only reading the
 * plan, and only widen to write access for the reporting step. The
 * {@link AzureDevOpsConnector.setReadOnly} hook models that toggle.
 */
export interface AzureDevOpsConnector {
  /** Toggle read-only scoping. Reads are allowed read-only; writes require false. */
  setReadOnly(readOnly: boolean): void;

  /** Read a suite (cases + acceptance criteria) from Azure DevOps Test Plans. */
  getSuite(planId: string, suiteId: string): Promise<TestSuite>;

  /** Write the pass/fail outcome back onto a test case. */
  reportCaseResult(caseId: string, status: CaseStatus, comment?: string): Promise<void>;

  /**
   * Idempotency guard: return an existing OPEN bug id for a case, or null.
   * Called before filing so re-runs don't spawn duplicates.
   */
  findOpenBug(caseId: string): Promise<string | null>;

  /** File a new bug work item and return it with its assigned id. */
  fileBug(bug: BugItem): Promise<BugItem>;
}

/**
 * In-memory stub. Seeds a small suite and records writes so the demo loop runs
 * end-to-end offline. Swap for a REST/MCP-backed implementation behind the same
 * interface without touching the orchestrator.
 */
export class StubAzureDevOpsConnector implements AzureDevOpsConnector {
  private readOnly = true;
  private readonly suites = new Map<string, TestSuite>();
  private readonly openBugs = new Map<string, string>();
  private bugSeq = 1000;

  /** Outcomes written back, exposed for assertions/inspection in the demo. */
  readonly reportedResults: Array<{ caseId: string; status: CaseStatus; comment?: string }> = [];

  constructor(seed?: TestSuite) {
    if (seed) this.suites.set(`${seed.planId}/${seed.suiteId}`, seed);
  }

  setReadOnly(readOnly: boolean): void {
    this.readOnly = readOnly;
    logger.info(`Azure DevOps scope: ${readOnly ? 'read-only' : 'read-write'}`);
  }

  async getSuite(planId: string, suiteId: string): Promise<TestSuite> {
    const suite = this.suites.get(`${planId}/${suiteId}`);
    if (!suite) throw new Error(`Suite ${planId}/${suiteId} not found`);
    logger.info(`Azure DevOps: read suite "${suite.name}" (${suite.cases.length} cases)`);
    return suite;
  }

  async reportCaseResult(caseId: string, status: CaseStatus, comment?: string): Promise<void> {
    this.assertWritable('reportCaseResult');
    this.reportedResults.push({ caseId, status, comment });
    logger.info(`Azure DevOps: case ${caseId} -> ${status}`);
  }

  async findOpenBug(caseId: string): Promise<string | null> {
    return this.openBugs.get(caseId) ?? null;
  }

  async fileBug(bug: BugItem): Promise<BugItem> {
    this.assertWritable('fileBug');
    const id = `BUG-${this.bugSeq++}`;
    this.openBugs.set(bug.caseId, id);
    logger.warn(`Azure DevOps: filed ${id} for case ${bug.caseId}`);
    return { ...bug, id };
  }

  private assertWritable(op: string): void {
    if (this.readOnly) {
      throw new Error(`Azure DevOps is read-only; cannot ${op}. Call setReadOnly(false) first.`);
    }
  }
}
