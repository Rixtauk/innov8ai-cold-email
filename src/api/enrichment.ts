/**
 * Lead Enrichment Pipeline
 * Makes API calls to the backend server which proxies to Anthropic and Firecrawl
 * Supports both local development (with manual API keys) and Vercel deployment (with env vars)
 */

import { extractDomain } from '../agent/crawl.js';
import type { EnrichedLead, EnrichmentConfig } from '../agent/types.js';

// Use relative URLs - works for both local dev server and Vercel deployment
const API_BASE = '/api';

export interface EnrichmentProgress {
  stage: 'scraping' | 'extracting' | 'icebreaker';
  currentIndex: number;
  totalCount: number;
  currentLead: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    scrapedPages: number;
  };
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  markdown?: string;
  title?: string;
  description?: string;
  error?: string;
}

export interface EmailExtractionResult {
  success: boolean;
  emails: string[];
  primaryEmail?: string;
  confidence: 'high' | 'medium' | 'low';
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

export interface IcebreakerResult {
  success: boolean;
  icebreaker: string;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

export interface EnrichmentResult {
  lead: EnrichedLead;
  scrapeResult?: ScrapeResult;
  emailResult?: EmailExtractionResult;
  icebreakerResult?: IcebreakerResult;
}

export interface HealthCheckResult {
  status: string;
  hasAnthropicKey: boolean;
  hasFirecrawlKey: boolean;
}

let apiKeys: { anthropicKey: string; firecrawlKey: string } | null = null;
let serverHasEnvVars = false;

/**
 * Check if the server has environment variables configured
 */
export async function checkServerEnvVars(): Promise<HealthCheckResult> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    serverHasEnvVars = data.hasAnthropicKey && data.hasFirecrawlKey;
    return data;
  } catch {
    return { status: 'error', hasAnthropicKey: false, hasFirecrawlKey: false };
  }
}

/**
 * Check if server has env vars configured
 */
export function hasServerEnvVars(): boolean {
  return serverHasEnvVars;
}

/**
 * Initialize the enrichment pipeline with API keys (for local development)
 */
export function initEnrichment(anthropicKey: string, firecrawlKey: string): void {
  apiKeys = { anthropicKey, firecrawlKey };
}

/**
 * Check if the pipeline is initialized (either via env vars or manual keys)
 */
export function isEnrichmentReady(): boolean {
  return serverHasEnvVars || apiKeys !== null;
}

/**
 * Scrape a URL via the backend
 */
async function scrapeUrl(url: string): Promise<ScrapeResult> {
  if (!isEnrichmentReady()) throw new Error('API not initialized');

  console.log('[scrapeUrl] Scraping:', url);
  const response = await fetch(`${API_BASE}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      // Only pass key if not using server env vars
      ...(apiKeys && !serverHasEnvVars ? { firecrawlKey: apiKeys.firecrawlKey } : {}),
    }),
  });

  const result = await response.json();
  console.log('[scrapeUrl] Result for', url, ':', result.success, result.error || '');
  return result;
}

/**
 * Extract emails via the backend
 */
async function extractEmails(content: string, domain: string): Promise<EmailExtractionResult> {
  if (!isEnrichmentReady()) throw new Error('API not initialized');

  const response = await fetch(`${API_BASE}/extract-emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      domain,
      // Only pass key if not using server env vars
      ...(apiKeys && !serverHasEnvVars ? { anthropicKey: apiKeys.anthropicKey } : {}),
    }),
  });

  return response.json();
}

/**
 * Generate icebreaker via the backend
 */
