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

import type { ResultTextFormatter } from '../agent/services/ResultTextFormatter';
import type { RunSummaryBuilder } from '../agent/services/RunSummaryBuilder';
import type { RunSummaryLogger } from '../agent/services/RunSummaryLogger';

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

/** Test priority for a generated STD case: P1 highest … P3 lowest. */
export type TestPriority = 'P1' | 'P2' | 'P3';

/**
 * A single detailed step of an STD (Software Test Description): the concrete
 * action a tester/automation performs and the observable result expected of it.
 */
export interface TestStep {
  /** 1-based step number within the case. */
  index: number;
  /** The action performed at this step. */
  action: string;
  /** The observable expected result after the action. */
  expected: string;
}

/** A single Azure DevOps test case to execute. */
export interface TestCase {
  id: string;
  title: string;
  /** Ordered, human-readable repro/automation steps (flattened `detailedSteps` actions). */
  steps: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  /** Free-form tags from Azure DevOps, e.g. "@smoke", "@flaky". */
  tags: string[];
  /**
   * Detailed STD fields, populated for generated plans ({@link TestPlanAgent}).
   * Optional so hand-authored / Azure DevOps cases stay valid without them.
   */
  /** One-line objective / purpose of the case. */
  objective?: string;
  /** Preconditions that must hold before the steps run. */
  preconditions?: string[];
  /** Test priority (P1 highest). */
  priority?: TestPriority;
  /** Detailed action→expected steps; `steps` is the flattened action list. */
  detailedSteps?: TestStep[];
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
 * Google Sheets plays two roles in the design:
 *   - parametrised test-data source (environments, input rows, expected values)
 *   - a live results log / dashboard the team can read without opening Azure DevOps
 *
 * Secrets are never stored here — only references resolved at runtime.
 */
export interface GoogleSheetsConnector {
  /** Resolve a named environment (base URL + secret references). */
  getEnvironment(name: string): Promise<RunEnvironment>;

  /** Pull the parametrised data rows for a set of case ids + environment. */
  getDataRows(caseIds: string[], environment: string): Promise<DataRow[]>;

  /** Append one row to the live results log per finished case. */
  appendResultRow(result: CaseResult): Promise<void>;
}

/**
 * OneDrive is the durable evidence store. Screenshots, failure videos,
 * Playwright traces, and the run's HTML report land here, and the agent grabs
 * shareable links to embed in bugs and reports.
 *
 * It is also used to download requirements documents.
 */
export interface OneDriveConnector {
  /**
   * Upload a local artifact and return it with a shareable link.
   * `folder` namespaces the run, e.g. "runs/2026-06-14/suite-42".
   */
  upload(folder: string, artifact: LocalArtifact): Promise<Artifact>;

  /** Convenience: upload many artifacts under the same folder. */
  uploadAll(folder: string, artifacts: LocalArtifact[]): Promise<Artifact[]>;

