/**
 * Resource behaviour tests for organuz /rest/v1/projects — the PostgREST query
 * surface the site actually uses: filtering, ordering, limiting, counting, and
 * single-object retrieval.
 */
import { test, expect } from '../../../src/fixtures';
import { Project } from '../../../src/types/organuz.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Organuz projects resource', { tag: ['@organuz-api', '@resource'] }, () => {
  test('limit caps the number of returned rows', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('limit');
    await allureSeverity('normal');

    await allureStep('Request limit=1 and assert a single row', async () => {
      const rows: Project[] = await (await organuzApi.getProjects({ params: { limit: 1 } })).json();
      expect(rows.length).toBe(1);
    });
  });

  test('order=solar_capacity_kw.desc returns rows in descending capacity', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('order');
    await allureSeverity('normal');

    await allureStep('Assert each row capacity <= the previous one', async () => {
      const rows: Project[] = await (
        await organuzApi.getProjects({ params: { select: 'solar_capacity_kw', order: 'solar_capacity_kw.desc' } })
      ).json();
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].solar_capacity_kw).toBeLessThanOrEqual(rows[i - 1].solar_capacity_kw);
      }
    });
  });

  test('Prefer: count=exact returns a Content-Range total matching the row count', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('exact count');
    await allureSeverity('normal');

    await allureStep('Parse Content-Range total and compare to array length', async () => {
      const response = await organuzApi.getProjects({ headers: { Prefer: 'count=exact' } });
      const rows: Project[] = await response.json();
      const contentRange = response.headers()['content-range'];
      expect(contentRange, 'Content-Range header missing').toBeTruthy();

      // Format is "start-end/total", e.g. "0-4/5".
      const total = Number(contentRange.split('/')[1]);
      expect(Number.isNaN(total)).toBe(false);
      expect(total).toBeGreaterThan(0);
      expect(rows.length).toBe(total);
    });
  });

  test('filtering by an existing id returns exactly that project', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('eq filter');
    await allureSeverity('critical');

    await allureStep('Pick an id, re-query by it, assert single exact match', async () => {
      const [first]: Project[] = await (await organuzApi.getProjects({ params: { limit: 1 } })).json();
      const filtered: Project[] = await (await organuzApi.getProjectById(first.id)).json();
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(first.id);
      expect(filtered[0].project_name).toBe(first.project_name);
    });
  });

  test('filtering by a non-existent id returns an empty array', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('empty result set');
    await allureSeverity('normal');

    await allureStep('Query a random UUID and assert []', async () => {
      const response = await organuzApi.getProjectById('00000000-0000-0000-0000-000000000000');
      expect(response.status()).toBe(200);
      const rows: Project[] = await response.json();
      expect(rows).toEqual([]);
    });
  });

  test('single-object Accept header returns an object, not an array', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('vnd.pgrst.object+json');
    await allureSeverity('normal');

    await allureStep('Request one project as a scalar object', async () => {
      const [first]: Project[] = await (await organuzApi.getProjects({ params: { limit: 1 } })).json();
      const response = await organuzApi.getProjectById(first.id, {
        headers: { Accept: 'application/vnd.pgrst.object+json' },
      });
      expect(response.status()).toBe(200);
      const body: Project = await response.json();
      expect(Array.isArray(body)).toBe(false);
      expect(body.id).toBe(first.id);
    });
  });
});
