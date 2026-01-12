/**
 * Email extraction module
 * Extracts and validates email addresses from crawled website content
 */

import type { EmailExtractionResult } from './types.js';
import { extractDomain } from './crawl.js';

/**
 * Extract emails from page content
 */
export function extractEmailsFromContent(content: string): string[] {
  // Comprehensive email regex pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = content.match(emailPattern) || [];

  // Deduplicate and filter out common false positives
  const uniqueEmails = [...new Set(matches)]
    .filter(email => !isGenericEmail(email))
    .filter(email => isValidEmailFormat(email));

  return uniqueEmails;
}

/**
 * Check if an email appears to be generic/non-personal
 */
function isGenericEmail(email: string): boolean {
  const genericPrefixes = [
    'noreply', 'no-reply', 'donotreply', 'do-not-reply',
    'mailer-daemon', 'postmaster', 'webmaster',
    'example', 'test', 'demo', 'sample',
  ];

  const localPart = email.split('@')[0].toLowerCase();
  return genericPrefixes.some(prefix => localPart.includes(prefix));
}

/**
 * Validate email format
 */
function isValidEmailFormat(email: string): boolean {
  // More strict validation
  const strictPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!strictPattern.test(email)) return false;

  // Check for reasonable length
  if (email.length > 254) return false;

  // Check local part length
  const [localPart] = email.split('@');
  if (localPart.length > 64) return false;

  return true;
}

/**
 * Score and rank emails to find the best primary contact
 */
export function rankEmails(emails: string[], domain: string): string[] {
  const domainBase = domain.replace(/^www\./, '').toLowerCase();

  return emails
    .map(email => ({
      email,
      score: calculateEmailScore(email, domainBase),
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.email);
}

/**
 * Calculate a relevance score for an email
 */
function calculateEmailScore(email: string, domain: string): number {
  let score = 0;
  const emailLower = email.toLowerCase();
  const localPart = emailLower.split('@')[0];
  const emailDomain = emailLower.split('@')[1];

  // Prefer emails from the same domain
  if (emailDomain.includes(domain) || domain.includes(emailDomain.replace(/\.[^.]+$/, ''))) {
    score += 50;
  }

  // Prefer personal-looking emails
  const personalPatterns = ['hello', 'hi', 'info', 'contact', 'sales', 'team'];
  if (personalPatterns.some(p => localPart.includes(p))) {
    score += 20;
  }

  // Prefer shorter local parts (likely real names)
  if (localPart.length < 15) {
    score += 10;
  }

  // Bonus for name-like patterns (first.last, firstlast)
  if (/^[a-z]+\.[a-z]+$/.test(localPart) || /^[a-z]{4,12}$/.test(localPart)) {
    score += 15;
  }

  return score;
}

/**
 * Analyze content and extract the best email
 */
export function analyzeAndExtractEmail(
  content: string,
  websiteUrl: string
): EmailExtractionResult {
  const emails = extractEmailsFromContent(content);
  const domain = extractDomain(websiteUrl);
  const rankedEmails = rankEmails(emails, domain);

  if (rankedEmails.length === 0) {
    return {
      emails: [],
      source: 'page_content',
      confidence: 'low',
    };
  }

  const primaryEmail = rankedEmails[0];
  const primaryDomain = primaryEmail.split('@')[1];

  // Determine confidence based on domain match
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (primaryDomain.includes(domain) || domain.includes(primaryDomain.replace(/\.[^.]+$/, ''))) {
    confidence = 'high';
  }

  return {
    emails: rankedEmails,
    primaryEmail,
    source: 'page_content',
    confidence,
  };
}
