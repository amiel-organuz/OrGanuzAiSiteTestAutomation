import type { ProductPersona } from './matrix-types';

export const PRODUCT_PERSONAS: readonly ProductPersona[] = [
  {
    id: 'customer',
    name: 'Customer',
    role: 'Property owner / end user',
    expectedPostFundingDestination: 'quotations',
    canOpenQuotationsFromResults: true,
    canOpenCompanyPricing: false,
    canOpenCompanyManagement: false,
  },
  {
    id: 'consultant',
    name: 'Consultant',
    role: 'Characterizes properties for customers',
    expectedPostFundingDestination: 'results',
    canOpenQuotationsFromResults: true,
    canOpenCompanyPricing: false,
    canOpenCompanyManagement: false,
  },
  {
    id: 'company',
    name: 'Company / Contractor',
    role: 'Characterizes a property and downloads its own quotation',
    expectedPostFundingDestination: 'results',
    canOpenQuotationsFromResults: false,
    canOpenCompanyPricing: true,
    canOpenCompanyManagement: true,
  },
  {
    id: 'company-employee',
    name: 'Company Employee',
    role: 'Employee under a company',
    expectedPostFundingDestination: 'results',
    canOpenQuotationsFromResults: false,
    canOpenCompanyPricing: false,
    canOpenCompanyManagement: false,
  },
] as const;
