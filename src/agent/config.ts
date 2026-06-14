/**
 * Configuration for the QA MCP agent, read from environment variables with
 * sensible fallbacks. Mirrors the env-driven pattern in src/utils/config.ts.
 *
 * No secrets live here — only ids, flags, and references.
 */

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

function intEnv(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v === undefined ? NaN : parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

export const agentConfig = {
  azureDevOps: {
    /** Target test plan + suite the agent reads cases from. */
    planId: env('ADO_PLAN_ID', 'PLAN-1'),
    suiteId: env('ADO_SUITE_ID', 'SUITE-1'),
    /**
     * Start the Azure DevOps connector read-only and only widen to write for
     * the reporting step. Blast-radius control from the design.
     */
    startReadOnly: boolEnv('ADO_START_READONLY', true),
  },
  run: {
    /** Environment name to run against (resolved from Sheets). */
    environment: env('QA_ENVIRONMENT', 'staging'),
    /** Re-run a failed case once if it is flagged flaky. */
    rerunFlakyOnce: boolEnv('QA_RERUN_FLAKY', true),
    /** Tag that marks a case as eligible for a single flaky re-run. */
    flakyTag: env('QA_FLAKY_TAG', '@flaky'),
    /** File bugs on failure (off => report results only). */
    fileBugs: boolEnv('QA_FILE_BUGS', true),
    /** Max cases to run; 0 = no limit. */
    maxCases: intEnv('QA_MAX_CASES', 0),
  },
  evidence: {
    /** OneDrive folder prefix; the run date/suite is appended per run. */
    folderPrefix: env('QA_EVIDENCE_PREFIX', 'qa-runs'),
  },
  requirements: {
    /** Path to requirements file or directory (PDF, DOCX, XLSX). Empty means disabled. */
    path: env('QA_REQUIREMENTS_PATH', ''),
    /** Source of the requirements documents ('local' or 'onedrive'). */
    source: env('QA_REQUIREMENTS_SOURCE', 'local') as 'local' | 'onedrive',
  },
} as const;

export type AgentConfig = typeof agentConfig;
