import type { DataRow, RunEnvironment, TestSuite } from '../types';

/**
 * Seed data for the offline demo run. Mirrors what the real connectors would
 * return: a small Azure DevOps suite, a couple of Google Sheets environments,
 * and parametrised data rows — including cases crafted to exercise the
 * pass / fail-and-file-bug / flaky-rerun / blocked-no-data paths.
 */

export const demoSuite: TestSuite = {
  planId: 'PLAN-1',
  suiteId: 'SUITE-1',
  name: 'Organuz Marketing Site — Smoke',
  cases: [
    {
      id: 'TC-101',
      title: 'Home page hero renders',
      steps: ['Open the site', 'Wait for hero', 'Assert headline text'],
      acceptanceCriteria: [{ id: 'AC-1', description: 'Hero headline is visible' }],
      tags: ['@smoke'],
    },
    {
      id: 'TC-102',
      title: 'Contact form submits',
      steps: ['Open /contact', 'Fill the form', 'Submit', 'Assert success toast'],
      acceptanceCriteria: [{ id: 'AC-2', description: 'Success toast appears' }],
      tags: ['@smoke'],
    },
    {
      id: 'TC-103',
      title: 'Blog list loads first page',
      steps: ['Open /blog', 'Assert at least one post card'],
      acceptanceCriteria: [{ id: 'AC-3', description: 'A post card is shown' }],
      tags: ['@smoke', '@flaky'],
    },
    {
      id: 'TC-104',
      title: 'Pricing CTA navigates to signup',
      steps: ['Open /pricing', 'Click primary CTA', 'Assert /signup'],
      acceptanceCriteria: [{ id: 'AC-4', description: 'Lands on /signup' }],
      tags: ['@smoke'],
    },
  ],
};

export const demoEnvironments: RunEnvironment[] = [
  { name: 'staging', baseUrl: 'https://staging.organuz.ai', storageStateRef: 'secret://qa/staging/storageState' },
  { name: 'prod', baseUrl: 'https://www.organuz.ai' },
];

export const demoDataRows: DataRow[] = [
  {
    caseId: 'TC-101',
    environment: 'staging',
    inputs: { path: '/' },
    expected: { headline: 'Organuz' },
  },
  {
    // Forces a failure -> exercises result write-back + bug filing.
    caseId: 'TC-102',
    environment: 'staging',
    inputs: { name: 'QA Bot', email: 'qa@organuz.ai' },
    expected: { toast: 'FAIL' },
  },
  {
    // @flaky case: fails first attempt, passes on the single re-run.
    caseId: 'TC-103',
    environment: 'staging',
    inputs: { path: '/blog' },
    expected: { firstCard: 'visible' },
  },
  // NOTE: TC-104 intentionally has NO data row -> exercises the "blocked" path.
];
