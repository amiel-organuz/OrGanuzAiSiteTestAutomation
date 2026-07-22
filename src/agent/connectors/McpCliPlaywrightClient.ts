import { logger } from '../../utils/logger';
import type {
  DiscoveredRequest,
  McpCliOptions,
  PageSnapshot,
  PlaywrightMcpClient,
} from '../../types/agent.types';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;

/**
 * Environment variables the MCP subprocess is allowed to see. The client speaks
 * to a THIRD-PARTY package (`@playwright/mcp`), so it must NOT inherit the full
 * `process.env` — that would hand a dependency every secret dotenv loaded
 * (Supabase keys, product password, role phones/OTPs, Slack webhooks). Only the
 * vars needed to locate node/npx and reach the network are forwarded.
 */
const ENV_ALLOWLIST = [
  'PATH',
  'HOME',
  'TMPDIR',
  'TEMP',
  'TMP',
  'NODE_OPTIONS',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'http_proxy',
  'https_proxy',
  'no_proxy',
  'SystemRoot',
  'APPDATA',
  'LOCALAPPDATA',
];

/** Build the minimal, allowlisted env for the MCP subprocess. */
function minimalEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of ENV_ALLOWLIST) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return env;
}

/** Resolve the pinned `@playwright/mcp` spec (installed version, never a tag). */
function pinnedServerSpec(): string {
  try {
    const version = (require('@playwright/mcp/package.json') as { version: string }).version;
    return `@playwright/mcp@${version}`;
  } catch {
    // The package isn't installed; the connect() require will throw a clear error.
    return '@playwright/mcp';
  }
}

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

    // Pin to the installed version. Using `@latest` (or a bare tag) made a
    // previously green build download and execute unreviewed code at runtime and
    // allowed upstream releases to break the agent without a repository change.
    const serverSpec = this.options.serverSpec ?? pinnedServerSpec();
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
      // A minimal, allowlisted env — never the full process.env (see minimalEnv).
      env: minimalEnv(),
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

  /** Let a client-rendered page settle before snapshotting (`browser_wait_for`). */
  async waitForSettle(seconds: number): Promise<void> {
    await this.callTool('browser_wait_for', { time: seconds });
  }

  /** Console error/warning lines the page logged (`browser_console_messages`). */
  async consoleErrors(): Promise<string[]> {
    const text = await this.callTool('browser_console_messages', {});
    return parseConsoleErrors(text);
  }

  /** Network requests the page issued (`browser_network_requests`). */
  async networkRequests(): Promise<DiscoveredRequest[]> {
    const text = await this.callTool('browser_network_requests', {});
    return parseNetworkRequests(text);
  }

  /** Close the session and stop the MCP server subprocess. */
  async close(): Promise<void> {
    if (!this.client) return;
    await this.client.close();
    this.client = undefined;
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    await this.connect();
    const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = this.options.retries ?? DEFAULT_RETRIES;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await withTimeout(this.invoke(name, args), timeoutMs, name);
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          logger.step(`Playwright MCP tool "${name}" failed (attempt ${attempt + 1}/${retries + 1}); retrying`);
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  /** One raw tool call, without timeout/retry. */
  private async invoke(name: string, args: Record<string, unknown>): Promise<string> {
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

/** Reject if `promise` doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Playwright MCP tool "${label}" timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Pull error/warning lines out of a `browser_console_messages` payload. Lines are
 * shaped like `[ERROR] Uncaught TypeError: ...` — keep only errors and warnings.
 * Exported for direct unit testing.
 */
export function parseConsoleErrors(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\[?(error|warning|warn)\b/i.test(l) || /\b(error|uncaught|unhandled)\b/i.test(l))
    .filter((l) => l.length > 0);
}

/**
 * Parse a `browser_network_requests` payload into requests. Lines look like
 * `[GET] https://x/y => [200] OK` (status may be absent for in-flight requests).
 * Exported for direct unit testing.
 */
export function parseNetworkRequests(text: string): DiscoveredRequest[] {
  const out: DiscoveredRequest[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const method = /\[(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\]/i.exec(line)?.[1]?.toUpperCase() ?? 'GET';
    const url = /(https?:\/\/\S+?)(?:\s|=>|$)/.exec(line)?.[1];
    if (!url) continue;
    const status = Number(/=>\s*\[(\d{3})\]/.exec(line)?.[1] ?? '0');
    out.push({ method, url, status });
  }
  return out;
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
