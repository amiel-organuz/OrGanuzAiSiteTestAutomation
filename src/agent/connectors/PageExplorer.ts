import { logger } from '../../utils/logger';

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
export interface PageExplorer {
  /** Open `url`, explore the page, and report its testable affordances. */
  explore(url: string): Promise<PageExploration>;
}

/** A discovered navigation link. */
export interface DiscoveredLink {
  text: string;
  href: string;
}

/** A discovered form and the fields a test would need to fill. */
export interface DiscoveredForm {
  /** Accessible name of the form, or a synthesised label. */
  name: string;
  /** Accessible names of the input/textbox/combobox fields. */
  fields: string[];
  /** Label of the submit control, when one is present. */
  submitLabel?: string;
}

/** A discovered interactive control (button, tab, checkbox, …). */
export interface DiscoveredControl {
  /** ARIA role, e.g. "button", "tab", "checkbox". */
  role: string;
  /** Accessible name. */
  name: string;
}

/** The testable surface of a single page. */
export interface PageExploration {
  url: string;
  title: string;
  headings: string[];
  links: DiscoveredLink[];
  forms: DiscoveredForm[];
  controls: DiscoveredControl[];
}

/**
 * Thin transport over the Playwright MCP browser tools. A caller wires these to
 * the actual MCP tool invocations (`browser_navigate`, `browser_snapshot`), or
 * to the `@playwright/test` API, or to a fake in tests.
 */
export interface PlaywrightMcpClient {
  /** Navigate the shared browser tab to `url` (maps to `browser_navigate`). */
  navigate(url: string): Promise<void>;
  /** Return the current page's accessibility snapshot (maps to `browser_snapshot`). */
  snapshot(): Promise<PageSnapshot>;
}

/** The subset of a Playwright MCP snapshot this explorer consumes. */
export interface PageSnapshot {
  /** Page URL after any redirects. */
  url?: string;
  /** Document title. */
  title?: string;
  /**
   * The accessibility tree as emitted by `browser_snapshot`: one node per line,
   * e.g. `- link "Home" [ref=e3]` or `- heading "Welcome" [level=1]`.
   */
  tree: string;
}

/** Roles that count as fillable form fields in a snapshot. */
const FIELD_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider']);
/** Roles surfaced as generic interactive controls (excluding links/fields). */
const CONTROL_ROLES = new Set(['button', 'tab', 'checkbox', 'radio', 'switch', 'menuitem', 'link']);
/** One accessibility-tree node: `- <role> "<name>" [attr=val]`. */
const NODE_RE = /^\s*-?\s*(\w[\w-]*)\s+"([^"]*)"(.*)$/;
const HREF_RE = /\/url:\s*(\S+)|href[=:]\s*"?([^"\s\]]+)/i;
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

  for (const rawLine of snapshot.tree.split('\n')) {
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
      if (!links.some((l) => l.text === name && l.href === href)) {
        links.push({ text: name, href });
      }
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
