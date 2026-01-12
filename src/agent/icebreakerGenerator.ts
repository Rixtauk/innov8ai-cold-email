/**
 * Icebreaker generation module
 * Uses Claude to generate personalized icebreakers based on company research
 */

import type { IcebreakerResult, EnrichmentConfig } from './types.js';

/**
 * Generate a prompt for icebreaker creation
 */
export function buildIcebreakerPrompt(
  companyInfo: string,
  websiteUrl: string,
  tone: EnrichmentConfig['icebreakerTone']
): string {
  const toneInstructions = {
    professional: 'Keep the tone professional and business-focused. Avoid casual language.',
    casual: 'Use a relaxed, conversational tone. Be friendly but still respectful.',
    friendly: 'Be warm and personable. Show genuine interest and enthusiasm.',
  };

  return `Based on the following company information, generate a short, personalized icebreaker for a cold email.

Company Website: ${websiteUrl}

Company Information:
${companyInfo}

Requirements:
- The icebreaker should be 1-2 sentences maximum
- Reference something specific about the company (product, mission, recent news, etc.)
- ${toneInstructions[tone]}
- Do NOT use generic phrases like "I came across your company" or "I noticed your website"
- Make it feel like genuine research was done
- Focus on creating a connection or showing understanding of their business

Output ONLY the icebreaker text, nothing else.`;
}

/**
 * Extract key company insights from crawled content
 */
export function extractCompanyInsights(content: string): string {
  // Limit content to avoid token overflow
  const maxLength = 3000;
  let trimmedContent = content;

  if (content.length > maxLength) {
    // Try to find natural break points
    const paragraphs = content.split(/\n\n+/);
    trimmedContent = '';

    for (const para of paragraphs) {
      if ((trimmedContent + para).length > maxLength) break;
      trimmedContent += para + '\n\n';
    }

    if (trimmedContent.length === 0) {
      trimmedContent = content.substring(0, maxLength);
    }
  }

  return trimmedContent.trim();
}

/**
 * Parse the icebreaker response from Claude
 */
export function parseIcebreakerResponse(
  response: string,
  context: string,
  tone: EnrichmentConfig['icebreakerTone']
): IcebreakerResult {
  // Clean up the response
  let icebreaker = response.trim();

  // Remove any quotes that might wrap the response
  icebreaker = icebreaker.replace(/^["']|["']$/g, '');

  // Remove any prefix like "Icebreaker:" or "Here's an icebreaker:"
  icebreaker = icebreaker.replace(/^(icebreaker|here'?s?\s*(an?\s*)?icebreaker):?\s*/i, '');

  return {
    icebreaker,
    context,
    tone,
  };
}

/**
 * Validate that an icebreaker meets quality standards
 */
export function validateIcebreaker(icebreaker: string): boolean {
  // Check minimum length
  if (icebreaker.length < 20) return false;

  // Check maximum length (should be concise)
  if (icebreaker.length > 300) return false;

  // Check for generic phrases that should be avoided
  const genericPhrases = [
    'i came across your',
    'i noticed your website',
    'i found your company',
    'i stumbled upon',
    'i was browsing',
  ];

  const lowerIcebreaker = icebreaker.toLowerCase();
  if (genericPhrases.some(phrase => lowerIcebreaker.includes(phrase))) {
    return false;
  }

  return true;
}
