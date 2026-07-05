/**
 * Types for the organuz backend API (Supabase / PostgREST).
 * Shapes mirror the live `projects` table exposed at /rest/v1/projects.
 */

/** A single showcase project row from the public `projects` table. */
export interface Project {
  id: string;
  project_name: string;
  project_name_he: string;
  client_name: string;
  client_name_he: string;
  description: string;
  description_he: string;
  location: string;
  location_he: string;
  image_url: string;
  status: string;
  solar_capacity_kw: number;
  storage_capacity_kwh: number;
  roi: string;
  roi_years: number;
  revenue_25_year: string;
  ai_capabilities: string[];
  created_at: string;
  updated_at: string;
}

/** Every field a valid Project row must expose (used for contract assertions). */
export const PROJECT_REQUIRED_FIELDS: Array<keyof Project> = [
  'id',
  'project_name',
  'project_name_he',
  'client_name',
  'client_name_he',
  'description',
  'description_he',
  'location',
  'location_he',
  'image_url',
  'status',
  'solar_capacity_kw',
  'storage_capacity_kwh',
  'roi',
  'roi_years',
  'revenue_25_year',
  'ai_capabilities',
  'created_at',
  'updated_at',
];
