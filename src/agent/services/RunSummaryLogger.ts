import { logger } from '../../utils/logger';
import type { RunSummary } from '../types';

export class RunSummaryLogger {
  log(summary: RunSummary): void {
    const { totals } = summary;
    logger.step(`Run summary — ${summary.suiteName} on ${summary.environment}`);
    logger.info(
      `total=${totals.total} passed=${totals.passed} failed=${totals.failed} ` +
        `flaky=${totals.flaky} blocked=${totals.blocked} skipped=${totals.skipped}`,
    );

    if (summary.requirementsSummary) {
      const filesStr = summary.requirementsSummary.files
        .map((f) => `${f.name} (${f.matchedCases.length} case(s) matched)`)
        .join(', ');
      logger.info(
        `Requirements docs: read ${summary.requirementsSummary.files.length} file(s) ` +
          `from "${summary.requirementsSummary.path}" -> [${filesStr}]`,
      );
    }

    if (summary.bugsFiled.length) {
      logger.warn(`bugs filed: ${summary.bugsFiled.map((b) => b.id).join(', ')}`);
    }

    if (totals.failed > 0) logger.fail(`${totals.failed} case(s) failed`);
    else logger.pass('no hard failures');
  }
}
