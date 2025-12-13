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

    // Use direct Google Gemini API with Google Search grounding
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    console.log('Input:', { productDescription, companyDomain });
    
    // Determine if product description is generic (auto-generated) or specific (user-provided)
    const isGenericDescription = productDescription.toLowerCase().includes('products and services from');
    
    // Clean company name from domain for exclusion
    const companyName = companyDomain?.replace(/\.(com|io|net|org|co|ai|dev)$/i, '').replace(/^www\./, '') || '';
    
    const prompt = `You are researching CURRENT competitors in the market. Use Google Search to find the most up-to-date information.

A sales rep is selling:
"${productDescription}"
${companyDomain ? `They work for: ${companyDomain}` : ''}

${isGenericDescription 
  ? `The product description is generic. Search the web to find what ${companyDomain} actually sells, then identify their direct competitors.`
  : `Search the web for companies that sell SIMILAR products to "${productDescription}" targeting the same buyer personas.`
}

The sales rep wants to find prospects currently using COMPETING products so they can pitch switching.

RESEARCH INSTRUCTIONS:
1. Search for current market data, not just your training knowledge
2. Look for recent product launches, acquisitions, or market changes
3. Focus on the SPECIFIC product/solution described, not entire company portfolios
4. Find vendors that the sales rep would want to DISPLACE

CRITICAL RULES:
- Do NOT include "${companyName}" or variations of it - that's the rep's own company
- Only include companies selling similar/competing products to similar buyers
- Prioritize companies with significant market presence
- Include both established players and notable challengers

Return ONLY a JSON array of 5-10 competitor company names, ordered from largest market presence to smallest.
Example: ["Competitor A", "Competitor B", "Competitor C"]`;

    console.log('Calling Gemini 2.5 Flash with Google Search grounding...');
    
    // Call Gemini API directly with google_search_retrieval tool
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          tools: [
            {
              google_search: {}
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini 2.5 Flash response received');
    
    // Extract content from Gemini response format
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Extract grounding metadata if available
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    let sources: string[] = [];
    
    if (groundingMetadata?.groundingChunks) {
      sources = groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => chunk.web.uri)
        .slice(0, 10);
      console.log(`Found ${sources.length} grounding sources from Google Search`);
    }
    
    if (groundingMetadata?.webSearchQueries) {
      console.log('Search queries used:', groundingMetadata.webSearchQueries);
    }
    
    // Parse the JSON array from the response
    let competitors: string[] = [];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        competitors = JSON.parse(jsonMatch[0]);
        // Filter out any variations of the user's company name
        if (companyName) {
          const lowerCompanyName = companyName.toLowerCase();
          competitors = competitors.filter((c: string) => 
            !c.toLowerCase().includes(lowerCompanyName) &&
            !lowerCompanyName.includes(c.toLowerCase())
          );
        }
      }
    } catch (e) {
      console.error('Failed to parse competitors JSON:', content);
      competitors = [];
    }

    // Cache the results with sources
    if (competitors.length > 0) {
      await supabase
        .from('competitor_research_cache')
        .upsert({
          input_hash: cacheKey,
          competitors: competitors,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'input_hash' });
    }

    console.log(`Found ${competitors.length} competitors with ${sources.length} grounding sources`);

    return new Response(
      JSON.stringify({
        competitors,
        sources,
        confidence: competitors.length > 0 ? 0.9 : 0.3,
        cached: false,
        model: 'gemini-2.5-flash',
        webSearchEnabled: true,
        searchQueries: groundingMetadata?.webSearchQueries || []
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
