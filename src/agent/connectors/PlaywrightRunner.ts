import { logger } from '../../utils/logger';
import { execFile } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  DataRow,
  ExecutionResult,
  LocalArtifact,
  PlaywrightCommandRunner,
  PlaywrightRunner,
  RunEnvironment,
  StepResult,
  TestCase,
} from '../../types/agent.types';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PLAYWRIGHT_JSON_REPORT_PATH = 'test-results/results.json';

interface PlaywrightJsonReport {
  stats?: {
    duration?: number;
    expected?: number;
    unexpected?: number;
    flaky?: number;
    skipped?: number;
  };
  errors?: Array<{ message?: string }>;
  suites?: PlaywrightJsonSuite[];
}

interface PlaywrightJsonSuite {
  title?: string;
  suites?: PlaywrightJsonSuite[];
  specs?: PlaywrightJsonSpec[];
}

interface PlaywrightJsonSpec {
  title?: string;
  tests?: PlaywrightJsonTest[];
}

interface PlaywrightJsonTest {
  title?: string;
  projectName?: string;
  results?: PlaywrightJsonResult[];
}

interface PlaywrightJsonResult {
  status?: string;
  error?: { message?: string };
  errors?: Array<{ message?: string }>;
}

interface PlaywrightCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class ExecFilePlaywrightCommandRunner implements PlaywrightCommandRunner {
  constructor(private readonly cwd = process.cwd()) {}

  async run(args: string[], env: NodeJS.ProcessEnv): Promise<PlaywrightCommandResult> {
    try {
      const result = await execFileAsync('npx', ['playwright', 'test', ...args], {
        cwd: this.cwd,
        env,
        maxBuffer: 50 * 1024 * 1024,
      });
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
      };
    } catch (err) {
      const failed = err as NodeJS.ErrnoException & {
        stdout?: string;
        stderr?: string;
        code?: number;
      };
      return {
        stdout: failed.stdout ?? '',
        stderr: failed.stderr ?? failed.message,
        exitCode: typeof failed.code === 'number' ? failed.code : 1,
      };
    }
  }
}

export class PlaywrightCliArgsBuilder {
  build(dataRow: DataRow): string[] {
    const args: string[] = [];
    const testFile = dataRow.inputs.testFile?.trim();
    if (testFile) args.push(testFile);

    for (const project of this.csv(dataRow.inputs.project)) {
      args.push(`--project=${project}`);
    }

    const grep = dataRow.inputs.grep?.trim();
    if (grep) args.push('--grep', grep);

    const grepInvert = dataRow.inputs.grepInvert?.trim();
    if (grepInvert) args.push('--grep-invert', grepInvert);

    return args;
  }

  private csv(value: string | undefined): string[] {
    return (value ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
}

export class PlaywrightJsonReportReader {
  constructor(private readonly cwd = process.cwd()) {}

  /** Remove the prior case's report before invoking Playwright. */
  async reset(): Promise<void> {
    await rm(join(this.cwd, PLAYWRIGHT_JSON_REPORT_PATH), { force: true });
  }

  async read(stdout: string): Promise<PlaywrightJsonReport | undefined> {
    const fromStdout = this.parseStdout(stdout);
    if (fromStdout) return fromStdout;

    try {
      return JSON.parse(await readFile(join(this.cwd, PLAYWRIGHT_JSON_REPORT_PATH), 'utf8')) as PlaywrightJsonReport;
    } catch {
      return undefined;
    }
  }

  private parseStdout(stdout: string): PlaywrightJsonReport | undefined {
    const firstBrace = stdout.indexOf('{');
    const lastBrace = stdout.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return undefined;

    try {
      return JSON.parse(stdout.slice(firstBrace, lastBrace + 1)) as PlaywrightJsonReport;
    } catch {
      return undefined;
    }
  }
}

export class PlaywrightFailureFormatter {
  message(report: PlaywrightJsonReport | undefined, stderr: string, exitCode: number): string {
    const reporterError = [
      ...(report?.errors?.map((e) => e.message).filter(Boolean) ?? []),
      ...this.failedTestErrors(report).slice(0, 5),
    ].join('\n\n');
    return reporterError || stderr.trim() || `Playwright exited with code ${exitCode}`;
  }

  private failedTestErrors(report: PlaywrightJsonReport | undefined): string[] {
    const messages: string[] = [];
    const visitSuite = (suite: PlaywrightJsonSuite): void => {
      for (const child of suite.suites ?? []) visitSuite(child);
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            const errors = [
              result.error?.message,
              ...(result.errors?.map((e) => e.message) ?? []),
            ].filter(Boolean);
            for (const error of errors) {
              messages.push(`[${test.projectName ?? 'project'}] ${spec.title ?? test.title ?? 'test'}\n${error}`);
            }
          }
        }
      }
    };

    for (const suite of report?.suites ?? []) visitSuite(suite);
    return messages;
  }
}

/**
 * Real Playwright CLI-backed runner.
 *
 * The orchestrator still drives one logical TestCase at a time, while the row
 * decides which Playwright slice that case maps to:
 *   - inputs.project: comma-separated Playwright project names, e.g. "api,chromium"
 *   - inputs.testFile: optional spec file or directory
 *   - inputs.grep / inputs.grepInvert: optional Playwright filters
 */
