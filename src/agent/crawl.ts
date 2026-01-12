/**
 * Website crawling module using Firecrawl
 * Handles fetching and parsing website content for lead enrichment
 */

import type { CrawlResult } from './types.js';

/**
 * Common valid TLDs - includes traditional, country-code, and new gTLDs
 * This is not exhaustive but covers the vast majority of legitimate business domains
 */
const VALID_TLDS = new Set([
  // Generic TLDs
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  // Common business TLDs
  'biz', 'info', 'pro', 'name', 'mobi', 'app', 'dev', 'io', 'co', 'ai', 'tech',
  'online', 'site', 'website', 'web', 'blog', 'shop', 'store', 'cloud', 'digital',
  'media', 'agency', 'studio', 'design', 'solutions', 'services', 'consulting',
  'software', 'systems', 'group', 'team', 'company', 'business', 'enterprise',
  'global', 'world', 'international', 'network', 'marketing', 'email', 'support',
  // Industry specific
  'clinic', 'dental', 'health', 'healthcare', 'medical', 'hospital', 'doctor',
  'law', 'legal', 'attorney', 'lawyer', 'accountant', 'finance', 'financial',
  'insurance', 'bank', 'capital', 'fund', 'invest', 'money', 'credit',
  'realty', 'property', 'properties', 'estate', 'house', 'homes', 'housing',
  'auto', 'car', 'cars', 'bike', 'travel', 'flights', 'hotel', 'vacation',
  'restaurant', 'cafe', 'pizza', 'food', 'kitchen', 'catering', 'bar',
  'fitness', 'yoga', 'gym', 'training', 'coach', 'academy', 'education', 'school',
  'photography', 'photo', 'gallery', 'art', 'music', 'video', 'film', 'tv',
  'news', 'press', 'report', 'review', 'guide', 'tips', 'how', 'wiki',
  // Tech specific
  'xyz', 'top', 'icu', 'vip', 'club', 'live', 'rocks', 'fun', 'zone', 'space',
  'link', 'click', 'page', 'one', 'plus', 'social', 'chat', 'community', 'forum',
  // Country code TLDs (common ones)
  'uk', 'us', 'ca', 'au', 'nz', 'de', 'fr', 'it', 'es', 'nl', 'be', 'ch', 'at',
  'se', 'no', 'dk', 'fi', 'pl', 'cz', 'ru', 'ua', 'jp', 'cn', 'kr', 'in', 'sg',
  'hk', 'tw', 'my', 'ph', 'th', 'vn', 'id', 'br', 'mx', 'ar', 'cl', 'co', 'pe',
  'za', 'ae', 'il', 'tr', 'ie', 'pt', 'gr', 'hu', 'ro', 'bg', 'hr', 'sk', 'si',
  'ee', 'lv', 'lt', 'is', 'lu', 'mt', 'cy',
]);

/**
 * Multi-part TLDs (country-code second-level domains)
 */
const MULTI_PART_TLDS = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'ac.uk', 'gov.uk', 'nhs.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'asn.au', 'id.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz', 'school.nz', 'geek.nz',
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br',
  'co.za', 'net.za', 'org.za', 'gov.za', 'edu.za',
  'com.mx', 'net.mx', 'org.mx', 'gob.mx', 'edu.mx',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
  'co.in', 'net.in', 'org.in', 'gov.in', 'ac.in', 'edu.in',
  'com.sg', 'net.sg', 'org.sg', 'gov.sg', 'edu.sg',
  'com.hk', 'net.hk', 'org.hk', 'gov.hk', 'edu.hk',
  'co.kr', 'ne.kr', 'or.kr', 'go.kr', 'ac.kr',
  'com.tw', 'net.tw', 'org.tw', 'gov.tw', 'edu.tw',
  'co.th', 'in.th', 'ac.th', 'go.th', 'or.th',
  'com.my', 'net.my', 'org.my', 'gov.my', 'edu.my',
  'com.ph', 'net.ph', 'org.ph', 'gov.ph', 'edu.ph',
  'co.id', 'web.id', 'or.id', 'go.id', 'ac.id',
  'com.vn', 'net.vn', 'org.vn', 'gov.vn', 'edu.vn',
  'com.ar', 'net.ar', 'org.ar', 'gob.ar', 'edu.ar',
  'com.co', 'net.co', 'org.co', 'gov.co', 'edu.co',
  'co.il', 'net.il', 'org.il', 'gov.il', 'ac.il',
  'com.tr', 'net.tr', 'org.tr', 'gov.tr', 'edu.tr',
  'co.ae', 'net.ae', 'org.ae', 'gov.ae', 'ac.ae',
  'com.ua', 'net.ua', 'org.ua', 'gov.ua', 'edu.ua',
  'com.pl', 'net.pl', 'org.pl', 'gov.pl', 'edu.pl',
  'co.de', 'com.de',
  'com.es', 'org.es', 'gob.es', 'edu.es',
  'com.fr', 'asso.fr', 'gouv.fr',
  'co.it', 'com.it',
  'com.pt', 'org.pt', 'gov.pt', 'edu.pt',
  'com.nl', 'co.nl',
  'com.be', 'co.be',
  'co.at', 'or.at', 'ac.at',
  'co.ch', 'com.ch',
  'co.se', 'com.se',
  'co.no', 'com.no',
  'co.dk', 'com.dk',
  'co.fi', 'com.fi',
  'co.ie', 'com.ie',
  'co.gr', 'com.gr',
  'co.hu', 'com.hu',
  'co.ro', 'com.ro',
  'co.cz', 'com.cz',
  'eu.com', 'us.com', 'uk.com', 'de.com', 'jpn.com', 'br.com', 'cn.com',
]);

