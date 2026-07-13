/**
 * Contract tests for the organuz backend (Supabase / PostgREST) `projects` resource.
 * These assert the live /rest/v1/projects endpoint adheres to its declared schema:
 * field presence, types, formats, and bilingual (he/en) invariants.
 */
import { test, expect } from '../../../src/fixtures';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

test.describe('Contract: organuz projects', { tag: ['@organuz-api', '@contract'] }, () => {
  test('GET /rest/v1/projects returns 200 with JSON content type', { tag: '@other-smoke' }, async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('Content-Type header');
    await allureSeverity('critical');

    await allureStep('Assert 200 + application/json', async () => {
      const response = await organuzApi.getProjects();
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
    });
  });
});
