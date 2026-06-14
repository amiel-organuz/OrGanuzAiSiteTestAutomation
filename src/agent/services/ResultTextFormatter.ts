import type { Artifact, ExecutionResult, RunEnvironment, TestCase } from '../types';

export class ResultTextFormatter {
  resultComment(execution: ExecutionResult, artifacts: Artifact[]): string {
    const links = artifacts.map((a) => `${a.kind}: ${a.url}`).join(' | ');
    return `Automated run: ${execution.status} in ${execution.durationMs}ms. ${links}`.trim();
  }

  reproSteps(testCase: TestCase, execution: ExecutionResult, env: RunEnvironment): string {
    const steps = testCase.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const asserts = execution.steps
      .filter((s) => !s.passed)
      .map((s) => `- ${s.description}: expected "${s.expected}", got "${s.actual}"`)
      .join('\n');

    return [
      `**Environment:** ${env.name} (${env.baseUrl})`,
      '',
      '**Steps:**',
      steps,
      '',
      '**Failed assertions:**',
      asserts || '- (none captured)',
      '',
      execution.errorMessage ? `**Error:** ${execution.errorMessage}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