async function generateIcebreaker(
  content: string,
  companyName: string | undefined,
  domain: string,
  tone: string
): Promise<IcebreakerResult> {
  if (!isEnrichmentReady()) throw new Error('API not initialized');

  const response = await fetch(`${API_BASE}/generate-icebreaker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      companyName,
      domain,
      tone,
      // Only pass key if not using server env vars
      ...(apiKeys && !serverHasEnvVars ? { anthropicKey: apiKeys.anthropicKey } : {}),
    }),
  });

  return response.json();
}

/**
 * Scrape a URL looking for contact information
 */
async function scrapeForContact(baseUrl: string): Promise<ScrapeResult> {
  // First try the main page
  const mainResult = await scrapeUrl(baseUrl);

  // If we found emails in the main page, return it
  if (mainResult.success && mainResult.markdown && containsEmail(mainResult.markdown)) {
    return mainResult;
  }

  // Try common contact page paths
  const contactPaths = ['/contact', '/contact-us', '/about'];
  const normalizedUrl = baseUrl.replace(/\/$/, '');

  for (const path of contactPaths) {
    try {
      const contactUrl = `${normalizedUrl}${path}`;
      const result = await scrapeUrl(contactUrl);

      if (result.success && result.markdown && containsEmail(result.markdown)) {
        return result;
      }
    } catch {
      // Continue to next path
    }
  }

  // Return the main page result
  return mainResult;
}

/**
 * Quick check if content contains email-like patterns
 */
function containsEmail(content: string): boolean {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  return emailRegex.test(content);
}

/**
 * Enrich a single lead
 */
export async function enrichLead(
  lead: EnrichedLead,
  options: {
    generateIcebreaker?: boolean;
    icebreakerTone?: 'professional' | 'casual' | 'friendly';
  } = {}
): Promise<EnrichmentResult> {
  const domain = extractDomain(lead.website);
  const result: EnrichmentResult = { lead: { ...lead } };

  // Skip invalid domains
  if (!lead.domainValidation?.isValid) {
    result.lead.enrichmentStatus = 'skipped';
    return result;
  }

  try {
    // Step 1: Scrape the website
    result.lead.enrichmentStatus = 'processing';
    const scrapeResult = await scrapeForContact(lead.website);
    result.scrapeResult = scrapeResult;

    if (!scrapeResult.success || !scrapeResult.markdown) {
      result.lead.enrichmentStatus = 'failed';
      result.lead.errorMessage = scrapeResult.error || 'Failed to scrape website';
      return result;
    }

    // Step 2: Extract emails using AI
    const emailResult = await extractEmails(scrapeResult.markdown, domain);
    result.emailResult = emailResult;

    if (emailResult.success && emailResult.primaryEmail) {
      result.lead.email = emailResult.primaryEmail;
    }

    // Step 3: Generate icebreaker if requested
    if (options.generateIcebreaker && scrapeResult.markdown) {
      const icebreakerResult = await generateIcebreaker(
        scrapeResult.markdown,
        lead.company,
        domain,
        options.icebreakerTone || 'professional'
      );
      result.icebreakerResult = icebreakerResult;

      if (icebreakerResult.success && icebreakerResult.icebreaker) {
        result.lead.icebreaker = icebreakerResult.icebreaker;
      }
    }

    result.lead.enrichmentStatus = 'completed';
    return result;
  } catch (error) {
    result.lead.enrichmentStatus = 'failed';
    result.lead.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Process multiple leads for email discovery only
 */
export async function findEmailsForLeads(
  leads: EnrichedLead[],
  config: EnrichmentConfig,
  onProgress?: (progress: EnrichmentProgress, result: EnrichmentResult) => void
): Promise<EnrichmentResult[]> {
  console.log('[findEmailsForLeads] Starting with', leads.length, 'leads');
  console.log('[findEmailsForLeads] API keys initialized:', isEnrichmentReady());

  const validLeads = leads.filter(l => l.domainValidation?.isValid);
  console.log('[findEmailsForLeads] Valid leads:', validLeads.length);
  console.log('[findEmailsForLeads] Sample lead:', leads[0]);

  const results: EnrichmentResult[] = [];
  const usage = { inputTokens: 0, outputTokens: 0, scrapedPages: 0 };

  // Process with concurrency control
  const { maxConcurrency } = config;

  for (let i = 0; i < validLeads.length; i += maxConcurrency) {
    const batch = validLeads.slice(i, i + maxConcurrency);

    const batchResults = await Promise.all(
      batch.map(async (lead, batchIndex) => {
        const globalIndex = i + batchIndex;

        onProgress?.({
          stage: 'scraping',
          currentIndex: globalIndex,
          totalCount: validLeads.length,
          currentLead: lead.website,
          usage,
        }, { lead });

        const result = await enrichLead(lead, { generateIcebreaker: false });

        // Track usage
        if (result.emailResult) {
          usage.inputTokens += result.emailResult.inputTokens;
          usage.outputTokens += result.emailResult.outputTokens;
        }
        if (result.scrapeResult?.success) {
          usage.scrapedPages++;
        }

        onProgress?.({
          stage: 'extracting',
          currentIndex: globalIndex + 1,
          totalCount: validLeads.length,
          currentLead: lead.website,
          usage,
        }, result);

        return result;
      })
    );

    results.push(...batchResults);
  }

  // Add results for skipped (invalid) leads
  const skippedLeads = leads.filter(l => !l.domainValidation?.isValid);
  for (const lead of skippedLeads) {
    results.push({ lead: { ...lead, enrichmentStatus: 'skipped' } });
  }

  return results;
}

/**
 * Generate icebreakers for selected leads
 */
export async function generateIcebreakersForLeads(
  leads: EnrichedLead[],
  scrapedContent: Map<string, string>,
  config: EnrichmentConfig,
  onProgress?: (progress: EnrichmentProgress, result: EnrichmentResult) => void
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];
  const usage = { inputTokens: 0, outputTokens: 0, scrapedPages: 0 };

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const domain = extractDomain(lead.website);
    let content = scrapedContent.get(lead.website) || '';

    onProgress?.({
      stage: 'icebreaker',
      currentIndex: i,
      totalCount: leads.length,
      currentLead: lead.website,
      usage,
    }, { lead });

    let icebreakerResult: IcebreakerResult;

    // If we don't have cached content, scrape again
    if (!content) {
      const scrapeResult = await scrapeForContact(lead.website);
      if (scrapeResult.success && scrapeResult.markdown) {
        content = scrapeResult.markdown;
        usage.scrapedPages++;
      }
    }

    if (content) {
      icebreakerResult = await generateIcebreaker(
        content,
        lead.company,
        domain,
        config.icebreakerTone
      );
    } else {
      icebreakerResult = {
        success: false,
        icebreaker: '',
        inputTokens: 0,
        outputTokens: 0,
        error: 'No content available',
      };
    }

    usage.inputTokens += icebreakerResult.inputTokens;
    usage.outputTokens += icebreakerResult.outputTokens;

    const result: EnrichmentResult = {
      lead: {
        ...lead,
        icebreaker: icebreakerResult.icebreaker || undefined,
      },
      icebreakerResult,
    };

    results.push(result);

    onProgress?.({
      stage: 'icebreaker',
      currentIndex: i + 1,
      totalCount: leads.length,
      currentLead: lead.website,
      usage,
    }, result);
  }

  return results;
}
