import { config } from '../../../src/utils/config';

/**
 * Resolve per-role login credentials from the environment, **env-aware**.
 *
 * The `.env` may name the vars per target env — `DEV_CUSTOMER_PHONE`,
 * `PROD_CUSTOMER_PHONE` — so a single file can hold dev *and* prod credentials
 * without collision. For the active `QA_TARGET_ENV` (dev | test | prod) we read
 * `<ENV>_<ROLE>_PHONE` first, then fall back to the plain `<ROLE>_PHONE`. The
 * OTP code follows the same rule (`<ENV>_<ROLE>_OTP_CODE` → `<ROLE>_OTP_CODE`).
 *
 * `personaId` is the persona id (`customer` | `consultant` | `company`);
 * hyphens map to underscores (`company-employee` → `COMPANY_EMPLOYEE`).
 */
function candidateKeys(personaId: string, suffix: 'PHONE' | 'OTP_CODE'): string[] {
  const role = personaId.toUpperCase().replace(/-/g, '_');
  const env = config.env.name.toUpperCase();
  return [`${env}_${role}_${suffix}`, `${role}_${suffix}`];
}

function firstDefined(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/** The role's phone number for the active env, or `undefined` when unset. */
export function rolePhone(personaId: string): string | undefined {
  return firstDefined(candidateKeys(personaId, 'PHONE'));
}

/** The role's OTP code for the active env, or `undefined` when unset. */
export function roleOtpCode(personaId: string): string | undefined {
  return firstDefined(candidateKeys(personaId, 'OTP_CODE'));
}

/** True when the role has a usable phone credential for the active env. */
export function hasRoleCredential(personaId: string): boolean {
  return rolePhone(personaId) !== undefined;
}

/** The phone env-var names tried for `personaId`, for skip/diagnostic messages. */
export function phoneKeyHint(personaId: string): string {
  return candidateKeys(personaId, 'PHONE').join(' / ');
}
