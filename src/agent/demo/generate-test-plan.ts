/**
 * Generate a draft test plan from a URL.
 *
 *   npm run agent:plan -- https://www.organuz.ai
 *
 * Offline by default: it uses the {@link StubPageExplorer}, so it needs no
 * browser or network and always prints a deterministic plan. Point it at the
 * real Playwright MCP by constructing a `McpPageExplorer` with a
 * {@link PlaywrightMcpClient} that forwards `navigate`/`snapshot` to the MCP's
 * `browser_navigate` / `browser_snapshot` tools.
 */
import { StubPageExplorer } from '../connectors';
import { TestPlanAgent } from '../TestPlanAgent';

async function main(): Promise<void> {
  const url = process.argv[2] || 'https://www.organuz.ai';
  const agent = new TestPlanAgent(new StubPageExplorer());
  const suite = await agent.generatePlan(url);

  console.log(`\n=== GENERATED TEST PLAN for ${url} ===`);
  console.log(`${suite.name}  [${suite.planId} / ${suite.suiteId}]  — ${suite.cases.length} cases\n`);
  for (const c of suite.cases) {
    console.log(`${c.id}  ${c.title}  ${c.tags.join(' ')}`);
    for (const step of c.steps) console.log(`    · ${step}`);
    for (const ac of c.acceptanceCriteria) console.log(`    ✓ [${ac.id}] ${ac.description}`);
    console.log('');
  }

  console.log('=== SUITE (JSON) ===');
  console.log(JSON.stringify(suite, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
