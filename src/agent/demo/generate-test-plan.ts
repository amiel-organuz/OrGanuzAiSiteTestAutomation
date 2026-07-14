/**
 * Generate a draft test plan from a URL — or from a `test_input/` folder.
 *
 *   npm run agent:plan -- https://www.organuz.ai            # offline stub
 *   npm run agent:plan -- https://www.organuz.ai --live     # real browser via Playwright MCP
 *   npm run agent:plan -- --input                           # read ./test_input (urls file + images)
 *   npm run agent:plan -- --input my_inputs --live          # read ./my_inputs, live browser
 *
 * Offline by default (the {@link StubPageExplorer}): no browser or network, so
 * it always prints a deterministic plan. With `--live`, it drives the real
 * **Playwright MCP CLI server** ({@link McpCliPlaywrightClient} →
 * {@link McpPageExplorer}), which launches `npx @playwright/mcp` to open the URL
 * in a real browser and read its accessibility snapshot.
 *
 * With `--input [dir]`, it reads a URL list + reference screenshots from the
 * folder (default `test_input/`) and emits one plan per URL, threading the
 * images through as visual-reference cases. Each generated case is a detailed
 * multi-step STD (objective, preconditions, priority, action→expected steps).
 */
import {
  McpCliPlaywrightClient,
  McpPageExplorer,
  StubPageExplorer,
  type PageExplorer,
} from '../connectors';
import { TestPlanAgent } from '../TestPlanAgent';
import { readTestInput } from '../testInput';
import type { TestSuite } from '../types';

/** Value that follows a flag (`--input dir`), or undefined when the flag is bare/absent. */
function flagValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i === -1) return undefined;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : undefined;
}

function printSuite(suite: TestSuite, source: string): void {
  console.log(`\n=== GENERATED TEST PLAN for ${source} ===`);
  console.log(`${suite.name}  [${suite.planId} / ${suite.suiteId}]  — ${suite.cases.length} cases\n`);
  for (const c of suite.cases) {
    console.log(`${c.id}  [${c.priority ?? 'P?'}]  ${c.title}  ${c.tags.join(' ')}`);
    if (c.objective) console.log(`    Objective: ${c.objective}`);
    for (const pre of c.preconditions ?? []) console.log(`    Pre: ${pre}`);
    if (c.detailedSteps?.length) {
      for (const s of c.detailedSteps) {
        console.log(`    ${s.index}. ${s.action}`);
        console.log(`       → Expected: ${s.expected}`);
      }
    } else {
      for (const step of c.steps) console.log(`    · ${step}`);
    }
    for (const ac of c.acceptanceCriteria) console.log(`    ✓ [${ac.id}] ${ac.description}`);
    console.log('');
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const live = argv.includes('--live');
  const headed = argv.includes('--headed');
  const useInput = argv.includes('--input');
  const inputDir = flagValue(argv, '--input') ?? 'test_input';
  const url = argv.find((a) => !a.startsWith('--') && a !== inputDir) || 'https://www.organuz.ai';

  let explorer: PageExplorer;
  let client: McpCliPlaywrightClient | undefined;
  if (live) {
    client = new McpCliPlaywrightClient({ headless: !headed });
    explorer = new McpPageExplorer(client);
  } else {
    explorer = new StubPageExplorer();
  }

  try {
    const agent = new TestPlanAgent(explorer);
    const suffix = live ? '(live via Playwright MCP)' : '(offline stub)';

    if (useInput) {
      const input = readTestInput(inputDir);
      console.log(
        `Read ${inputDir}/: ${input.urls.length} URL(s), ${input.images.length} reference image(s).`,
      );
      if (input.urls.length === 0) {
        console.error(
          `No URLs found in ${inputDir}/ (expected urls.txt or urls.json). Nothing to generate.`,
        );
        process.exit(1);
      }
      const suites = await agent.generatePlansFromInput(input);
      suites.forEach((suite, i) => printSuite(suite, `${input.urls[i]} ${suffix}`));
      console.log('=== SUITES (JSON) ===');
      console.log(JSON.stringify(suites, null, 2));
      return;
    }

    const suite = await agent.generatePlan(url);
    printSuite(suite, `${url} ${suffix}`);
    console.log('=== SUITE (JSON) ===');
    console.log(JSON.stringify(suite, null, 2));
  } finally {
    if (client) await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
