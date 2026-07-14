import { expect, test } from '@playwright/test';
import { PRODUCT_PERSONAS, ProductPersona, ProductPersonaId } from './e2e-matrix.data';

/**
 * Sanity tests for the data contract of the three sign-in-capable product roles.
 * Network-free: they verify the modeled behavior of each role in PRODUCT_PERSONAS (post-funding
 * routing, quotation/pricing/management privileges, identity) so a regression in a role capability is
 * caught without running the app. `company-employee` is modeled too but cannot sign in, so
 * it serves here only as a contrast for the elevated-privilege invariants.
 */
const SIGN_IN_ROLES: readonly ProductPersonaId[] = ['customer', 'consultant', 'company'];

function persona(id: ProductPersonaId): ProductPersona {
  const found = PRODUCT_PERSONAS.find((p) => p.id === id);
  if (!found) throw new Error(`persona ${id} is not modeled in PRODUCT_PERSONAS`);
  return found;
}

test.describe('Product roles contract', { tag: '@product' }, () => {
  test('models all three sign-in roles as distinct personas', () => {
    const ids = SIGN_IN_ROLES.map((id) => persona(id).id);
    expect(ids).toEqual(['customer', 'consultant', 'company']);
    expect(new Set(ids).size).toBe(SIGN_IN_ROLES.length);
  });

  test('every sign-in role has a readable name and a role description', () => {
    for (const id of SIGN_IN_ROLES) {
      const p = persona(id);
      expect(p.name.trim().length, `${id} has a name`).toBeGreaterThan(0);
      expect(p.role.trim().length, `${id} has a role description`).toBeGreaterThan(0);
    }
  });

  test('the post-funding destination is a known value for every sign-in role', () => {
    for (const id of SIGN_IN_ROLES) {
      expect(['quotations', 'results']).toContain(persona(id).expectedPostFundingDestination);
    }
  });

  test('customer is the only sign-in role that lands on quotations after funding', () => {
    expect(persona('customer').expectedPostFundingDestination).toBe('quotations');
    expect(persona('consultant').expectedPostFundingDestination).toBe('results');
    expect(persona('company').expectedPostFundingDestination).toBe('results');
  });

  test('customer can open quotations from the results screen', () => {
    expect(persona('customer').canOpenQuotationsFromResults).toBe(true);
  });

  test('consultant reaches results but can still open quotations', () => {
    const consultant = persona('consultant');
    expect(consultant.expectedPostFundingDestination).toBe('results');
    expect(consultant.canOpenQuotationsFromResults).toBe(true);
  });

  test('company gets its quote from results, not from the quotations list', () => {
    const company = persona('company');
    expect(company.expectedPostFundingDestination).toBe('results');
    expect(company.canOpenQuotationsFromResults).toBe(false);
  });

  test('only company can open company pricing', () => {
    expect(persona('company').canOpenCompanyPricing).toBe(true);
    expect(persona('customer').canOpenCompanyPricing).toBe(false);
    expect(persona('consultant').canOpenCompanyPricing).toBe(false);
  });

  test('only company can open company management', () => {
    expect(persona('company').canOpenCompanyManagement).toBe(true);
    expect(persona('customer').canOpenCompanyManagement).toBe(false);
    expect(persona('consultant').canOpenCompanyManagement).toBe(false);
  });

  test('company is the only role with any elevated company privileges', () => {
    const elevated = (p: ProductPersona) => p.canOpenCompanyPricing || p.canOpenCompanyManagement;
    // Of every modeled persona (including company-employee, which cannot sign in),
    // only the company contractor carries pricing/management privileges.
    const withRights = PRODUCT_PERSONAS.filter(elevated).map((p) => p.id);
    expect(withRights).toEqual(['company']);
  });
});
