import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, domain, anthropicKey } = req.body;

  // Use env var if available, otherwise use provided key
  const apiKey = process.env.ANTHROPIC_API_KEY || anthropicKey;

  if (!content || !domain) {
    return res.status(400).json({ error: 'Missing content or domain' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing Anthropic API key' });
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
    const client = new Anthropic({ apiKey });
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
      error: error instanceof Error ? error.message : 'Unknown AI error',
    });
  }
}
