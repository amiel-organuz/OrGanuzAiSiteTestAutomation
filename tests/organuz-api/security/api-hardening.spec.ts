/**
 * Additional hardening tests for the organuz Supabase API.
 * Complements api-security.spec.ts (missing key, unknown table, invalid column,
 * insert RLS) with malformed credentials, injection-as-literal handling, and the
 * remaining anon write vectors (upsert, bulk insert). All read-only or expected-to-fail.
 */
import { test, expect } from '../../../src/fixtures';
import { ApiConstants } from '../../../src/api';
import { Project } from '../../../src/types/organuz.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

const NONEXISTENT_ID = '00000000-0000-4000-8000-000000000000';

test.describe('Organuz API hardening', { tag: ['@organuz-api', '@security'] }, () => {
  test('a malformed apikey is rejected (401)', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Malformed apikey');
    await allureSeverity('critical');

    await allureStep('Override apikey/Authorization with garbage and expect 401', async () => {
      const response = await organuzApi.getProjects({
        params: { select: 'id', limit: 1 },
        headers: { apikey: 'garbage-not-a-key', Authorization: 'Bearer garbage-not-a-key' },
      });
      expect(response.status()).toBe(ApiConstants.UNAUTHORIZED);
    });
  });

  test('a valid apikey with a tampered Authorization JWT is rejected (401)', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Tampered JWT');
    await allureSeverity('critical');

    await allureStep('Keep the anon apikey but send a bogus Bearer token', async () => {
      const response = await organuzApi.getProjects({
        params: { select: 'id', limit: 1 },
        headers: { Authorization: 'Bearer tampered.jwt.value' },
      });
      expect(response.status()).toBe(ApiConstants.UNAUTHORIZED);
    });
  });

  test('an injection-style filter value is treated as a literal, not executed', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('SQL injection is inert');
    await allureSeverity('critical');

    await allureStep("id=eq.(' OR '1'='1) fails uuid parsing rather than dumping rows", async () => {
      const response = await organuzApi.getProjects({ params: { select: 'id', id: "eq.' OR '1'='1" } });
      expect(response.status()).toBe(ApiConstants.BAD_REQUEST);
      const body: { message?: string } = await response.json();
      // PostgREST rejects it as an invalid uuid — the predicate never runs as SQL.
      expect(body.message ?? '').toMatch(/invalid input syntax for type uuid/i);
    });
  });

  test('anon upsert is rejected (401)', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Upsert blocked');
    await allureSeverity('critical');

    await allureStep('POST with Prefer: resolution=merge-duplicates is rejected', async () => {
      const response = await organuzApi.insertProject(
        { id: NONEXISTENT_ID, project_name: 'qa-automation-should-never-persist' },
        { headers: { Prefer: 'resolution=merge-duplicates' } },
      );
      expect([ApiConstants.UNAUTHORIZED, ApiConstants.FORBIDDEN]).toContain(response.status());
    });
  });

  test('anon bulk insert is rejected (401)', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Bulk insert blocked');
    await allureSeverity('critical');

    await allureStep('POST an array of rows and expect rejection', async () => {
      const response = await organuzApi.insertProject([
        { project_name: 'qa-a-should-never-persist' },
        { project_name: 'qa-b-should-never-persist' },
      ]);
      expect([ApiConstants.UNAUTHORIZED, ApiConstants.FORBIDDEN]).toContain(response.status());
    });
  });

  test('a rejected read never leaks project rows in the body', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('No data leak on error');
    await allureSeverity('normal');

    await allureStep('The 400 injection response body carries no project fields', async () => {
      const response = await organuzApi.getProjects({ params: { select: 'id', id: "eq.' OR '1'='1" } });
      const rows: Project[] | { message?: string } = await response.json();
      // An error object, not an array of rows.
      expect(Array.isArray(rows)).toBe(false);
    });
  });
});
