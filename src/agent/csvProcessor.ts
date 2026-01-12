/**
 * CSV processing module
 * Handles parsing input CSVs and generating enriched output
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type { Lead, EnrichedLead, DomainValidation } from './types.js';
import { validateDomain } from './crawl.js';

/**
 * Parse a CSV string into Lead objects
 */
export function parseCSV(csvContent: string): Lead[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  return records.map((record) => {
    // Normalize column names to find website field
    const websiteKey = findWebsiteColumn(Object.keys(record));

    if (!websiteKey) {
      throw new Error(
        'CSV must contain a website column. Accepted names: website, url, domain, site, company_url, company_website'
      );
    }

    // Extract known fields and put the rest in extraFields
    const { [websiteKey]: website, company, name, ...rest } = record;
    const extraFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value) extraFields[key] = value;
    }

    return {
      website,
      company,
      name,
      extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
    } as Lead;
  });
}

/**
 * Find the website column from various possible names
 */
function findWebsiteColumn(columns: string[]): string | undefined {
  const websiteAliases = [
    'website', 'url', 'domain', 'site',
    'company_url', 'company_website', 'companyurl',
    'companywebsite', 'web', 'homepage',
  ];

  const normalizedColumns = columns.map(c => c.toLowerCase().replace(/[_\s-]/g, ''));

  for (const alias of websiteAliases) {
    const index = normalizedColumns.indexOf(alias);
    if (index !== -1) {
      return columns[index];
    }
  }

  return undefined;
}

/**
 * Convert enriched leads back to CSV format
 */
export function toCSV(leads: EnrichedLead[]): string {
  if (leads.length === 0) return '';

  // Flatten leads to include extraFields
  const flattenedLeads = leads.map(lead => {
    const { extraFields, domainValidation, ...rest } = lead;
    return {
      ...rest,
      ...(extraFields || {}),
    };
  });

  // Get all unique columns
  const allColumns = new Set<string>();
  flattenedLeads.forEach(lead => {
    Object.keys(lead).forEach(key => allColumns.add(key));
  });

  // Order columns: original columns first, then enriched columns
  const enrichedColumns = ['email', 'icebreaker', 'enrichmentStatus', 'errorMessage'];
  const originalColumns = [...allColumns].filter(col => !enrichedColumns.includes(col));
  const orderedColumns = [...originalColumns, ...enrichedColumns.filter(col => allColumns.has(col))];

  return stringify(flattenedLeads, {
    header: true,
    columns: orderedColumns,
  });
}

/**
 * Initialize leads with pending status and validate domains
 */
export function initializeLeads(leads: Lead[]): EnrichedLead[] {
  return leads.map(lead => {
    const validation = validateDomain(lead.website);
    const domainValidation: DomainValidation = {
      isValid: validation.isValid,
      domain: validation.domain,
      tld: validation.tld,
      error: validation.error,
    };

    return {
      ...lead,
      enrichmentStatus: validation.isValid ? 'pending' : 'skipped',
      domainValidation,
      errorMessage: validation.isValid ? undefined : `Invalid domain: ${validation.error}`,
    };
  });
}

/**
 * Get validation statistics for leads
 */
export function getValidationStats(leads: EnrichedLead[]): {
  total: number;
  valid: number;
  invalid: number;
  invalidDomains: Array<{ website: string; error: string }>;
} {
  const invalidDomains: Array<{ website: string; error: string }> = [];
  let valid = 0;
  let invalid = 0;

  leads.forEach(lead => {
    if (lead.domainValidation?.isValid) {
      valid++;
    } else {
      invalid++;
      invalidDomains.push({
        website: lead.website,
        error: lead.domainValidation?.error || 'Unknown validation error',
      });
    }
  });

  return {
    total: leads.length,
    valid,
    invalid,
    invalidDomains,
  };
}

/**
 * Validate CSV structure
 */
export function validateCSV(csvContent: string): { valid: boolean; error?: string; rowCount?: number } {
  try {
    const leads = parseCSV(csvContent);

    if (leads.length === 0) {
      return { valid: false, error: 'CSV file is empty or has no data rows' };
    }

    // Check for website values
    const leadsWithWebsite = leads.filter(lead => lead.website && lead.website.trim() !== '');

    if (leadsWithWebsite.length === 0) {
      return { valid: false, error: 'No valid website URLs found in the CSV' };
    }

    return { valid: true, rowCount: leadsWithWebsite.length };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV',
    };
  }
}

/**
 * Get statistics about enrichment progress
 */
export function getEnrichmentStats(leads: EnrichedLead[]): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
  withEmail: number;
  withIcebreaker: number;
  validDomains: number;
  invalidDomains: number;
} {
  return {
    total: leads.length,
    pending: leads.filter(l => l.enrichmentStatus === 'pending').length,
    processing: leads.filter(l => l.enrichmentStatus === 'processing').length,
    completed: leads.filter(l => l.enrichmentStatus === 'completed').length,
    failed: leads.filter(l => l.enrichmentStatus === 'failed').length,
    skipped: leads.filter(l => l.enrichmentStatus === 'skipped').length,
    withEmail: leads.filter(l => l.email).length,
    withIcebreaker: leads.filter(l => l.icebreaker).length,
    validDomains: leads.filter(l => l.domainValidation?.isValid).length,
    invalidDomains: leads.filter(l => !l.domainValidation?.isValid).length,
  };
}
