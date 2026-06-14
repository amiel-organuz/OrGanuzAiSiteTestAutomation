import { logger } from '../../utils/logger';
import type { CaseResult, DataRow, RunEnvironment } from '../types';

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

/** In-memory stub seeded with environments and data rows for the demo. */
export class StubGoogleSheetsConnector implements GoogleSheetsConnector {
  private readonly environments = new Map<string, RunEnvironment>();
  private readonly rows: DataRow[];

  /** Appended result rows, exposed for inspection in the demo. */
  readonly resultLog: CaseResult[] = [];

  constructor(seed?: { environments?: RunEnvironment[]; rows?: DataRow[] }) {
    for (const env of seed?.environments ?? []) this.environments.set(env.name, env);
    this.rows = seed?.rows ?? [];
  }

  async getEnvironment(name: string): Promise<RunEnvironment> {
    const env = this.environments.get(name);
    if (!env) throw new Error(`Environment "${name}" not found in Sheets`);
    logger.info(`Sheets: resolved environment "${name}" -> ${env.baseUrl}`);
    return env;
  }

  async getDataRows(caseIds: string[], environment: string): Promise<DataRow[]> {
    const ids = new Set(caseIds);
    const matched = this.rows.filter((r) => ids.has(r.caseId) && r.environment === environment);
    logger.info(`Sheets: pulled ${matched.length} data row(s) for env "${environment}"`);
    return matched;
  }

  async appendResultRow(result: CaseResult): Promise<void> {
    this.resultLog.push(result);
    logger.info(`Sheets: logged result for case ${result.caseId} (${result.status})`);
  }
}
