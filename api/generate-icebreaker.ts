import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, companyName, domain, tone, anthropicKey } = req.body;

  // Use env var if available, otherwise use provided key
  const apiKey = process.env.ANTHROPIC_API_KEY || anthropicKey;

  if (!content || !domain) {
    return res.status(400).json({ error: 'Missing content or domain' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing Anthropic API key' });
  }

  const toneInstructions: Record<string, string> = {
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
    const client = new Anthropic({ apiKey });
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
      error: error instanceof Error ? error.message : 'Unknown AI error',
    });
  }
}