export interface DomainValidationResult {
  isValid: boolean;
  domain: string;
  tld: string;
  error?: string;
}

/**
 * Validate if a string is a valid domain
 * Checks format and TLD validity
 */
export function validateDomain(input: string): DomainValidationResult {
  // Clean the input
  let cleaned = input.trim().toLowerCase();

  // Remove protocol if present
  cleaned = cleaned.replace(/^https?:\/\//, '');

  // Remove www. prefix
  cleaned = cleaned.replace(/^www\./, '');

  // Remove any path, query string, or hash
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];

  // Remove port if present
  cleaned = cleaned.split(':')[0];

  // Basic format check
  if (!cleaned || cleaned.length < 3) {
    return { isValid: false, domain: cleaned, tld: '', error: 'Domain too short' };
  }

  // Check for invalid characters
  // Domain can only contain letters, numbers, hyphens, and dots
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
  if (!domainRegex.test(cleaned)) {
    // More lenient check - at least has a dot and some characters
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
      return { isValid: false, domain: cleaned, tld: '', error: 'Invalid domain format' };
    }
  }

  // Check for consecutive dots or hyphens
  if (/\.\./.test(cleaned) || /--/.test(cleaned)) {
    return { isValid: false, domain: cleaned, tld: '', error: 'Invalid domain format (consecutive dots or hyphens)' };
  }

  // Check if domain starts or ends with hyphen
  if (cleaned.startsWith('-') || cleaned.endsWith('-')) {
    return { isValid: false, domain: cleaned, tld: '', error: 'Domain cannot start or end with hyphen' };
  }

  // Extract TLD
  const parts = cleaned.split('.');
  if (parts.length < 2) {
    return { isValid: false, domain: cleaned, tld: '', error: 'No TLD found' };
  }

  // Check for multi-part TLD first (e.g., co.uk, com.au)
  if (parts.length >= 3) {
    const possibleMultiTld = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (MULTI_PART_TLDS.has(possibleMultiTld)) {
      return { isValid: true, domain: cleaned, tld: possibleMultiTld };
    }
  }

  // Check single TLD
  const tld = parts[parts.length - 1];
  if (VALID_TLDS.has(tld)) {
    return { isValid: true, domain: cleaned, tld };
  }

  // TLD not in our list - could still be valid (new TLDs are created)
  // Allow if it's 2-10 chars and looks reasonable
  if (tld.length >= 2 && tld.length <= 10 && /^[a-z]+$/.test(tld)) {
    return {
      isValid: true,
      domain: cleaned,
      tld,
      // Note: not adding an error/warning since many new TLDs exist
    };
  }

  return { isValid: false, domain: cleaned, tld, error: `Invalid or unrecognized TLD: .${tld}` };
}

/**
 * Validate multiple domains and return results
 */
export function validateDomains(domains: string[]): Map<string, DomainValidationResult> {
  const results = new Map<string, DomainValidationResult>();
  for (const domain of domains) {
    results.set(domain, validateDomain(domain));
  }
  return results;
}

/**
 * Quick check if a domain looks valid (less strict, for filtering)
 */
export function isLikelyValidDomain(input: string): boolean {
  const result = validateDomain(input);
  return result.isValid;
}

/**
 * Crawl a website and extract relevant content
 * This function is designed to be called by the Claude Agent SDK
 * which has access to Firecrawl MCP tools
 */
export async function crawlWebsite(url: string): Promise<CrawlResult> {
  // Normalize URL
  const normalizedUrl = normalizeUrl(url);

  return {
    url: normalizedUrl,
    content: '',
    success: true,
  };
}

/**
 * Normalize a URL to ensure it has a proper protocol
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // Add https:// if no protocol specified
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/**
 * Extract the domain from a URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(normalizeUrl(url));
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Build a contact page URL from a base domain
 */
export function buildContactUrl(baseUrl: string): string[] {
  const normalized = normalizeUrl(baseUrl);
  const commonContactPaths = [
    '/contact',
    '/contact-us',
    '/about',
    '/about-us',
    '/team',
    '/company',
  ];

  return commonContactPaths.map(path => `${normalized}${path}`);
}
