import { logger } from '../../utils/logger';
import type {
  DiscoveredControl,
  DiscoveredForm,
  DiscoveredLink,
  PageExplorer,
  PageExploration,
  PageSnapshot,
  PlaywrightMcpClient,
} from '../../types/agent.types';

/**
 * Page exploration connector.
 *
 * Given a URL, it opens the page and reports the affordances worth testing —
 * headings, navigation links, forms, and interactive controls. The result is a
 * transport-agnostic {@link PageExploration}: nothing downstream knows whether
 * it came from a real browser driven by the Playwright MCP or the offline stub.
 *
 * The real implementation ({@link McpPageExplorer}) drives the **Playwright MCP**
 * — `browser_navigate` to open the URL, then `browser_snapshot` to read the
 * accessibility tree — and parses that snapshot into the structure below. The
 * MCP tool calls themselves are injected as a {@link PlaywrightMcpClient} so this
 * module stays free of any tool binding and remains unit-testable offline.
 */

/** Roles that count as fillable form fields in a snapshot. */
const FIELD_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider']);
/** Roles surfaced as generic interactive controls (excluding links/fields). */
const CONTROL_ROLES = new Set(['button', 'tab', 'checkbox', 'radio', 'switch', 'menuitem', 'link']);
/** One accessibility-tree node: `- <role> "<name>" [attr=val]`. */
const NODE_RE = /^\s*-?\s*(\w[\w-]*)\s+"([^"]*)"(.*)$/;
const HREF_RE = /\/url:\s*(\S+)|href[=:]\s*"?([^"\s\]]+)/i;
/** A child `- /url: <href>` line under a link node in the MCP aria format. */
const URL_CHILD_RE = /^\s*-?\s*\/url:\s*(\S+)/;
const SUBMIT_HINT = /(submit|sign in|log in|login|search|send|continue|save|register)/i;

/**
 * Real explorer: drives the Playwright MCP to open the URL and read the page,
 * then parses the accessibility snapshot into a {@link PageExploration}.
 */
export class McpPageExplorer implements PageExplorer {
  constructor(private readonly client: PlaywrightMcpClient) {}

  async explore(url: string): Promise<PageExploration> {
    logger.step(`PageExplorer(MCP): navigate ${url}`);
    await this.client.navigate(url);
    const snapshot = await this.client.snapshot();
    const exploration = parseSnapshot(url, snapshot);
    logger.step(
      `PageExplorer(MCP): "${exploration.title}" — ${exploration.links.length} links, ` +
        `${exploration.forms.length} forms, ${exploration.controls.length} controls`,
    );
    return exploration;
  }
}

/**
 * Parse a Playwright MCP accessibility snapshot into a {@link PageExploration}.
 * Exported for direct unit testing of the parser without a browser.
 */
export function parseSnapshot(requestedUrl: string, snapshot: PageSnapshot): PageExploration {
  const headings: string[] = [];
  const links: DiscoveredLink[] = [];
  const controls: DiscoveredControl[] = [];
  const fieldNames: string[] = [];
  let submitLabel: string | undefined;
  // The Playwright MCP aria format puts a link's target on a following child
  // line (`- /url: /pricing`); attach it to the link we most recently saw.
  let lastLink: DiscoveredLink | undefined;

  for (const rawLine of snapshot.tree.split('\n')) {
    const urlChild = URL_CHILD_RE.exec(rawLine);
    if (urlChild) {
      if (lastLink && !lastLink.href) lastLink.href = urlChild[1];
      continue;
    }

    const match = NODE_RE.exec(rawLine);
    if (!match) continue;
    const role = match[1].toLowerCase();
    const name = match[2].trim();
    const rest = match[3] ?? '';
    if (!name) continue;

    if (role === 'heading') {
      headings.push(name);
    } else if (role === 'link') {
      const href = extractHref(rest);
      let link = links.find((l) => l.text === name && l.href === href);
      if (!link) {
        link = { text: name, href };
        links.push(link);
      }
      lastLink = link;
      controls.push({ role, name });
    } else if (FIELD_ROLES.has(role)) {
      if (!fieldNames.includes(name)) fieldNames.push(name);
    } else if (role === 'button' && SUBMIT_HINT.test(name) && !submitLabel) {
      submitLabel = name;
      controls.push({ role, name });
    } else if (CONTROL_ROLES.has(role)) {
      controls.push({ role, name });
    }
  }

  const forms: DiscoveredForm[] =
    fieldNames.length > 0 ? [{ name: 'primary form', fields: fieldNames, submitLabel }] : [];

  return {
    url: snapshot.url || requestedUrl,
    title: (snapshot.title || '').trim() || requestedUrl,
    headings,
    links,
    forms,
    controls,
  };
}

function extractHref(rest: string): string {
  const m = HREF_RE.exec(rest);
  return (m && (m[1] || m[2])) || '';
}

/**
 * Deterministic offline explorer. Synthesises a plausible page surface from the
 * URL alone so the agent, its demo, and its tests run without a browser or
 * network. Swap in {@link McpPageExplorer} for real exploration.
 */
export class StubPageExplorer implements PageExplorer {
  async explore(url: string): Promise<PageExploration> {
    logger.step(`PageExplorer(stub): synthesising surface for ${url}`);
    let host = url;
    try {
      host = new URL(url).host || url;
    } catch {
      /* keep the raw string when the URL is not parseable */
    }
    return {
      url,
      title: `${host} — home`,
      headings: ['Welcome', 'Features', 'Pricing'],
      links: [
        { text: 'Home', href: '/' },
        { text: 'Pricing', href: '/pricing' },
        { text: 'Docs', href: '/docs' },
        { text: 'Sign in', href: '/login' },
      ],
      forms: [{ name: 'primary form', fields: ['Email', 'Password'], submitLabel: 'Sign in' }],
      controls: [
        { role: 'button', name: 'Get started' },
        { role: 'button', name: 'Sign in' },
      ],
    };
  }
}
