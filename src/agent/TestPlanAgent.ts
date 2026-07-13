import { logger } from '../utils/logger';
import type { PageExplorer, PageExploration, TestCase, TestPlanOptions, TestSuite } from './types';

/**
 * Turns a **URL** into a draft **test plan**.
 *
 * The agent explores the live page through a {@link PageExplorer} (backed by the
 * Playwright MCP in production, a stub offline), then synthesises a
 * {@link TestSuite} of proposed {@link TestCase}s — page-load, headings, each
 * navigation link, and each form. The emitted suite is the exact shape the
 * `Orchestrator` reads from Azure DevOps, so a generated plan can be fed
 * straight into the existing run loop.
 */
export class TestPlanAgent {
  constructor(private readonly explorer: PageExplorer) {}

  /** Explore `url` and return a generated {@link TestSuite}. */
  async generatePlan(url: string, options: TestPlanOptions = {}): Promise<TestSuite> {
    logger.step(`TestPlanAgent: generating plan for ${url}`);
    const exploration = await this.explorer.explore(url);
    const suite = this.buildSuite(url, exploration, options);
    logger.step(`TestPlanAgent: generated ${suite.cases.length} case(s) for "${suite.name}"`);
    return suite;
  }

  /**
   * Pure synthesis: {@link PageExploration} -> {@link TestSuite}. Exposed for
   * direct unit testing without an explorer.
   */
  buildSuite(url: string, exploration: PageExploration, options: TestPlanOptions = {}): TestSuite {
    const host = hostOf(url);
    const slug = slugify(host);
    const baseTags = ['@generated', ...(options.tags ?? ['@smoke'])];
    const cases: TestCase[] = [];

    let seq = 0;
    const nextId = () => `TC-${slug}-${String(++seq).padStart(3, '0')}`;

    // 1. The page loads and renders its title.
    cases.push({
      id: nextId(),
      title: `${host} loads and renders its title`,
      steps: [`Navigate to ${url}`, 'Wait for the document to reach a loaded state'],
      acceptanceCriteria: [
        { id: 'AC-LOAD', description: `Page responds and the tab title is "${exploration.title}"` },
      ],
      tags: baseTags,
    });

    // 2. Primary headings are visible (one case covering the hero/section headings).
    if (exploration.headings.length > 0) {
      const shown = exploration.headings.slice(0, 5);
      cases.push({
        id: nextId(),
        title: `Key headings are visible on ${host}`,
        steps: [`Navigate to ${url}`, ...shown.map((h) => `Assert heading "${h}" is visible`)],
        acceptanceCriteria: shown.map((h, i) => ({
          id: `AC-H${i + 1}`,
          description: `Heading "${h}" is present and visible`,
        })),
        tags: baseTags,
      });
    }

    // 3. One reachability case per navigation link.
    for (const link of dedupeLinks(exploration.links)) {
      cases.push({
        id: nextId(),
        title: `Navigation link "${link.text}" is reachable`,
        steps: [
          `Navigate to ${url}`,
          `Click the "${link.text}" link`,
          link.href ? `Assert the URL navigates toward "${link.href}"` : 'Assert a navigation occurs',
        ],
        acceptanceCriteria: [
          {
            id: 'AC-NAV',
            description: link.href
              ? `Clicking "${link.text}" navigates to ${link.href} without an error page`
              : `Clicking "${link.text}" triggers a navigation without an error page`,
          },
        ],
        tags: baseTags,
      });
    }

    // 4. One case per form: fill required fields and submit.
    for (const form of exploration.forms) {
      const fieldList = form.fields.join(', ') || 'its fields';
      cases.push({
        id: nextId(),
        title: `The ${form.name} accepts input and submits`,
        steps: [
          `Navigate to ${url}`,
          `Fill ${fieldList}`,
          form.submitLabel ? `Click "${form.submitLabel}"` : 'Submit the form',
          'Assert no client-side validation error blocks a valid submission',
        ],
        acceptanceCriteria: [
          {
            id: 'AC-FORM',
            description: `${capitalise(form.name)} (${fieldList}) submits and reports success or a clear next state`,
          },
        ],
        tags: baseTags,
      });
    }

    const capped =
      options.maxCases && options.maxCases > 0 ? cases.slice(0, options.maxCases) : cases;

    return {
      planId: options.planId ?? `PLAN-${slug}`,
      suiteId: options.suiteId ?? `SUITE-${slug}`,
      name: options.name ?? `Generated plan — ${exploration.title}`,
      cases: capped,
    };
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'site';
}

function dedupeLinks(links: PageExploration['links']): PageExploration['links'] {
  const seen = new Set<string>();
  const out: PageExploration['links'] = [];
  for (const link of links) {
    const key = `${link.text}|${link.href}`;
    if (seen.has(key) || !link.text) continue;
    seen.add(key);
    out.push(link);
  }
  return out;
}

function capitalise(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}
