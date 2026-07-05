/**
 * Anon write-protection tests for organuz /rest/v1/projects.
 *
 * api-security.spec.ts already proves INSERT is rejected (401/403 via RLS). PostgREST
 * handles UPDATE/DELETE differently: with no anon UPDATE/DELETE policy the request is
 * accepted but matches zero rows, so `return=representation` comes back as `[]`. These
 * assert exactly that — anon cannot mutate data. A non-existent id is used so no real
 * row is ever targeted, even in the impossible case a policy were open.
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

// A syntactically valid UUID that does not identify any real project row.
const NONEXISTENT_ID = '00000000-0000-4000-8000-000000000000';

test.describe('Organuz API anon write protection', { tag: ['@organuz-api', '@security'] }, () => {
  test('anon PATCH modifies zero rows (no UPDATE policy)', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Read-only anon (UPDATE)');
    await allureSeverity('critical');

    await allureStep('PATCH a non-existent row and assert an empty representation', async () => {
      const response = await organuzApi.updateProject(NONEXISTENT_ID, {
        status: 'qa-automation-should-never-persist',
      });
      expect(response.status()).toBe(ApiConstants.OK);
      // return=representation lists the affected rows — none for the anon role.
      await expect(response.json()).resolves.toEqual([]);
    });
  });

  test('anon DELETE removes zero rows (no DELETE policy)', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Security');
    await allureStory('Read-only anon (DELETE)');
    await allureSeverity('critical');

    await allureStep('DELETE a non-existent row and assert an empty representation', async () => {
      const response = await organuzApi.deleteProject(NONEXISTENT_ID);
      expect(response.status()).toBe(ApiConstants.OK);
      await expect(response.json()).resolves.toEqual([]);
    });
  });
});
