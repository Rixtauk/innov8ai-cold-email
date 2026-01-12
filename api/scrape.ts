import type { VercelRequest, VercelResponse } from '@vercel/node';
import FirecrawlApp from '@mendable/firecrawl-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, firecrawlKey } = req.body;

  // Use env var if available, otherwise use provided key
  const apiKey = process.env.FIRECRAWL_API_KEY || firecrawlKey;

  if (!url) {
    return res.status(400).json({ error: 'Missing url' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing Firecrawl API key' });
  }

  try {
    const client = new FirecrawlApp({ apiKey });
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
      error: error instanceof Error ? error.message : 'Unknown scraping error',
    });
  }
}
