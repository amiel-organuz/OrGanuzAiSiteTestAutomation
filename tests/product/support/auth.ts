import * as fs from 'fs';
import * as path from 'path';
import type { ProductPersonaId } from '../matrix/e2e-matrix.data';

/**
 * Per-role authenticated-session storage for the product app.
 *
 * The dev app rate-limits OTP sends per phone, so logging each role in once (in the
 * `product-setup` project — see auth.setup.ts) and reusing its saved storageState
 * across every per-role spec avoids the back-to-back-login cooldown that otherwise
 * makes the later specs skip. Files live under playwright/.auth/ (gitignored).
 */
export const AUTH_ROLES: readonly ProductPersonaId[] = ['customer', 'consultant', 'company'];

const AUTH_DIR = path.resolve(__dirname, '../../../playwright/.auth');

/** Absolute path to a role's saved storageState file. */
export function authFile(persona: ProductPersonaId): string {
  return path.join(AUTH_DIR, `product-${persona}.json`);
}

/** True when a role has a saved session on disk (setup authenticated it successfully). */
export function hasSavedSession(persona: ProductPersonaId): boolean {
  return fs.existsSync(authFile(persona));
}
