/**
 * Integration tests for organuz /rest/v1/projects that span several requests and
 * assert cross-request consistency: paginated reads reconcile with the full table
 * and the exact count, and a single-row fetch round-trips against the list row.
 * All read-only.
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

/** Parse the total row count out of a PostgREST `Content-Range: a-b/N` header. */
function totalFromContentRange(contentRange: string | undefined): number {
  expect(contentRange, 'Content-Range header missing').toBeTruthy();
  return Number((contentRange as string).split('/')[1]);
}

test.describe('Organuz projects integration', { tag: ['@organuz-api', '@integration'] }, () => {
  test('paginated reads reconcile with the full table and the exact count', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects integration');
    await allureStory('Pagination reconciliation');
    await allureSeverity('critical');

    const total = await allureStep('Read the exact total via count=exact', async () => {
      const head = await organuzApi.getProjects({ params: { select: 'id', limit: 0 }, headers: { Prefer: 'count=exact' } });
      return totalFromContentRange(head.headers()['content-range']);
    });

    await allureStep('Page through with limit+offset and assert the union matches', async () => {
      const pageSize = 2;
      const pagedIds: string[] = [];
      for (let offset = 0; offset < total; offset += pageSize) {
        const rows: Project[] = await (
          await organuzApi.getProjects({ params: { select: 'id', order: 'id.asc', limit: pageSize, offset } })
        ).json();
        pagedIds.push(...rows.map((r) => r.id));
      }

      const fullIds: string[] = (
        await (await organuzApi.getProjects({ params: { select: 'id', order: 'id.asc' } })).json() as Project[]
      ).map((r) => r.id);

      expect(pagedIds).toEqual(fullIds);           // same order, no gaps/overlaps
      expect(new Set(pagedIds).size).toBe(total);  // no duplicates, matches the count
    });
  });

  test('a single-row fetch round-trips against the list row', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects integration');
    await allureStory('Read-by-id round trip');
    await allureSeverity('critical');

    await allureStep('For each listed project, GET it by id and assert deep equality', async () => {
      const list: Project[] = await (await organuzApi.getProjects({ params: { order: 'id.asc' } })).json();
      expect(list.length).toBeGreaterThan(0);

      for (const listed of list) {
        const [byId]: Project[] = await (await organuzApi.getProjectById(listed.id)).json();
        expect(byId, `project ${listed.id} not retrievable by id`).toBeDefined();
        expect(byId).toEqual(listed);
      }
    });
  });

  test('order + limit is a stable prefix of the fully ordered set', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects integration');
    await allureStory('Ordered prefix stability');
    await allureSeverity('normal');

    await allureStep('The first N by capacity desc equal the head of the full desc list', async () => {
      const params = { select: 'id,solar_capacity_kw', order: 'solar_capacity_kw.desc,id.asc' };
      const full: Project[] = await (await organuzApi.getProjects({ params })).json();
      const topTwo: Project[] = await (await organuzApi.getProjects({ params: { ...params, limit: 2 } })).json();

      expect(topTwo.map((p) => p.id)).toEqual(full.slice(0, topTwo.length).map((p) => p.id));
    });
  });
});
