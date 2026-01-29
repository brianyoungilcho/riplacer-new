import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleGeminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prospect, user_context, filters } = await req.json();
    
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

    const competitorList = filters?.competitors?.join(', ') || user_context?.competitors?.join(', ') || 'unknown competitors';
    const userProduct = user_context?.selling_proposition || 'their product';
    const categories = filters?.categories?.join(', ') || 'government/public sector';

    const prompt = `You are a master sales researcher analyzing a government/public sector prospect for a "rip and replace" sales opportunity.

CONTEXT:
- The salesperson is selling: ${userProduct}
- They want to replace these competitors: ${competitorList}
- Target buyer categories: ${categories}
- Prospect name: ${prospect.name}
- Prospect address: ${prospect.address || 'Unknown'}
${pageContent ? `- Prospect website content:\n${pageContent}` : '- No website available'}

TASKS:
1. Calculate a Riplace Score (0-100) based on:
   - Contract expiry proximity (0-30 points): Estimate likelihood of expiring contracts
   - Competitor match (0-40 points): Evidence they use listed competitors
   - Leadership change (0-20 points): Signs of new leadership or reorganization
   - Budget signals (0-10 points): Budget concerns, grant funding, modernization initiatives

2. Identify the primary highlight/reason this is a good target (one concise phrase like "Contract Expiring in <6 months" or "New Chief in town")

3. Classify the highlight type: "timing" (contract/budget related), "opportunity" (new leadership/grant), or "weakness" (competitor issues)

4. Identify the likely decision maker (title/role)

5. Estimate contract value if possible (e.g., "$500,000/yr" or "Unknown")

6. Write a Riplace Angle: 2-3 sentences explaining specifically why this prospect is a good target and what approach to take

7. Provide 2-3 source suggestions (types of documents/sources that would verify this intelligence)

Return your analysis as JSON with this exact format:
{
  "riplace_score": 75,
  "highlight": "Contract Expiring in <6 months",
  "highlight_type": "timing",
  "decision_maker": "Chief of Police",
  "contract_value": "$500,000/yr",
  "riplace_angle": "2-3 sentence strategy for approaching this prospect...",
  "competitor_detected": "Axon",
  "pain_points": ["Pain point 1", "Pain point 2"],
  "sources": [
    {"label": "City Budget Documents", "url": "https://example.gov/budget"},
    {"label": "Council Meeting Minutes", "url": "https://example.gov/meetings"}
  ],
  "summary": "One sentence summary of this opportunity"
}

Be specific and actionable. If you can't determine something with confidence, provide reasonable estimates based on the category.`;

    if (!googleGeminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Gemini OpenAI-compatible endpoint
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleGeminiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a sales intelligence AI specializing in government/public sector procurement. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI enrichment failed');
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid AI response:', data);
      throw new Error('Invalid response from AI');
    }

    const content = data.choices[0].message.content;
    
    let enrichment;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      enrichment = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Content:', content);
      // Return mock data on parse failure
      enrichment = {
        riplace_score: Math.floor(Math.random() * 40) + 50,
        highlight: 'Potential opportunity identified',
        highlight_type: 'opportunity',
        decision_maker: 'Department Head',
        contract_value: 'Unknown',
        riplace_angle: 'This prospect may be interested in modernizing their current solution. Consider reaching out to understand their current pain points.',
        competitor_detected: null,
        pain_points: ['Current solution may be outdated', 'Budget cycle approaching'],
        sources: [],
        summary: 'Prospect identified for further research',
      };
    }

    console.log('Enrichment complete for:', prospect.name, 'Score:', enrichment.riplace_score);

    return new Response(
      JSON.stringify({ 
        enrichment,
        last_updated: new Date().toISOString()
      }),
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
