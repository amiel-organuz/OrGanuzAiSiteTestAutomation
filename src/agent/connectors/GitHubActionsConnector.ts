import { logger } from '../../utils/logger';

/**
 * Triggers GitHub Actions workflows on the repository.
 *
 * The orchestrator can dispatch the CI pipeline (e.g. the "Parallel Test
 * Automation" workflow) once a local run finishes. The workflow must declare a
 * `workflow_dispatch:` trigger and live on the target branch for the dispatch to
 * be accepted.
 *
 * Like the other connectors this is transport-agnostic: the orchestrator depends
 * on the interface, and the real implementation is backed by the GitHub REST API
 * while tests use the stub.
 */

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

const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';

/**
 * Real GitHub REST-backed connector.
 *
 * Uses the workflow-dispatch endpoint:
 *   POST /repos/{owner}/{repo}/actions/workflows/{workflowFile}/dispatches
 * which returns 204 No Content with no run id. To surface a link we make a
 * best-effort follow-up call to list the latest `workflow_dispatch` run.
 *
 * The token is supplied at construction time and never stored in config; it
 * needs `actions: write` (fine-grained) or the `workflow` scope (classic PAT).
 */
export class HttpGitHubActionsConnector implements GitHubActionsConnector {
  constructor(
    private readonly token: string,
    private readonly config: GitHubActionsConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async triggerWorkflow(options: WorkflowDispatchInput = {}): Promise<WorkflowDispatchResult> {
    const { owner, repo, workflowFile } = this.config;
    const ref = options.ref ?? this.config.ref;
    const url = `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;

    logger.step(`GitHub Actions: dispatching ${workflowFile} on ${ref}`);

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ref,
        ...(options.inputs ? { inputs: options.inputs } : {}),
      }),
    });

    // Success is 204 No Content; anything else is an error worth surfacing.
    if (response.status !== 204) {
      const detail = await this.safeText(response);
      throw new Error(
        `Workflow dispatch failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    return {
      triggered: true,
      workflowFile,
      ref,
      runUrl: await this.latestRunUrl(ref),
    };
  }

  /** Best-effort lookup of the most recent dispatched run so callers get a link. */
  private async latestRunUrl(ref: string): Promise<string | undefined> {
    const { owner, repo, workflowFile } = this.config;
    const branch = ref.replace(/^refs\/heads\//, '');
    const url =
      `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}/runs` +
      `?event=workflow_dispatch&branch=${encodeURIComponent(branch)}&per_page=1`;

    try {
      const response = await this.fetchImpl(url, { headers: this.headers() });
      if (!response.ok) return undefined;
      const data = (await response.json()) as { workflow_runs?: Array<{ html_url?: string }> };
      return data.workflow_runs?.[0]?.html_url;
    } catch {
      return undefined;
    }
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      ...extra,
    };
  }

  private async safeText(response: Response): Promise<string> {
    try {
      return (await response.text()).trim();
    } catch {
      return '';
    }
  }
}

/**
 * Deterministic stub connector. Records dispatches without touching the network,
 * so the orchestrator's trigger path can be exercised in tests and demos.
 */
export class StubGitHubActionsConnector implements GitHubActionsConnector {
  readonly dispatched: WorkflowDispatchInput[] = [];

  constructor(private readonly config: Pick<GitHubActionsConfig, 'workflowFile' | 'ref'>) {}

  async triggerWorkflow(options: WorkflowDispatchInput = {}): Promise<WorkflowDispatchResult> {
    this.dispatched.push(options);
    const ref = options.ref ?? this.config.ref;
    logger.step(`GitHub Actions (stub): would dispatch ${this.config.workflowFile} on ${ref}`);
    return { triggered: true, workflowFile: this.config.workflowFile, ref };
  }
}
