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
import { Project, PROJECT_REQUIRED_FIELDS } from '../../../src/types/organuz.types';

/** Fields the schema declares as numbers. */
const NUMERIC_FIELDS: Array<keyof Project> = ['solar_capacity_kw', 'storage_capacity_kwh', 'roi_years'];

/** English field paired with its Hebrew counterpart — both must be present and non-empty. */
const BILINGUAL_PAIRS: Array<[keyof Project, keyof Project]> = [
  ['project_name', 'project_name_he'],
  ['client_name', 'client_name_he'],
  ['description', 'description_he'],
  ['location', 'location_he'],
];

test.describe('Contract: organuz projects', { tag: ['@organuz-api', '@contract'] }, () => {
  test('GET /rest/v1/projects honors the projects schema contract', { tag: '@other-smoke' }, async ({ organuzApi }) => {
    await allureEpic('Organuz API');
    await allureFeature('Projects contract');
    await allureStory('projects resource schema');
    await allureSeverity('critical');

    let projects: Project[] = [];

    await allureStep('Returns 200 + JSON with a non-empty array of projects', async () => {
      const response = await organuzApi.getProjects();
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      projects = (await response.json()) as Project[];
      expect(Array.isArray(projects), 'response body is a JSON array').toBe(true);
      expect(projects.length, 'at least one project row is returned').toBeGreaterThan(0);
    });

    await allureStep('Every row exposes all required fields, non-null', async () => {
      for (const project of projects) {
        for (const field of PROJECT_REQUIRED_FIELDS) {
          expect(project, `project ${project.id} exposes "${field}"`).toHaveProperty(field);
          expect(project[field], `project ${project.id} "${field}" is not null`).not.toBeNull();
        }
      }
    });

    await allureStep('Numeric and array fields carry their declared types', async () => {
      for (const project of projects) {
        for (const field of NUMERIC_FIELDS) {
          expect(typeof project[field], `${project.id} "${field}" is a number`).toBe('number');
        }
        expect(Array.isArray(project.ai_capabilities), `${project.id} ai_capabilities is an array`).toBe(true);
        for (const capability of project.ai_capabilities) {
          expect(typeof capability, `${project.id} ai_capabilities entry is a string`).toBe('string');
        }
      }
    });

    await allureStep('Bilingual (he/en) fields are both present and non-empty', async () => {
      for (const project of projects) {
        for (const [en, he] of BILINGUAL_PAIRS) {
          expect(typeof project[en], `${project.id} "${en}" is a string`).toBe('string');
          expect((project[en] as string).trim().length, `${project.id} "${en}" is non-empty`).toBeGreaterThan(0);
          expect(typeof project[he], `${project.id} "${he}" is a string`).toBe('string');
          expect((project[he] as string).trim().length, `${project.id} "${he}" is non-empty`).toBeGreaterThan(0);
        }
      }
    });
  });
});
