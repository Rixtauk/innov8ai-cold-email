/**
 * Backend API server for Innov8ai Cold Email
 * Proxies requests to Anthropic and Firecrawl APIs to avoid CORS issues
 */

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import FirecrawlApp from '@mendable/firecrawl-js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Store clients per-request (keys come from frontend)
function getAnthropicClient(apiKey) {
  return new Anthropic({ apiKey });
}

function getFirecrawlClient(apiKey) {
  return new FirecrawlApp({ apiKey });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scrape a URL
app.post('/api/scrape', async (req, res) => {
  const { url, firecrawlKey } = req.body;

  if (!url || !firecrawlKey) {
    return res.status(400).json({ error: 'Missing url or firecrawlKey' });
  }

  try {
    const client = getFirecrawlClient(firecrawlKey);
    const response = await client.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 2000,
    });

    if (!response.success) {
      return res.json({
        success: false,
        url,
        error: response.error || 'Failed to scrape URL',
      });
    }

    res.json({
      success: true,
      url,
      markdown: response.markdown,
      title: response.metadata?.title,
      description: response.metadata?.description,
    });
  } catch (error) {
    res.json({
      success: false,
      url,
      error: error.message || 'Unknown scraping error',
    });
  }
});

// Extract emails using Claude
app.post('/api/extract-emails', async (req, res) => {
  const { content, domain, anthropicKey } = req.body;

  if (!content || !domain || !anthropicKey) {
    return res.status(400).json({ error: 'Missing content, domain, or anthropicKey' });
  }

  const prompt = `Analyze this website content and extract any email addresses you find.

Website domain: ${domain}

Website content:
${content.substring(0, 8000)}

Instructions:
1. Find ALL email addresses mentioned in the content
2. Identify the most relevant business contact email (not generic like noreply@, info@ if there's a better option)
3. Rate your confidence: "high" if email clearly belongs to this company, "medium" if probably correct, "low" if uncertain

Respond in this exact JSON format:
{
  "emails": ["email1@example.com", "email2@example.com"],
  "primaryEmail": "best@example.com",
  "confidence": "high"
}

If no emails found, respond with:
{
  "emails": [],
  "primaryEmail": null,
  "confidence": "low"
}`;

  try {
    const client = getAnthropicClient(anthropicKey);
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const text = textContent?.text || '';

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({
        success: false,
        emails: [],
        confidence: 'low',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        error: 'Failed to parse AI response',
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      emails: parsed.emails || [],
      primaryEmail: parsed.primaryEmail || parsed.emails?.[0],
      confidence: parsed.confidence || 'medium',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  } catch (error) {
    res.json({
      success: false,
      emails: [],
      confidence: 'low',
      inputTokens: 0,
      outputTokens: 0,
      error: error.message || 'Unknown AI error',
    });
  }
});

// Generate icebreaker using Claude
app.post('/api/generate-icebreaker', async (req, res) => {
  const { content, companyName, domain, tone, anthropicKey } = req.body;

  if (!content || !domain || !anthropicKey) {
    return res.status(400).json({ error: 'Missing content, domain, or anthropicKey' });
  }

  const toneInstructions = {
    professional: 'Use formal, business-appropriate language. Be respectful and direct.',
    casual: 'Use a relaxed, conversational tone. Be approachable but still professional.',
    friendly: 'Be warm and personable. Show genuine interest and enthusiasm.',
  };

  const prompt = `Generate a personalized cold email icebreaker for outreach to this company.

Company: ${companyName || domain}
Website: ${domain}

Website content (for context):
${content.substring(0, 6000)}

Tone: ${tone || 'professional'}
${toneInstructions[tone] || toneInstructions.professional}

Requirements:
1. The icebreaker should be 1-2 sentences MAX
2. Reference something SPECIFIC from their website (a product, service, recent news, company value, etc.)
3. Make it feel personal and researched, not generic
4. Do NOT include greetings like "Hi" or "Hello" - just the icebreaker content
5. Do NOT include the ask or call-to-action - just the opening hook
6. IMPORTANT: Use British English (UK) spelling and grammar throughout (e.g., "specialise" not "specialize", "colour" not "color", "organisation" not "organization", "centre" not "center")

Good example: "I noticed your recent expansion into the European market with the new Berlin office - congratulations on the growth! Your approach to sustainable packaging really stands out in the industry."

Bad example: "I came across your website and was impressed by what you do." (too generic)

Respond with ONLY the icebreaker text, nothing else.`;

  try {
    const client = getAnthropicClient(anthropicKey);
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    const icebreaker = textContent?.text?.trim() || '';

    res.json({
      success: true,
      icebreaker,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  } catch (error) {
    res.json({
      success: false,
      icebreaker: '',
      inputTokens: 0,
      outputTokens: 0,
      error: error.message || 'Unknown AI error',
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/scrape');
  console.log('  POST /api/extract-emails');
  console.log('  POST /api/generate-icebreaker');
});
