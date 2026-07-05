/**
 * Additional PostgREST query-surface tests for organuz /rest/v1/projects.
 * Complements resources/projects.spec.ts (limit, order desc, exact count, id filter)
 * with ascending order, offset pagination, `in` / numeric-range filters, and a
 * body-less exact count. All read-only.
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

test.describe('Organuz projects query surface', { tag: ['@organuz-api', '@resource'] }, () => {
  test('order=solar_capacity_kw.asc returns rows in ascending capacity', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('order asc');
    await allureSeverity('normal');

    await allureStep('Assert each row capacity >= the previous one', async () => {
      const rows: Project[] = await (
        await organuzApi.getProjects({ params: { select: 'solar_capacity_kw', order: 'solar_capacity_kw.asc' } })
      ).json();
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].solar_capacity_kw).toBeGreaterThanOrEqual(rows[i - 1].solar_capacity_kw);
      }
    });
  });

  test('offset paginates past the first row', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('offset pagination');
    await allureSeverity('normal');

    await allureStep('offset=1 yields a different first id than offset=0', async () => {
      const params = { select: 'id', order: 'id.asc', limit: 1 };
      const [first]: Project[] = await (await organuzApi.getProjects({ params: { ...params, offset: 0 } })).json();
      const secondPage: Project[] = await (await organuzApi.getProjects({ params: { ...params, offset: 1 } })).json();

      // Only meaningful when the table holds more than one row.
      test.skip(secondPage.length === 0, 'projects table has a single row; nothing to page to');
      expect(secondPage[0].id).not.toBe(first.id);
    });
  });

  test('in.() filter returns exactly the requested id set', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('in filter');
    await allureSeverity('normal');

    await allureStep('Pick two ids, re-query with id=in.(a,b), assert the same set', async () => {
      const sample: Project[] = await (await organuzApi.getProjects({ params: { select: 'id', limit: 2 } })).json();
      test.skip(sample.length < 2, 'need at least two rows to test an id set');
      const ids = sample.map((p) => p.id);

      const rows: Project[] = await (
        await organuzApi.getProjects({ params: { select: 'id', id: `in.(${ids.join(',')})` } })
      ).json();
      expect(rows.map((p) => p.id).sort()).toEqual([...ids].sort());
    });
  });

  test('numeric range filter returns only rows satisfying the predicate', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('numeric range filter');
    await allureSeverity('normal');

    await allureStep('solar_capacity_kw=gte.0 → every returned row has capacity >= 0', async () => {
      const rows: Project[] = await (
        await organuzApi.getProjects({ params: { select: 'solar_capacity_kw', solar_capacity_kw: 'gte.0' } })
      ).json();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.solar_capacity_kw).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test('limit=0 with count=exact returns the total in Content-Range and an empty body', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects resource');
    await allureStory('body-less exact count');
    await allureSeverity('normal');

    await allureStep('Parse the "*/N" total and assert an empty array body', async () => {
      const response = await organuzApi.getProjects({
        params: { select: 'id', limit: 0 },
        headers: { Prefer: 'count=exact' },
      });
      const rows: Project[] = await response.json();
      expect(rows).toEqual([]);

      const contentRange = response.headers()['content-range'];
      expect(contentRange, 'Content-Range header missing').toBeTruthy();
      const total = Number(contentRange.split('/')[1]);
      expect(Number.isInteger(total)).toBe(true);
      expect(total).toBeGreaterThan(0);
    });
  });
});
