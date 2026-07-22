import { logger } from '../utils/logger';
import type {
  AcceptanceCriterion,
  PageExplorer,
  PageExploration,
  TestCase,
  TestPlanInput,
  TestPlanOptions,
  TestPriority,
  TestStep,
  TestSuite,
} from './types';

/** A case blueprint before ids are assigned: the STD fields plus its steps. */
interface CaseDraft {
  title: string;
  objective: string;
  priority: TestPriority;
  /** Extra preconditions on top of the suite-wide baseline. */
  preconditions?: string[];
  /** Ordered [action, expected] pairs. */
  steps: Array<[action: string, expected: string]>;
  acceptanceCriteria: AcceptanceCriterion[];
}

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
   * Generate one {@link TestSuite} per URL in a {@link TestPlanInput} (as read
   * from the `test_input/` folder). The folder's images are threaded through as
   * `referenceImages`, so every generated plan carries a visual-reference case.
   */
  async generatePlansFromInput(
    input: TestPlanInput,
    options: TestPlanOptions = {},
  ): Promise<TestSuite[]> {
    logger.step(
      `TestPlanAgent: generating plans for ${input.urls.length} URL(s) with ${input.images.length} reference image(s)`,
    );
    const suites: TestSuite[] = [];
    for (const url of input.urls) {
      suites.push(await this.generatePlan(url, { ...options, referenceImages: input.images }));
    }
    return suites;
  }

  /**
   * Pure synthesis: {@link PageExploration} -> {@link TestSuite}, emitting
   * detailed multi-step **STD** cases (objective, preconditions, priority, and
   * ordered action→expected steps). Exposed for direct unit testing without an
   * explorer.
   */
  buildSuite(url: string, exploration: PageExploration, options: TestPlanOptions = {}): TestSuite {
    const host = hostOf(url);
    const slug = slugify(host);
    const baseTags = ['@generated', ...(options.tags ?? ['@smoke'])];
    // Suite-wide baseline every case inherits, so per-case preconditions stay focused.
    const baseline = [
      `The site under test (${host}) is reachable`,
      'A supported browser is open on a clean session (no auth, cookies cleared)',
    ];
    const drafts: CaseDraft[] = [];

    // 1. The page loads and renders its title.
    drafts.push({
      title: `${host} loads and renders its title`,
      objective: `Verify ${host} responds and renders its document title on a cold load.`,
      priority: 'P1',
      steps: [
        [`Navigate to ${url}`, 'The request returns 2xx and the page begins rendering (no error page)'],
        [
          'Wait for the document to reach a loaded state',
          'The DOM reaches "domcontentloaded" without a timeout',
        ],
        [
          'Read the browser tab title',
          `The tab title is "${exploration.title}"`,
        ],
      ],
      acceptanceCriteria: [
        { id: 'AC-LOAD', description: `Page responds and the tab title is "${exploration.title}"` },
      ],
    });

    // 2. Primary headings are visible (one case covering the hero/section headings).
    if (exploration.headings.length > 0) {
      const shown = exploration.headings.slice(0, 5);
      drafts.push({
        title: `Key headings are visible on ${host}`,
        objective: `Verify the primary headings that anchor ${host} render and are visible.`,
        priority: 'P2',
        steps: [
          [`Navigate to ${url}`, 'The page loads and the main content is rendered'],
          ...shown.map(
            (h): [string, string] => [
              `Assert heading "${h}" is visible`,
              `The heading "${h}" is present in the DOM and visible in the viewport`,
            ],
          ),
        ],
        acceptanceCriteria: shown.map((h, i) => ({
          id: `AC-H${i + 1}`,
          description: `Heading "${h}" is present and visible`,
        })),
      });
    }

    // 3. One reachability case per navigation link.
    for (const link of dedupeLinks(exploration.links)) {
      drafts.push({
        title: `Navigation link "${link.text}" is reachable`,
        objective: `Verify the "${link.text}" navigation link routes to its destination without an error page.`,
        priority: 'P2',
        preconditions: [`The "${link.text}" link is present in the page navigation`],
        steps: [
          [`Navigate to ${url}`, 'The page loads and the navigation is visible'],
          [
            `Click the "${link.text}" link`,
            'The click is accepted and a navigation is triggered',
          ],
          link.href
            ? [
                `Assert the URL navigates toward "${link.href}"`,
                `The resulting URL contains "${link.href}" and renders without an error page`,
              ]
            : ['Assert a navigation occurs', 'The URL changes and the target page renders without an error page'],
        ],
        acceptanceCriteria: [
          {
            id: 'AC-NAV',
            description: link.href
              ? `Clicking "${link.text}" navigates to ${link.href} without an error page`
              : `Clicking "${link.text}" triggers a navigation without an error page`,
          },
        ],
      });
    }

    // 4. One case per form: fill required fields and submit.
    for (const form of exploration.forms) {
      const fieldList = form.fields.join(', ') || 'its fields';
      const submitStep: [string, string] = form.submitLabel
        ? [`Click "${form.submitLabel}"`, 'The submit control is enabled and the submission is accepted']
        : ['Submit the form', 'The submission is accepted'];
      drafts.push({
        title: `The ${form.name} accepts input and submits`,
        objective: `Verify the ${form.name} accepts valid input and submits without a blocking client-side error.`,
        priority: 'P1',
        preconditions: [`The ${form.name} (${fieldList}) is rendered on the page`],
        steps: [
          [`Navigate to ${url}`, 'The page loads and the form is visible'],
          [`Fill ${fieldList}`, 'Each field accepts its value and shows no field-level validation error'],
          submitStep,
          [
            'Assert no client-side validation error blocks a valid submission',
            'The form reports success or advances to a clear next state (no validation error remains)',
          ],
        ],
        acceptanceCriteria: [
          {
            id: 'AC-FORM',
            description: `${capitalise(form.name)} (${fieldList}) submits and reports success or a clear next state`,
          },
        ],
      });
    }

    // 5. Runtime-health cases — only when the explorer captured diagnostics
    //    (the live MCP path). These turn what the browser observed on load into
    //    assertions: no console errors, and no broken (4xx/5xx) resources.
    const diagnostics = exploration.diagnostics;
    if (diagnostics) {
      const errs = diagnostics.consoleErrors.slice(0, 5);
      drafts.push({
        title: `${host} loads with no JavaScript console errors`,
        objective: `Verify ${host} loads without logging JavaScript errors to the browser console.`,
        priority: 'P1',
        steps: [
          [`Navigate to ${url} with the browser console open`, 'The page loads'],
          [
            'Read the browser console after load',
            errs.length > 0
              ? `No error-level messages are logged (observed on capture: ${errs.join(' | ')})`
              : 'No error-level messages are logged',
          ],
        ],
        acceptanceCriteria: [
          {
            id: 'AC-CONSOLE',
            description: `${host} logs no console errors on load`,
          },
        ],
      });

      const broken = diagnostics.failedRequests.slice(0, 5);
      drafts.push({
        title: `${host} loads without broken (4xx/5xx) network requests`,
        objective: `Verify ${host} issues no failing network requests (4xx/5xx) during a cold load.`,
        priority: 'P2',
        steps: [
          [`Navigate to ${url} with the network panel recording`, 'The page loads'],
          [
            'Inspect the recorded network requests',
            broken.length > 0
              ? `No request returns a 4xx/5xx status (observed on capture: ${broken
                  .map((r) => `${r.status} ${r.method} ${r.url}`)
                  .join(' | ')})`
              : 'No request returns a 4xx/5xx status',
          ],
        ],
        acceptanceCriteria: [
          {
            id: 'AC-NETWORK',
            description: `${host} issues no 4xx/5xx requests on load`,
          },
        ],
      });
    }

    // 6. Visual reference case — only when reference screenshots were supplied
    //    (e.g. from the `test_input/` folder). Carries the images as the baseline
    //    a tester compares the live layout against.
    const images = options.referenceImages ?? [];
    if (images.length > 0) {
      drafts.push({
        title: `${host} matches its reference screenshots`,
        objective: `Verify the live layout of ${host} matches the supplied reference screenshots.`,
        priority: 'P3',
        preconditions: [
          `Reference screenshots are available: ${images.map((p) => baseName(p)).join(', ')}`,
        ],
        steps: [
          [`Navigate to ${url}`, 'The page loads and the layout settles (fonts/images loaded)'],
          [
            'Capture a full-page screenshot of the live page',
            'A screenshot is produced without rendering errors',
          ],
          ...images.map(
            (img): [string, string] => [
              `Compare the live page against reference "${baseName(img)}"`,
              `The live layout matches "${baseName(img)}" within the agreed visual tolerance`,
            ],
          ),
        ],
        acceptanceCriteria: images.map((img, i) => ({
          id: `AC-VIS${i + 1}`,
          description: `Live layout matches reference "${baseName(img)}" within tolerance`,
        })),
      });
    }

    let seq = 0;
    const nextId = () => `TC-${slug}-${String(++seq).padStart(3, '0')}`;
    const cases: TestCase[] = drafts.map((d) => this.finaliseCase(d, nextId(), baseTags, baseline));

    const capped =
      options.maxCases && options.maxCases > 0 ? cases.slice(0, options.maxCases) : cases;

    return {
      planId: options.planId ?? `PLAN-${slug}`,
      suiteId: options.suiteId ?? `SUITE-${slug}`,
      name: options.name ?? `Generated plan — ${exploration.title}`,
      cases: capped,
    };
  }

  /** Turn a {@link CaseDraft} into a full STD {@link TestCase} with numbered steps. */
  private finaliseCase(
    draft: CaseDraft,
    id: string,
    baseTags: string[],
    baseline: string[],
  ): TestCase {
    const detailedSteps: TestStep[] = draft.steps.map(([action, expected], i) => ({
      index: i + 1,
      action,
      expected,
    }));
    return {
      id,
      title: draft.title,
      objective: draft.objective,
      priority: draft.priority,
      preconditions: [...baseline, ...(draft.preconditions ?? [])],
      detailedSteps,
      // Flattened action list — keeps the legacy `steps` contract the Orchestrator/ADO read.
      steps: detailedSteps.map((s) => s.action),
      acceptanceCriteria: draft.acceptanceCriteria,
      tags: baseTags,
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

/** Last path segment of a file path, for compact reference-image labels. */
function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}
