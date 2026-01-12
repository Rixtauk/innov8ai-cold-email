import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

// Email position labels
const POSITION_LABELS: Record<number, string> = {
  1: 'Intro Email (first contact)',
  2: 'Follow-up Email (after no response)',
  3: 'Break-up Email (final attempt)',
};

// Component-specific prompts
const COMPONENT_PROMPTS: Record<string, { A: string; B: string }> = {
  subject: {
    A: `Generate a cold email subject line that is:
- Under 50 characters
- Direct and professional
- Creates curiosity without clickbait
- Can include merge fields like {{company}} or {{firstName}}

Return ONLY the subject line, nothing else.`,
    B: `Generate a cold email subject line that is:
- Under 50 characters
- Conversational and friendly
- Feels personal, like it's from a colleague
- Can include merge fields like {{company}} or {{firstName}}

Return ONLY the subject line, nothing else.`,
  },
  preview: {
    A: `Generate email preview text (appears after subject in inbox) that is:
- Under 100 characters
- Extends the curiosity from the subject
- Professional tone
- Hints at value without giving everything away

Return ONLY the preview text, nothing else.`,
    B: `Generate email preview text (appears after subject in inbox) that is:
- Under 100 characters
- Conversational and intriguing
- Creates a sense of connection
- Makes them want to open the email

Return ONLY the preview text, nothing else.`,
  },
  hook: {
    A: `Generate an opening line for a cold email that:
- Gets straight to the point
- Shows you've done research (use {{hook}} as placeholder for personalised content)
- Avoids generic phrases like "I hope this email finds you well"
- Under 2 sentences
- Professional but not stiff

Return ONLY the opening line(s), nothing else.`,
    B: `Generate an opening line for a cold email that:
- Feels casual and human
- Uses a question or observation
- Shows genuine interest in their business (use {{hook}} as placeholder)
- Under 2 sentences
- Conversational tone

Return ONLY the opening line(s), nothing else.`,
  },
  problem: {
    A: `Generate a problem statement for a cold email that:
- Identifies a specific pain point from the knowledge base
- Uses "you" language to make it personal
- Is direct and factual
- 1-2 sentences maximum

Return ONLY the problem statement, nothing else.`,
    B: `Generate a problem statement for a cold email that:
- Identifies a pain point as a question or observation
- Empathetic and understanding tone
- Makes them feel understood, not attacked
- 1-2 sentences maximum

Return ONLY the problem statement, nothing else.`,
  },
  agitate: {
    A: `Generate an "agitate" section that:
- Amplifies the problem with specific consequences
- Uses concrete examples (lost revenue, wasted time, etc.)
- Creates urgency without being pushy
- 1-2 sentences

Return ONLY the agitation text, nothing else.`,
    B: `Generate an "agitate" section that:
- Explores the emotional impact of the problem
- Uses questions to make them reflect
- Builds empathy and connection
- 1-2 sentences

Return ONLY the agitation text, nothing else.`,
  },
  solution: {
    A: `Generate a solution statement that:
- Directly states how you solve the problem
- Includes a specific result or benefit
- Professional and confident
- 1-2 sentences

Return ONLY the solution statement, nothing else.`,
    B: `Generate a solution statement that:
- Positions the solution as a discovery or insight
- Focuses on the transformation, not features
- Conversational and hopeful
- 1-2 sentences

Return ONLY the solution statement, nothing else.`,
  },
  cta: {
    A: `Generate a call-to-action that:
- Is clear and specific (e.g., "15-minute call this week")
- Low commitment, easy to say yes to
- Professional tone
- Single sentence, possibly a question

Return ONLY the CTA, nothing else.`,
    B: `Generate a call-to-action that:
- Feels like a genuine invitation, not a sales pitch
- Low pressure, gives them an easy out
- Conversational and friendly
- Single sentence, possibly a question

Return ONLY the CTA, nothing else.`,
  },
  ps: {
    A: `Generate a P.S. line that:
- Adds social proof or a secondary hook
- Creates additional curiosity
- Professional tone
- Short and punchy

Return ONLY the P.S. text (without "P.S." prefix), nothing else.`,
    B: `Generate a P.S. line that:
- Feels like an afterthought (but is strategic)
- Personal touch or interesting fact
- Conversational tone
- Short and memorable

Return ONLY the P.S. text (without "P.S." prefix), nothing else.`,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { knowledgeBase, componentType, emailPosition, variant } = req.body;

    if (!knowledgeBase || !componentType || !emailPosition || !variant) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const prompts = COMPONENT_PROMPTS[componentType];
    if (!prompts) {
      return res.status(400).json({ error: `Invalid component type: ${componentType}` });
    }

    const variantPrompt = variant === 'A' ? prompts.A : prompts.B;
    const positionLabel = POSITION_LABELS[emailPosition] || `Email ${emailPosition}`;

    const systemPrompt = `You are an expert cold email copywriter who writes in UK English. You create compelling, personalised cold emails that get responses.

Your task is to generate a specific component of a cold email based on the knowledge base provided.

IMPORTANT RULES:
- Use UK English spelling and grammar (colour, organisation, realise, etc.)
- Never use generic phrases like "I hope this email finds you well" or "I came across your company"
- Be specific and reference details from the knowledge base
- Keep it concise - every word should earn its place
- Sound human, not like a template or AI

Available merge fields you can use:
- {{firstName}} - recipient's first name
- {{lastName}} - recipient's last name
- {{company}} - recipient's company name
- {{domain}} - recipient's website domain
- {{hook}} - personalised opener (generated per-lead from their website)`;

    const userPrompt = `KNOWLEDGE BASE:
${knowledgeBase}

EMAIL POSITION: ${positionLabel}

COMPONENT TO GENERATE: ${componentType.toUpperCase()}

${variantPrompt}`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const textContent = response.content.find(block => block.type === 'text');
    const content = textContent ? textContent.text.trim() : '';

    // Clean up the response (remove quotes if wrapped)
    let cleanContent = content;
    if ((cleanContent.startsWith('"') && cleanContent.endsWith('"')) ||
        (cleanContent.startsWith("'") && cleanContent.endsWith("'"))) {
      cleanContent = cleanContent.slice(1, -1);
    }

    return res.status(200).json({
      content: cleanContent,
      componentType,
      emailPosition,
      variant,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Error generating email component:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Generation failed',
    });
  }
}