export class CliPlaywrightRunner implements PlaywrightRunner {
  private readonly commandRunner: PlaywrightCommandRunner;
  private readonly argsBuilder: PlaywrightCliArgsBuilder;
  private readonly reportReader: PlaywrightJsonReportReader;
  private readonly failureFormatter: PlaywrightFailureFormatter;

  constructor(
    private readonly cwd = process.cwd(),
    commandRunner?: PlaywrightCommandRunner,
    argsBuilder = new PlaywrightCliArgsBuilder(),
    reportReader = new PlaywrightJsonReportReader(cwd),
    failureFormatter = new PlaywrightFailureFormatter(),
  ) {
    this.commandRunner = commandRunner ?? new ExecFilePlaywrightCommandRunner(cwd);
    this.argsBuilder = argsBuilder;
    this.reportReader = reportReader;
    this.failureFormatter = failureFormatter;
  }

  async execute(testCase: TestCase, dataRow: DataRow | undefined, env: RunEnvironment): Promise<ExecutionResult> {
    if (!dataRow) {
      return {
        caseId: testCase.id,
        status: 'blocked',
        durationMs: 0,
        steps: [],
        errorMessage: 'No matching data row for case/environment',
        localArtifacts: [],
      };
    }

    const args = this.argsBuilder.build(dataRow);
    logger.step(`Playwright CLI: case ${testCase.id} "${testCase.title}" -> npx playwright test ${args.join(' ')}`);

    const started = Date.now();
    await this.reportReader.reset();
    const commandResult = await this.commandRunner.run(args, {
      ...process.env,
      WEB_BASE_URL: env.baseUrl,
    });
    const report = await this.reportReader.read(commandResult.stdout);
    const stats = report?.stats;
    const failedCount = stats?.unexpected ?? (commandResult.exitCode === 0 ? 0 : 1);
    const skippedCount = stats?.skipped ?? 0;
    const totalCount = (stats?.expected ?? 0) + failedCount + (stats?.flaky ?? 0) + skippedCount;
    const status = commandResult.exitCode === 0 ? 'passed' : 'failed';
    const durationMs = Math.round(stats?.duration ?? Date.now() - started);
    const errorMessage = status === 'failed'
      ? this.failureFormatter.message(report, commandResult.stderr, commandResult.exitCode)
      : undefined;

    const steps: StepResult[] = [
      {
        description: `playwright test ${args.join(' ')}`.trim(),
        expected: 'exit code 0',
        actual: `exit code ${commandResult.exitCode}; total=${totalCount} failed=${failedCount} skipped=${skippedCount}`,
        passed: status === 'passed',
      },
    ];

    const localArtifacts: LocalArtifact[] = [
      { kind: 'html-report', name: `case-${testCase.id}-playwright-report`, path: join(this.cwd, 'playwright-report') },
      { kind: 'log', name: `case-${testCase.id}-playwright-results.json`, path: join(this.cwd, PLAYWRIGHT_JSON_REPORT_PATH) },
    ];

    return {
      caseId: testCase.id,
      status,
      durationMs,
      steps,
      errorMessage,
      localArtifacts,
    };
  }

}

/**
 * Deterministic stub runner.
 *
 * Rules used to simulate outcomes without a browser:
 *   - No data row            -> blocked.
 *   - Expected value "FAIL"  -> failed (forces the failure/bug path in demos).
 *   - Tag "@flaky"           -> fails on first attempt, passes on re-run
 *                               (tracked via an attempt counter per case).
 *   - Otherwise              -> passed.
 */
export class StubPlaywrightRunner implements PlaywrightRunner {
  private readonly attempts = new Map<string, number>();

  async execute(testCase: TestCase, dataRow: DataRow | undefined, env: RunEnvironment): Promise<ExecutionResult> {
    const attempt = (this.attempts.get(testCase.id) ?? 0) + 1;
    this.attempts.set(testCase.id, attempt);

    logger.step(`Playwright: case ${testCase.id} "${testCase.title}" on ${env.name} (attempt ${attempt})`);

    if (!dataRow) {
      return {
        caseId: testCase.id,
        status: 'blocked',
        durationMs: 0,
        steps: [],
        errorMessage: 'No matching data row for case/environment',
        localArtifacts: [],
      };
    }

    const isFlaky = testCase.tags.includes('@flaky');
    const wantsFail = Object.values(dataRow.expected).some((v) => v.toUpperCase() === 'FAIL');

    // Flaky cases fail their first attempt, then pass.
    const fails = wantsFail || (isFlaky && attempt === 1);

    const steps: StepResult[] = Object.entries(dataRow.expected).map(([key, expected]) => {
      const actual = fails ? `${expected}__mismatch` : expected;
      return { description: `assert ${key}`, expected, actual, passed: !fails };
    });

    const localArtifacts: LocalArtifact[] = [
      { kind: 'trace', name: `case-${testCase.id}-attempt${attempt}.zip`, path: `/tmp/case-${testCase.id}.zip` },
    ];
    if (fails) {
      localArtifacts.push(
        { kind: 'screenshot', name: `case-${testCase.id}-failure.png`, path: `/tmp/case-${testCase.id}.png` },
        { kind: 'video', name: `case-${testCase.id}-failure.webm`, path: `/tmp/case-${testCase.id}.webm` },
      );
    }

    return {
      caseId: testCase.id,
      status: fails ? 'failed' : 'passed',
      durationMs: 200 + Math.floor(Math.random() * 800),
      steps,
      errorMessage: fails ? `Assertion failed for case ${testCase.id}` : undefined,
      localArtifacts,
    };
  }
}