  /** Download requirements documents under the specified path. */
  downloadFiles(path: string): Promise<Array<{ name: string; content: Buffer }>>;
}

/**
 * The execution engine. Given a case, its data row, and the target environment,
 * it drives the browser through the flow, asserts expected vs actual, and
 * captures a trace + video. In the real implementation this is backed by the
 * Playwright MCP for authoring/exploring and the @playwright/cli skill for bulk
 * execution (the ~4x token saving noted in the design). Here it is a stub that
 * deterministically simulates a run from the data row.
 */
export interface PlaywrightRunner {
  /** Execute a single case and return its raw result + local artifacts. */
  execute(testCase: TestCase, dataRow: DataRow | undefined, env: RunEnvironment): Promise<ExecutionResult>;
}

export interface PlaywrightCommandRunner {
  run(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

/** Inputs for a single workflow dispatch. */
export interface WorkflowDispatchInput {
  /** Branch or tag to run the workflow on. Defaults to the connector's ref. */
  ref?: string;
  /** Optional `workflow_dispatch` inputs, keyed by input name. */
  inputs?: Record<string, string>;
}

/** Outcome of dispatching a workflow. */
export interface WorkflowDispatchResult {
  triggered: boolean;
  /** Workflow file the dispatch targeted, e.g. "parallel-tests.yml". */
  workflowFile: string;
  /** Ref the dispatch ran against. */
  ref: string;
  /** Best-effort URL of the created run (the dispatch API itself returns no body). */
  runUrl?: string;
}

export interface GitHubActionsConnector {
  /** Dispatch the configured workflow. Resolves once GitHub accepts the request. */
  triggerWorkflow(options?: WorkflowDispatchInput): Promise<WorkflowDispatchResult>;
}

export interface GitHubActionsConfig {
  owner: string;
  repo: string;
  /** Workflow file name (as it sits under .github/workflows), e.g. "parallel-tests.yml". */
  workflowFile: string;
  /** Default branch/tag to dispatch against. */
  ref: string;
}

/**
 * Page exploration connector.
 *
 * Given a URL, it opens the page and reports the affordances worth testing —
 * headings, navigation links, forms, and interactive controls. The result is a
 * transport-agnostic {@link PageExploration}: nothing downstream knows whether
 * it came from a real browser driven by the Playwright MCP or the offline stub.
 *
 * The real implementation ({@link McpPageExplorer}) drives the **Playwright MCP**
 * — `browser_navigate` to open the URL, then `browser_snapshot` to read the
 * accessibility tree — and parses that snapshot into the structure below. The
 * MCP tool calls themselves are injected as a {@link PlaywrightMcpClient} so this
 * module stays free of any tool binding and remains unit-testable offline.
 */
export interface PageExplorer {
  /** Open `url`, explore the page, and report its testable affordances. */
  explore(url: string): Promise<PageExploration>;
}

/** A discovered navigation link. */
export interface DiscoveredLink {
  text: string;
  href: string;
}

/** A discovered form and the fields a test would need to fill. */
export interface DiscoveredForm {
  /** Accessible name of the form, or a synthesised label. */
  name: string;
  /** Accessible names of the input/textbox/combobox fields. */
  fields: string[];
  /** Label of the submit control, when one is present. */
  submitLabel?: string;
}

/** A discovered interactive control (button, tab, checkbox, …). */
export interface DiscoveredControl {
  /** ARIA role, e.g. "button", "tab", "checkbox". */
  role: string;
  /** Accessible name. */
  name: string;
}

/** The testable surface of a single page. */
export interface PageExploration {
  url: string;
  title: string;
  headings: string[];
  links: DiscoveredLink[];
  forms: DiscoveredForm[];
  controls: DiscoveredControl[];
}

/**
 * Thin transport over the Playwright MCP browser tools. A caller wires these to
 * the actual MCP tool invocations (`browser_navigate`, `browser_snapshot`), or
 * to the `@playwright/test` API, or to a fake in tests.
 */
export interface PlaywrightMcpClient {
  /** Navigate the shared browser tab to `url` (maps to `browser_navigate`). */
  navigate(url: string): Promise<void>;
  /** Return the current page's accessibility snapshot (maps to `browser_snapshot`). */
  snapshot(): Promise<PageSnapshot>;
}

/** The subset of a Playwright MCP snapshot this explorer consumes. */
export interface PageSnapshot {
  /** Page URL after any redirects. */
  url?: string;
  /** Document title. */
  title?: string;
  /**
   * The accessibility tree as emitted by `browser_snapshot`: one node per line,
   * e.g. `- link "Home" [ref=e3]` or `- heading "Welcome" [level=1]`.
   */
  tree: string;
}

export interface McpCliOptions {
  /** npx package spec for the server. Default `@playwright/mcp@latest`. */
  serverSpec?: string;
  /** Run the browser headless. Default `true`. */
  headless?: boolean;
  /**
   * Use a fresh, isolated browser profile per run. Default `true` — this avoids
   * the "Browser is already in use" lock when another Playwright MCP session
   * (or a prior run) holds the shared profile.
   */
  isolated?: boolean;
  /** Extra CLI args passed to the Playwright MCP server (e.g. `['--device', 'iPhone 15']`). */
  args?: string[];
}

/** The four connectors the orchestrator depends on, injected for testability. */
export interface OrchestratorDeps {
  ado: AzureDevOpsConnector;
  sheets: GoogleSheetsConnector;
  oneDrive: OneDriveConnector;
  runner: PlaywrightRunner;
  /** Optional: dispatch a GitHub Actions workflow after the run (CI pipeline). */
  github?: GitHubActionsConnector;
  formatter?: ResultTextFormatter;
  summaryBuilder?: RunSummaryBuilder;
  summaryLogger?: RunSummaryLogger;
}

/**
 * Options for a generated plan. All optional — sensible ids/tags are derived
 * from the URL when omitted.
 */
export interface TestPlanOptions {
  /** Plan id for the generated {@link TestSuite}. Default: `PLAN-<host>`. */
  planId?: string;
  /** Suite id for the generated {@link TestSuite}. Default: `SUITE-<host>`. */
  suiteId?: string;
  /** Human-readable suite name. Default: derived from the page title. */
  name?: string;
  /** Cap the number of generated cases (0 = no cap). Default: 0. */
  maxCases?: number;
  /** Tags applied to every generated case, on top of `@generated`. Default: `['@smoke']`. */
  tags?: string[];
  /**
   * Reference screenshots of the page(s) — file paths, e.g. from the `test_input/`
   * folder. When present, the agent adds a visual-reference case so the generated plan
   * carries the images as visual-regression / layout candidates. See {@link readTestInput}.
   */
  referenceImages?: string[];
}

/**
 * Inputs read from the `test_input/` folder for {@link TestPlanAgent}: a list of URLs
 * (from a urls file) and a set of web-page screenshot paths (the images in the folder).
 */
export interface TestPlanInput {
  urls: string[];
  images: string[];
}

export interface ParsedRequirementFile {
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'unknown';
  text: string;
  excelData?: Array<{ sheetName: string; rows: any[] }>;
}
