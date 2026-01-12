/**
 * Instantly.ai Export Utility
 * Generates CSV exports with spintax format for A/B testing
 */

import type { CampaignLead, Campaign, SequenceEmail } from '../agent/types';

// Spintax format: {Variant A|Variant B}
function toSpintax(variantA: string, variantB: string): string {
  if (!variantA && !variantB) return '';
  if (!variantB || variantA === variantB) return variantA;
  if (!variantA) return variantB;
  return `{${variantA}|${variantB}}`;
}

// Replace merge fields with lead data
function replaceMergeFields(template: string, lead: CampaignLead): string {
  let result = template;

  // Standard merge fields
  const fields: Record<string, string | undefined> = {
    '{{firstName}}': lead.extraFields?.firstName || lead.extraFields?.first_name || '',
    '{{lastName}}': lead.extraFields?.lastName || lead.extraFields?.last_name || '',
    '{{company}}': lead.company || '',
    '{{domain}}': lead.website || lead.domainValidation?.domain || '',
    '{{email}}': lead.email || '',
  };

  // Replace standard fields
  for (const [placeholder, value] of Object.entries(fields)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
  }

  // Replace hook with generated hook (if available)
  if (lead.hook) {
    const hookSpintax = toSpintax(lead.hook.variantA, lead.hook.variantB);
    result = result.replace(/\{\{hook\}\}/g, hookSpintax);
  }

  return result;
}

// Assemble email body from components
function assembleBody(email: SequenceEmail, variant: 'A' | 'B'): string {
  const parts: string[] = [];
  const componentOrder = ['hook', 'problem', 'agitate', 'solution', 'cta', 'ps'];

  for (const type of componentOrder) {
    const component = email.components.find(c => c.type === type);
    if (!component) continue;

    const value = variant === 'A' ? component.variantA : component.variantB;
    if (value && value.trim()) {
      // Add "P.S." prefix for PS component
      if (type === 'ps') {
        parts.push(`P.S. ${value.trim()}`);
      } else {
        parts.push(value.trim());
      }
    }
  }

  return parts.join('\n\n');
}

// Get component value with spintax
function getComponentSpintax(email: SequenceEmail, type: string): string {
  const component = email.components.find(c => c.type === type);
  if (!component) return '';
  return toSpintax(component.variantA, component.variantB);
}

// Generate body with spintax
function assembleBodySpintax(email: SequenceEmail): string {
  const bodyA = assembleBody(email, 'A');
  const bodyB = assembleBody(email, 'B');
  return toSpintax(bodyA, bodyB);
}

export interface ExportOptions {
  format: 'instantly' | 'csv' | 'json';
  includeAllEmails: boolean; // If true, include all 3 emails in separate columns
  separateByEmail: boolean;  // If true, export separate file per email
}

export interface ExportResult {
  filename: string;
  content: string;
  mimeType: string;
}

/**
 * Export leads with campaign emails to Instantly-compatible CSV
 */
