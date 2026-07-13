/**
 * REST / PostgREST constants for the organuz Supabase backend.
 *
 * Path prefixes, table names, query params, filter operators, and request
 * headers live here so the OrganuzApi client and the contract specs share a
 * single source of truth instead of re-typing `/rest/v1/...`, `eq.<id>`, and
 * `Prefer: return=representation` inline.
 */
export class RestApiConstants {
  /** PostgREST is mounted under this prefix on the Supabase gateway. */
  static readonly REST_BASE = '/rest/v1';

  /** Known table / resource names exposed over REST. */
  static readonly Tables = {
    projects: 'projects',
  } as const;

  /** PostgREST `select` value for the whole row. */
  static readonly SELECT_ALL = '*';

  /** Request header names. */
  static readonly Headers = {
    prefer: 'Prefer',
  } as const;

  /** `Prefer` header values. */
  static readonly Prefer = {
    /** Ask PostgREST to echo the affected rows (empty array when RLS blocks the write). */
    returnRepresentation: 'return=representation',
  } as const;

  /** Build a `/rest/v1/<table>` resource path. */
  static resource(table: string): string {
    return `${RestApiConstants.REST_BASE}/${table}`;
  }

  /** PostgREST `column=eq.<value>` equality filter value. */
  static eq(value: string): string {
    return `eq.${value}`;
  }
}
