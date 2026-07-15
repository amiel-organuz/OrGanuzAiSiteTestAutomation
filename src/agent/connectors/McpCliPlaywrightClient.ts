import { logger } from '../../utils/logger';
import type { McpCliOptions, PageSnapshot, PlaywrightMcpClient } from '../../types/agent.types';

/**
 * A {@link PlaywrightMcpClient} backed by the real **Playwright MCP CLI server**.
 *
 * It launches `npx @playwright/mcp` as a subprocess and speaks MCP over stdio,
 * forwarding {@link navigate}/{@link snapshot} to the server's `browser_navigate`
 * and `browser_snapshot` tools. Feed it to {@link McpPageExplorer} to explore a
 * live page and to {@link TestPlanAgent} to generate a plan from a real URL.
 *
 * `@modelcontextprotocol/sdk` and `@playwright/mcp` are loaded lazily via
 * `require`, so they stay optional: the offline `StubPageExplorer` path never
 * touches them, and the build does not depend on the SDK's package `exports`
 * resolution (this project compiles with classic node module resolution).
 */

/** Minimal structural view of the MCP SDK bits this client uses. */
interface McpToolResult {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}
interface McpClientLike {
  connect(transport: unknown): Promise<void>;
  callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<McpToolResult>;
  close(): Promise<void>;
}

export class McpCliPlaywrightClient implements PlaywrightMcpClient {
  private client?: McpClientLike;

  constructor(private readonly options: McpCliOptions = {}) {}

  /** Spawn the MCP server and open the stdio session (idempotent). */
  async connect(): Promise<void> {
    if (this.client) return;

    let ClientCtor: new (info: { name: string; version: string }) => McpClientLike;
    let TransportCtor: new (opts: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    }) => unknown;
    try {
      ({ Client: ClientCtor } = require('@modelcontextprotocol/sdk/client/index.js'));
      ({ StdioClientTransport: TransportCtor } = require('@modelcontextprotocol/sdk/client/stdio.js'));
    } catch (err) {
      throw new Error(
        'The live Playwright MCP client requires @modelcontextprotocol/sdk and @playwright/mcp. ' +
          'Install them with `npm i -D @modelcontextprotocol/sdk @playwright/mcp`. ' +
          `Underlying error: ${(err as Error).message}`,
      );
    }

    // Resolve the version pinned in package-lock.json. Using `@latest` here made a
    // previously green build download and execute unreviewed code at runtime and
    // allowed upstream releases to break the agent without a repository change.
    const serverSpec = this.options.serverSpec ?? '@playwright/mcp';
    const args = [
      serverSpec,
      ...(this.options.headless === false ? [] : ['--headless']),
      ...(this.options.isolated === false ? [] : ['--isolated']),
      ...(this.options.args ?? []),
    ];
    logger.step(`Playwright MCP: launching \`npx ${args.join(' ')}\``);

    const transport = new TransportCtor({
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args,
      env: process.env as Record<string, string>,
    });
    const client = new ClientCtor({ name: 'organuz-test-plan-agent', version: '1.0.0' });
    await client.connect(transport);
    this.client = client;
  }

  async navigate(url: string): Promise<void> {
    await this.callTool('browser_navigate', { url });
  }

  async snapshot(): Promise<PageSnapshot> {
    const text = await this.callTool('browser_snapshot', {});
    return parseMcpSnapshotText(text);
  }

  /** Close the session and stop the MCP server subprocess. */
  async close(): Promise<void> {
    if (!this.client) return;
    await this.client.close();
    this.client = undefined;
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    await this.connect();
    const result = await this.client!.callTool({ name, arguments: args });
    const text = (result.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n');
    if (result.isError) {
      throw new Error(`Playwright MCP tool "${name}" failed: ${text || '(no detail)'}`);
    }
    return text;
  }
}

/**
 * Parse the text a Playwright MCP `browser_navigate`/`browser_snapshot` call
 * returns into a {@link PageSnapshot}. The response carries `- Page URL:` /
 * `- Page Title:` header lines and the accessibility tree inside a fenced
 * ```yaml``` block under `- Page Snapshot:`. Exported for direct unit testing.
 */
export function parseMcpSnapshotText(text: string): PageSnapshot {
  const url = /-\s*Page URL:\s*(.+)/i.exec(text)?.[1]?.trim();
  const title = /-\s*Page Title:\s*(.+)/i.exec(text)?.[1]?.trim();

  const afterSnapshot = text.split(/-\s*Page Snapshot:/i)[1] ?? text;
  const fenced = /```(?:ya?ml)?\s*\n([\s\S]*?)```/.exec(afterSnapshot);
  const tree = (fenced ? fenced[1] : afterSnapshot).trim();

  return { url, title, tree };
}