export function exportToInstantly(
  leads: CampaignLead[],
  campaign: Campaign,
  options: Partial<ExportOptions> = {}
): ExportResult[] {
  const { includeAllEmails = true, separateByEmail = false } = options;

  if (separateByEmail) {
    // Export separate CSV for each email in sequence
    return campaign.sequence.map(email => {
      const rows = leads.map(lead => {
        const subject = getComponentSpintax(email, 'subject');
        const preview = getComponentSpintax(email, 'preview');
        const body = assembleBodySpintax(email);

        return {
          email: lead.email || '',
          firstName: lead.extraFields?.firstName || lead.extraFields?.first_name || '',
          lastName: lead.extraFields?.lastName || lead.extraFields?.last_name || '',
          company: lead.company || '',
          domain: lead.website || '',
          subject: replaceMergeFields(subject, lead),
          preview: replaceMergeFields(preview, lead),
          body: replaceMergeFields(body, lead),
        };
      });

      const csv = generateCSV(rows, [
        'email', 'firstName', 'lastName', 'company', 'domain',
        'subject', 'preview', 'body'
      ]);

      return {
        filename: `${campaign.name.replace(/\s+/g, '_')}_email${email.position}.csv`,
        content: csv,
        mimeType: 'text/csv',
      };
    });
  }

  // Single CSV with all emails
  const rows = leads.map(lead => {
    const row: Record<string, string> = {
      email: lead.email || '',
      firstName: lead.extraFields?.firstName || lead.extraFields?.first_name || '',
      lastName: lead.extraFields?.lastName || lead.extraFields?.last_name || '',
      company: lead.company || '',
      domain: lead.website || '',
    };

    if (includeAllEmails) {
      // Add columns for each email in sequence
      campaign.sequence.forEach(email => {
        const prefix = `email${email.position}`;
        const subject = getComponentSpintax(email, 'subject');
        const preview = getComponentSpintax(email, 'preview');
        const body = assembleBodySpintax(email);

        row[`${prefix}_subject`] = replaceMergeFields(subject, lead);
        row[`${prefix}_preview`] = replaceMergeFields(preview, lead);
        row[`${prefix}_body`] = replaceMergeFields(body, lead);
        row[`${prefix}_delay`] = String(email.delayDays);
      });
    } else {
      // Just the first email
      const email = campaign.sequence[0];
      if (email) {
        const subject = getComponentSpintax(email, 'subject');
        const preview = getComponentSpintax(email, 'preview');
        const body = assembleBodySpintax(email);

        row.subject = replaceMergeFields(subject, lead);
        row.preview = replaceMergeFields(preview, lead);
        row.body = replaceMergeFields(body, lead);
      }
    }

    return row;
  });

  // Build headers
  const headers = ['email', 'firstName', 'lastName', 'company', 'domain'];
  if (includeAllEmails) {
    campaign.sequence.forEach(email => {
      const prefix = `email${email.position}`;
      headers.push(`${prefix}_subject`, `${prefix}_preview`, `${prefix}_body`, `${prefix}_delay`);
    });
  } else {
    headers.push('subject', 'preview', 'body');
  }

  const csv = generateCSV(rows, headers);

  return [{
    filename: `${campaign.name.replace(/\s+/g, '_')}_campaign.csv`,
    content: csv,
    mimeType: 'text/csv',
  }];
}

/**
 * Generate CSV string from rows
 */
function generateCSV(rows: Record<string, string>[], headers: string[]): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.join(','));

  // Data rows
  for (const row of rows) {
    const values = headers.map(h => {
      const value = row[h] || '';
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (value.includes(',') || value.includes('\n') || value.includes('"') || value.includes('{')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Export to JSON format (for debugging or other integrations)
 */
export function exportToJSON(leads: CampaignLead[], campaign: Campaign): ExportResult {
  const data = {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      createdAt: campaign.createdAt,
    },
    sequence: campaign.sequence.map(email => ({
      position: email.position,
      label: email.label,
      delayDays: email.delayDays,
      subject: {
        variantA: email.components.find(c => c.type === 'subject')?.variantA || '',
        variantB: email.components.find(c => c.type === 'subject')?.variantB || '',
      },
      preview: {
        variantA: email.components.find(c => c.type === 'preview')?.variantA || '',
        variantB: email.components.find(c => c.type === 'preview')?.variantB || '',
      },
      body: {
        variantA: assembleBody(email, 'A'),
        variantB: assembleBody(email, 'B'),
      },
    })),
    leads: leads.map(lead => ({
      email: lead.email,
      firstName: lead.extraFields?.firstName || lead.extraFields?.first_name,
      lastName: lead.extraFields?.lastName || lead.extraFields?.last_name,
      company: lead.company,
      domain: lead.website,
      hook: lead.hook,
    })),
  };

  return {
    filename: `${campaign.name.replace(/\s+/g, '_')}_campaign.json`,
    content: JSON.stringify(data, null, 2),
    mimeType: 'application/json',
  };
}

/**
 * Download helper - triggers browser download
 */
export function downloadFile(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
