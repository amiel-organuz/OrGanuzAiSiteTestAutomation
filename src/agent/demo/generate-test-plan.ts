/**
 * Generate a draft test plan from a URL.
 *
 *   npm run agent:plan -- https://www.organuz.ai            # offline stub
 *   npm run agent:plan -- https://www.organuz.ai --live     # real browser via Playwright MCP
 *
 * Offline by default (the {@link StubPageExplorer}): no browser or network, so
 * it always prints a deterministic plan. With `--live`, it drives the real
 * **Playwright MCP CLI server** ({@link McpCliPlaywrightClient} →
 * {@link McpPageExplorer}), which launches `npx @playwright/mcp` to open the URL
 * in a real browser and read its accessibility snapshot.
 */
import {
  McpCliPlaywrightClient,
  McpPageExplorer,
  StubPageExplorer,
  type PageExplorer,
} from '../connectors';
import { TestPlanAgent } from '../TestPlanAgent';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const live = argv.includes('--live');
  const headed = argv.includes('--headed');
  const url = argv.find((a) => !a.startsWith('--')) || 'https://www.organuz.ai';

  let explorer: PageExplorer;
  let client: McpCliPlaywrightClient | undefined;
  if (live) {
    client = new McpCliPlaywrightClient({ headless: !headed });
    explorer = new McpPageExplorer(client);
  } else {
    explorer = new StubPageExplorer();
  }

  try {
    const suite = await new TestPlanAgent(explorer).generatePlan(url);

    console.log(`\n=== GENERATED TEST PLAN for ${url} ${live ? '(live via Playwright MCP)' : '(offline stub)'} ===`);
    console.log(`${suite.name}  [${suite.planId} / ${suite.suiteId}]  — ${suite.cases.length} cases\n`);
    for (const c of suite.cases) {
      console.log(`${c.id}  ${c.title}  ${c.tags.join(' ')}`);
      for (const step of c.steps) console.log(`    · ${step}`);
      for (const ac of c.acceptanceCriteria) console.log(`    ✓ [${ac.id}] ${ac.description}`);
      console.log('');
    }

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
