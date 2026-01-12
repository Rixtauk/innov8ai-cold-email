/**
 * Core types for the cold email enrichment system
 */

export interface DomainValidation {
  isValid: boolean;
  domain: string;
  tld: string;
  error?: string;
}

export interface Lead {
  website: string;
  company?: string;
  name?: string;
  extraFields?: Record<string, string>;
}

export interface EnrichedLead extends Lead {
  email?: string;
  icebreaker?: string;
  enrichmentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  errorMessage?: string;
  domainValidation?: DomainValidation;
}

export interface CrawlResult {
  url: string;
  content: string;
  title?: string;
  description?: string;
  success: boolean;
  error?: string;
}

export interface EmailExtractionResult {
  emails: string[];
  primaryEmail?: string;
  source: 'page_content' | 'contact_page' | 'inferred';
  confidence: 'high' | 'medium' | 'low';
}

export interface IcebreakerResult {
  icebreaker: string;
  context: string;
  tone: 'professional' | 'casual' | 'friendly';
}

export interface EnrichmentConfig {
  maxConcurrency: number;
  retryAttempts: number;
  includeIcebreaker: boolean;
  icebreakerTone: 'professional' | 'casual' | 'friendly';
}

export const DEFAULT_CONFIG: EnrichmentConfig = {
  maxConcurrency: 3,
  retryAttempts: 2,
  includeIcebreaker: true,
  icebreakerTone: 'professional',
};

/**
 * API Usage tracking
 */
export interface APIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestCount: number;
  lastUpdated: Date;
}

export interface APIUsageEvent {
  inputTokens: number;
  outputTokens: number;
  model: string;
  timestamp: Date;
  operation: 'email_search' | 'icebreaker_generation' | 'other';
}

// Claude pricing (as of 2024) - per 1M tokens
export const CLAUDE_PRICING = {
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'default': { input: 3.00, output: 15.00 },
} as const;
