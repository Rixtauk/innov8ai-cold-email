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

/**
 * Campaign Builder Types
 */

// Knowledge Base (persisted to localStorage)
export interface KnowledgeBase {
  id: string;
  name: string;
  content: string;  // Markdown content
  createdAt: string;  // ISO string for JSON serialisation
  updatedAt: string;
}

// Email component types
export type EmailComponentType = 'subject' | 'preview' | 'hook' | 'problem' | 'agitate' | 'solution' | 'cta' | 'ps';

// Email component with A/B variants
export interface EmailComponent {
  type: EmailComponentType;
  variantA: string;
  variantB: string;
}

// Email position in sequence
export type EmailPosition = 1 | 2 | 3;

// Single email in sequence
export interface SequenceEmail {
  position: EmailPosition;
  label: string;  // "Intro Email", "Follow-up", "Break-up"
  components: EmailComponent[];
  delayDays: number;  // Days after previous email (0 for first email)
}

// Full campaign template
export interface Campaign {
  id: string;
  name: string;
  knowledgeBaseId: string;
  sequence: SequenceEmail[];
  createdAt: string;
  updatedAt: string;
}

// Generated email content for a single lead
export interface GeneratedEmailContent {
  position: EmailPosition;
  subject: { variantA: string; variantB: string };
  preview: { variantA: string; variantB: string };
  body: { variantA: string; variantB: string };  // Assembled from components
}

// Extended lead with campaign data
export interface CampaignLead extends EnrichedLead {
  campaignId?: string;
  hook?: { variantA: string; variantB: string };  // AI-generated per lead
  emails?: GeneratedEmailContent[];  // All 3 emails with both variants
}

// Default 3-email sequence structure
export const DEFAULT_SEQUENCE: SequenceEmail[] = [
  {
    position: 1,
    label: 'Intro Email',
    delayDays: 0,
    components: [
      { type: 'subject', variantA: '', variantB: '' },
      { type: 'preview', variantA: '', variantB: '' },
      { type: 'hook', variantA: '{{hook}}', variantB: '{{hook}}' },
      { type: 'problem', variantA: '', variantB: '' },
      { type: 'agitate', variantA: '', variantB: '' },
      { type: 'solution', variantA: '', variantB: '' },
      { type: 'cta', variantA: '', variantB: '' },
      { type: 'ps', variantA: '', variantB: '' },
    ],
  },
  {
    position: 2,
    label: 'Follow-up',
    delayDays: 3,
    components: [
      { type: 'subject', variantA: '', variantB: '' },
      { type: 'preview', variantA: '', variantB: '' },
      { type: 'hook', variantA: '', variantB: '' },
      { type: 'problem', variantA: '', variantB: '' },
      { type: 'agitate', variantA: '', variantB: '' },
      { type: 'solution', variantA: '', variantB: '' },
      { type: 'cta', variantA: '', variantB: '' },
      { type: 'ps', variantA: '', variantB: '' },
    ],
  },
  {
    position: 3,
    label: 'Break-up',
    delayDays: 5,
    components: [
      { type: 'subject', variantA: '', variantB: '' },
      { type: 'preview', variantA: '', variantB: '' },
      { type: 'hook', variantA: '', variantB: '' },
      { type: 'problem', variantA: '', variantB: '' },
      { type: 'agitate', variantA: '', variantB: '' },
      { type: 'solution', variantA: '', variantB: '' },
      { type: 'cta', variantA: '', variantB: '' },
      { type: 'ps', variantA: '', variantB: '' },
    ],
  },
];
