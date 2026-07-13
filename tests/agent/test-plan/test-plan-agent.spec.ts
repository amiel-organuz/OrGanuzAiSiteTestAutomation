import { expect, test } from '@playwright/test';
import { TestPlanAgent } from '../../../src/agent/TestPlanAgent';
import { McpPageExplorer } from '../../../src/agent/connectors';
import type { PageSnapshot, PlaywrightMcpClient } from '../../../src/agent/connectors';

/**
 * A fake Playwright MCP client: records the navigated URL and returns a canned
 * accessibility snapshot — the exact shape `browser_snapshot` emits — so the
 * whole URL -> MCP -> exploration -> plan chain runs without a browser.
 */
class FakeMcpClient implements PlaywrightMcpClient {
  navigatedTo?: string;
  constructor(private readonly snap: PageSnapshot) {}
  async navigate(url: string): Promise<void> {
    this.navigatedTo = url;
  }
  async snapshot(): Promise<PageSnapshot> {
    return this.snap;
  }
}

const SNAPSHOT: PageSnapshot = {
  url: 'https://www.organuz.ai/',
  title: 'OrGanuz — AI energy platform',
  tree: [
    '- heading "Welcome to OrGanuz" [level=1]',
    '- heading "Features" [level=2]',
    '- link "Home" [ref=e1] /url: /',
    '- link "Pricing" [ref=e2] /url: /pricing',
    '- link "Home" [ref=e9] /url: /', // duplicate — must be de-duped
    '- textbox "Email"',
    '- textbox "Password"',
    '- button "Sign in" [ref=e5]',
    '- button "Toggle menu" [ref=e6]',
  ].join('\n'),
};

test.describe('TestPlanAgent', () => {
  test('generates a plan from a URL via the Playwright MCP explorer', { tag: '@other-smoke' }, async () => {
    const client = new FakeMcpClient(SNAPSHOT);
    const agent = new TestPlanAgent(new McpPageExplorer(client));

    const suite = await agent.generatePlan('https://www.organuz.ai');

    // The URL is the input: it reaches the MCP navigate call.
    expect(client.navigatedTo).toBe('https://www.organuz.ai');

    // Ids/name are derived from the host + page title.
    expect(suite.planId).toBe('PLAN-organuz-ai');
    expect(suite.suiteId).toBe('SUITE-organuz-ai');
    expect(suite.name).toContain('OrGanuz — AI energy platform');

    // Every generated case carries the @generated marker (+ default @smoke).
    for (const c of suite.cases) {
      expect(c.tags).toContain('@generated');
      expect(c.id).toMatch(/^TC-organuz-ai-\d{3}$/);
    }

    const titles = suite.cases.map((c) => c.title);
    // Page-load case, a headings case, one case per unique link, and a form case.
    expect(titles[0]).toBe('www.organuz.ai loads and renders its title');
    expect(titles.some((t) => t.includes('Key headings are visible'))).toBe(true);
    expect(titles.filter((t) => /Navigation link ".*" is reachable/.test(t))).toHaveLength(2); // Home + Pricing, de-duped
    expect(titles).toContain('The primary form accepts input and submits');

    // The form case picks up both textboxes and the submit button.
    const formCase = suite.cases.find((c) => c.title.includes('primary form'))!;
    expect(formCase.steps.some((s) => s.includes('Email, Password'))).toBe(true);
    expect(formCase.steps.some((s) => s.includes('Click "Sign in"'))).toBe(true);
  });
});
