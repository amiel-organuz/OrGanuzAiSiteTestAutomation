import type {
  BugItem,
  CaseResult,
  RequirementsSummary,
  RunEnvironment,
  RunSummary,
  TestSuite,
} from '../types';

export class RunSummaryBuilder {
  build(
    suite: TestSuite,
    env: RunEnvironment,
    startedAt: string,
    finishedAt: string,
    results: CaseResult[],
    bugsFiled: BugItem[],
    requirementsSummary?: RequirementsSummary,
  ): RunSummary {
    return {
      planId: suite.planId,
      suiteId: suite.suiteId,
      suiteName: suite.name,
      environment: env.name,
      startedAt,
      finishedAt,
      totals: {
        total: results.length,
        passed: results.filter((r) => r.status === 'passed').length,
        failed: results.filter((r) => r.status === 'failed').length,
        flaky: results.filter((r) => r.status === 'flaky').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        blocked: results.filter((r) => r.status === 'blocked').length,
      },
      results,
      bugsFiled,
      requirementsSummary,
    };
  }
}
