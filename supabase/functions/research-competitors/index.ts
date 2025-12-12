import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a hash for caching
function createHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription, companyDomain } = await req.json();

    if (!productDescription) {
      return new Response(
        JSON.stringify({ error: 'Product description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cache key
    const cacheKey = createHash(`${productDescription}|${companyDomain || ''}`);

    // Check Supabase for cached results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from('competitor_research_cache')
      .select('competitors')
      .eq('input_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log('Returning cached competitor research');
      return new Response(
        JSON.stringify({
          competitors: cached.competitors,
          confidence: 0.9,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI Gateway for competitor research
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Input:', { productDescription, companyDomain });
    
    // Determine if product description is generic (auto-generated) or specific (user-provided)
    const isGenericDescription = productDescription.toLowerCase().includes('products and services from');
    
    const prompt = `A sales rep is selling the following product/solution:
"${productDescription}"
${companyDomain ? `They work for: ${companyDomain}` : ''}

${isGenericDescription 
  ? `Since the product description is generic, research what ${companyDomain} actually sells and identify their direct competitors.`
  : `Focus specifically on the product described above. Find competitors who sell SIMILAR products to the same type of buyers.`
}

The sales rep wants to find prospects currently using COMPETING products so they can pitch switching.

List 5-10 COMPETITOR COMPANIES whose products directly compete with what the rep is selling. These are vendors the sales rep wants to DISPLACE.

CRITICAL RULES:
- Focus on the SPECIFIC product/solution described, not the entire company portfolio
- Do NOT include "${companyDomain?.replace(/\.(com|io|net|org)$/i, '').replace(/^www\./, '') || 'the rep company'}" - that's the rep's own company
- Only include companies selling similar/competing products to similar buyers
- Rank from largest market presence to smallest

Return ONLY a JSON array of competitor company names (biggest first), no explanation.
Example: ["Competitor A", "Competitor B", "Competitor C"]`;

    console.log('Calling Lovable AI for competitor research...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a B2B market research expert. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    
    // Parse the JSON array from the response
    let competitors: string[] = [];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        competitors = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse competitors JSON:', content);
      competitors = [];
    }

    // Cache the results
    if (competitors.length > 0) {
      await supabase
        .from('competitor_research_cache')
        .upsert({
          input_hash: cacheKey,
          competitors: competitors,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'input_hash' });
    }

    console.log(`Found ${competitors.length} competitors`);

    return new Response(
      JSON.stringify({
        competitors,
        confidence: competitors.length > 0 ? 0.85 : 0.3,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in research-competitors:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
