import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website_url, product_description } = await req.json();
    
    if (!website_url && !product_description) {
      throw new Error('Website URL or product description is required');
    }

    console.log('Analyzing company:', website_url || 'from description');

    // Fetch the website content if URL provided
    let pageContent = '';
    if (website_url) {
      try {
        const response = await fetch(website_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Riplacer/1.0)',
          },
        });
        const html = await response.text();
        // Extract text content (basic extraction)
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000); // Limit content
      } catch (error) {
        console.error('Error fetching website:', error);
        pageContent = 'Could not fetch website content';
      }
    }

    const prompt = product_description 
      ? `Analyze this product/service description: ${product_description}`
      : `Analyze this company website (${website_url}):\n\n${pageContent}`;

    // Use Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a sales intelligence analyst. Analyze the given website content or product description and extract:
1. The company name (if identifiable)
2. A concise one-sentence description of what the company sells
3. The target market/industry
4. Their top 5 direct competitors in the market

Return your response as JSON with this exact format:
{
  "company_name": "Company Name or null if unknown",
  "selling_proposition": "One sentence describing what they sell",
  "target_market": "Description of target market",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3", "Competitor 4", "Competitor 5"],
  "industry": "Industry category"
}

If you cannot determine the information, provide reasonable estimates based on the industry.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
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
      throw new Error('AI analysis failed');
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from AI');
    }

    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let result;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      result = {
        company_name: null,
        selling_proposition: 'Unable to determine from provided information',
        target_market: 'Unknown',
        competitors: [],
        industry: 'Unknown',
      };
    }

    console.log('Analysis result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-company:', error);
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
