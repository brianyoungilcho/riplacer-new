import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prospect, user_context } = await req.json();
    
    if (!prospect) {
      throw new Error('Prospect data is required');
    }

    console.log('Enriching prospect:', prospect.name);

    // Try to fetch the prospect's website
    let pageContent = '';
    if (prospect.website_url) {
      try {
        const response = await fetch(prospect.website_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Riplacer/1.0)',
          },
        });
        const html = await response.text();
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000);
      } catch (error) {
        console.error('Error fetching prospect website:', error);
      }
    }

    const competitorList = user_context?.competitors?.join(', ') || 'unknown competitors';
    const userProduct = user_context?.selling_proposition || 'their product';

    const prompt = `You are a master sales researcher analyzing a prospect for a "rip and replace" sales opportunity.

CONTEXT:
- The salesperson is selling: ${userProduct}
- They want to replace these competitors: ${competitorList}
- Prospect name: ${prospect.name}
- Prospect address: ${prospect.address || 'Unknown'}
${pageContent ? `- Prospect website content:\n${pageContent}` : '- No website available'}

TASKS:
1. Identify the likely decision maker (title/role, e.g., "Chief of Police", "IT Director", "Operations Manager")
2. Determine if the prospect is likely using any of the competitor products (look for keywords, mentions, job postings, tech stack indicators)
3. Identify potential pain points that would make them want to switch
4. Write a compelling "rip and replace" argument: Why should they switch from the competitor to the user's product?

Return your analysis as JSON with this exact format:
{
  "decision_maker": "Title of likely decision maker",
  "competitor_presence": "Brief statement about detected competitor usage or 'No clear competitor presence detected'",
  "pain_points": ["Pain point 1", "Pain point 2"],
  "rip_replace_argument": "A 2-3 sentence compelling argument for why they should switch. Be specific and reference details from the prospect.",
  "summary": "One sentence summary of this opportunity"
}

Be specific and actionable. If you can't determine something with confidence, say so.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a sales intelligence AI. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from AI');
    }

    const content = data.choices[0].message.content;
    
    let enrichment;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      enrichment = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      enrichment = {
        decision_maker: 'Unable to determine',
        competitor_presence: 'Analysis unavailable',
        pain_points: [],
        rip_replace_argument: 'Could not generate recommendation',
        summary: 'Analysis failed',
      };
    }

    console.log('Enrichment complete for:', prospect.name);

    return new Response(
      JSON.stringify({ enrichment }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in enrich-prospect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
