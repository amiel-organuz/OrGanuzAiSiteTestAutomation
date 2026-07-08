/**
 * Contract tests for the organuz backend (Supabase / PostgREST) `projects` resource.
 * These assert the live /rest/v1/projects endpoint adheres to its declared schema:
 * field presence, types, formats, and bilingual (he/en) invariants.
 */
import { test, expect } from '../../../src/fixtures';
import { Project, PROJECT_REQUIRED_FIELDS } from '../../../src/types/organuz.types';
import {
  allureEpic,
  allureFeature,
  allureStory,
  allureSeverity,
  allureStep,
} from '../../../src/utils/allure';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  test('response body is a non-empty array of projects', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('Top-level shape');
    await allureSeverity('critical');

    await allureStep('Assert body is an array with at least one row', async () => {
      const projects: Project[] = await (await organuzApi.getProjects()).json();
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });
  });

  test('every project exposes all required fields', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('Required fields');
    await allureSeverity('critical');

    await allureStep('Verify each required field is present on every row', async () => {
      const projects: Project[] = await (await organuzApi.getProjects()).json();
      for (const project of projects) {
        for (const field of PROJECT_REQUIRED_FIELDS) {
          expect(project, `project ${project.id} missing "${field}"`).toHaveProperty(field);
        }
      }
    });
  });

  test('field types match the declared Project schema', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('Field types');
    await allureSeverity('critical');

    await allureStep('Assert id/uuid, strings, numbers, and array types', async () => {
      const projects: Project[] = await (await organuzApi.getProjects()).json();
      for (const p of projects) {
        expect(p.id, `id "${p.id}" is not a UUID`).toMatch(UUID_RE);
        expect(typeof p.project_name).toBe('string');
        expect(p.project_name.length).toBeGreaterThan(0);
        expect(typeof p.client_name).toBe('string');
        expect(typeof p.status).toBe('string');
        expect(typeof p.solar_capacity_kw).toBe('number');
        expect(typeof p.storage_capacity_kwh).toBe('number');
        expect(typeof p.roi_years).toBe('number');
        expect(Number.isFinite(p.solar_capacity_kw)).toBe(true);
        expect(Array.isArray(p.ai_capabilities)).toBe(true);
        for (const cap of p.ai_capabilities) {
          expect(typeof cap).toBe('string');
        }
      }
    });
  });

  test('timestamps are valid ISO-8601 dates and updated_at >= created_at', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('Timestamp invariants');
    await allureSeverity('normal');

    await allureStep('Parse created_at / updated_at and compare', async () => {
      const projects: Project[] = await (await organuzApi.getProjects()).json();
      for (const p of projects) {
        const created = Date.parse(p.created_at);
        const updated = Date.parse(p.updated_at);
        expect(Number.isNaN(created), `created_at "${p.created_at}" unparseable`).toBe(false);
        expect(Number.isNaN(updated), `updated_at "${p.updated_at}" unparseable`).toBe(false);
        expect(updated).toBeGreaterThanOrEqual(created);
      }
    });
  });

  test('bilingual invariant: every localized field has a Hebrew counterpart', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('Bilingual fields');
    await allureSeverity('normal');

    await allureStep('Assert *_he fields are present and non-empty strings', async () => {
      const projects: Project[] = await (await organuzApi.getProjects()).json();
      for (const p of projects) {
        for (const field of ['project_name_he', 'client_name_he', 'description_he', 'location_he'] as const) {
          expect(typeof p[field]).toBe('string');
          expect(p[field].trim().length, `${field} empty on ${p.id}`).toBeGreaterThan(0);
        }
      }
    });
  });

  test('column projection returns only the requested fields', async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('PostgREST select projection');
    await allureSeverity('normal');

    await allureStep('select=id,project_name yields exactly those keys', async () => {
      const rows: Array<Record<string, unknown>> = await (
        await organuzApi.getProjects({ params: { select: 'id,project_name', limit: 1 } })
      ).json();
      expect(rows.length).toBe(1);
      expect(Object.keys(rows[0]).sort()).toEqual(['id', 'project_name']);
    });
  });
});
