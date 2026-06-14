/**
 * Domain types for the QA MCP agent.
 *
 * The agent is an orchestrator that coordinates four external systems:
 *   - Azure DevOps  — system of record: test cases in, results & bugs out
 *   - Playwright    — browser execution engine
 *   - OneDrive      — durable artifact / evidence store
 *   - Google Sheets — parametrised test data in, live results log out
 *
 * These types are the contract that flows between those connectors and the
 * orchestrator. They are deliberately transport-agnostic: nothing here knows
 * whether a connector is backed by a real REST API, an MCP server, or an
 * in-memory stub.
 */

/** Verdict for a single test case after execution (and any flaky re-run). */
export type CaseStatus = 'passed' | 'failed' | 'flaky' | 'skipped' | 'blocked';

/** Where evidence is stored, used to embed links in bugs and reports. */
export type ArtifactKind = 'screenshot' | 'video' | 'trace' | 'html-report' | 'log';

/**
 * A target environment a suite runs against. Secrets are never inlined here —
 * `credentialRef` is a pointer the runner resolves from a secret store at
 * runtime (see Decisions: "keep credentials out of the Google Sheet entirely").
 */
export interface RunEnvironment {
  /** Short name, e.g. "staging", "prod". */
  name: string;
  /** Base URL the flow runs against. */
  baseUrl: string;
  /** Optional reference (NOT the secret) resolved from a secret store at runtime. */
  credentialRef?: string;
  /** Optional saved Playwright storageState reference to skip the login wall. */
  storageStateRef?: string;
}

/**
 * One parametrised data row pulled from Google Sheets for a given case.
 * `inputs` and `expected` are free-form string maps keyed by column header.
 */
export interface DataRow {
  /** The Azure DevOps test case id this row parametrises. */
  caseId: string;
  /** Environment name this row targets (resolved against RunEnvironment.name). */
  environment: string;
  /** Input values, keyed by column header. References to secrets, never secrets. */
  inputs: Record<string, string>;
  /** Expected values asserted against actual results. */
  expected: Record<string, string>;
}

/** Acceptance criterion read from a linked Azure DevOps work item. */
export interface AcceptanceCriterion {
  id: string;
  description: string;
}

/** A single Azure DevOps test case to execute. */
export interface TestCase {
  id: string;
  title: string;
  /** Ordered, human-readable repro/automation steps. */
  steps: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  /** Free-form tags from Azure DevOps, e.g. "@smoke", "@flaky". */
  tags: string[];
}

/** A suite / test plan grouping of cases read from Azure DevOps Test Plans. */
export interface TestSuite {
  planId: string;
  suiteId: string;
  name: string;
  cases: TestCase[];
}

/** A stored piece of evidence with a shareable link from OneDrive. */
export interface Artifact {
  kind: ArtifactKind;
  /** File name as stored, e.g. "case-42-failure.webm". */
  name: string;
  /** Shareable link the agent embeds in bugs and reports. */
  url: string;
}

/** Result of asserting one expected/actual pair within a case. */
export interface StepResult {
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
}

/**
 * Raw output of executing a single case via the Playwright runner, before the
 * orchestrator decides on write-back / bug filing. Artifacts here are local
 * handles that still need to be uploaded to OneDrive.
 */
export interface ExecutionResult {
  caseId: string;
  status: CaseStatus;
  durationMs: number;
  steps: StepResult[];
  /** Error message if the case errored or failed an assertion. */
  errorMessage?: string;
  /** Local artifact handles produced during the run (pre-upload). */
  localArtifacts: LocalArtifact[];
}

/** A locally-produced artifact handle awaiting upload to OneDrive. */
export interface LocalArtifact {
  kind: ArtifactKind;
  name: string;
  /** Local filesystem path, or a synthetic id in the stubbed flow. */
  path: string;
}

/** A bug work item to file in Azure DevOps on failure. */
export interface BugItem {
  caseId: string;
  title: string;
  /** Markdown repro steps. */
  reproSteps: string;
  environment: string;
  /** OneDrive evidence links embedded in the bug. */
  evidence: Artifact[];
  /** Set after the bug is created in Azure DevOps. */
  id?: string;
}

/** The fully-resolved result for one case after the whole loop runs. */
export interface CaseResult {
  caseId: string;
  title: string;
  status: CaseStatus;
  durationMs: number;
  /** Whether the case was re-run once because it was flagged flaky. */
  rerun: boolean;
  artifacts: Artifact[];
  errorMessage?: string;
  /** Bug filed for this case, if any. */
  bug?: BugItem;
}

/** Aggregate summary emitted at the end of a run. */
export interface RunSummary {
  planId: string;
  suiteId: string;
  suiteName: string;
  environment: string;
  startedAt: string;
  finishedAt: string;
  totals: {
    total: number;
    passed: number;
    failed: number;
    flaky: number;
    skipped: number;
    blocked: number;
  };
  results: CaseResult[];
  /** Bugs filed this run (new only — idempotency skips existing open bugs). */
  bugsFiled: BugItem[];
  /** Summary of read requirements documents, if enabled. */
  requirementsSummary?: RequirementsSummary;
}

export interface RequirementsFileSummary {
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'unknown';
  characterCount: number;
  matchedCases: string[];
}

export interface RequirementsSummary {
  path: string;
  files: RequirementsFileSummary[];
}
