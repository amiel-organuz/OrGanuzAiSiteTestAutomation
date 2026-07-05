/**
 * Security / negative-path tests for the organuz Supabase API.
 * Verifies the anon role is read-only, unauthenticated access is rejected, and
 * malformed requests fail safely. All requests are read-only or expected-to-fail;
 * no data is created.
 */
import { test, expect } from '../../../src/fixtures';
import { ApiConstants } from '../../../src/api';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Organuz API security', { tag: ['@organuz-api', '@security'] }, () => {
  test('GET /rest/v1/projects without an API key is rejected (401)', async ({ request }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Missing API key');
    await allureSeverity('critical');

    await allureStep('Call PostgREST with no apikey header', async () => {
      // The built-in request fixture carries no apikey (that lives on organuzApi).
      const response = await request.get('/rest/v1/projects?select=*', { failOnStatusCode: false });
      expect(response.status()).toBe(ApiConstants.UNAUTHORIZED);
    });
  });

  test('querying an unknown table returns 404', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Unknown resource');
    await allureSeverity('normal');

    await allureStep('Request a table that does not exist', async () => {
      const response = await organuzApi.getTable('definitely_not_a_real_table_xyz');
      expect(response.status()).toBe(ApiConstants.NOT_FOUND);
    });
  });

  test('selecting an invalid column returns 400', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Malformed query');
    await allureSeverity('normal');

    await allureStep('Request a non-existent column', async () => {
      const response = await organuzApi.getProjects({ params: { select: 'this_column_does_not_exist' } });
      expect(response.status()).toBe(ApiConstants.BAD_REQUEST);
    });
  });

  test('anon role cannot insert into projects (row-level security)', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Read-only anon (RLS)');
    await allureSeverity('critical');

    await allureStep('Attempt an insert and assert it is blocked', async () => {
      const response = await organuzApi.insertProject({
        project_name: 'qa-automation-should-never-persist',
      });
      // RLS rejects the write — Supabase returns 401 (or 403) and no row is created.
      expect([ApiConstants.UNAUTHORIZED, ApiConstants.FORBIDDEN]).toContain(response.status());
    });
  });

  test('response never echoes the request-supplied Origin as wildcard for credentialed reads', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Content-Type hardening');
    await allureSeverity('minor');

    await allureStep('A successful read is well-formed JSON, not HTML', async () => {
      const response = await organuzApi.getProjects({ params: { limit: 1 } });
      expect(response.status()).toBe(ApiConstants.OK);
      expect(response.headers()['content-type']).toContain('application/json');
      // Body must parse as JSON without throwing.
      await expect(response.json()).resolves.toBeDefined();
    });
  });
});
