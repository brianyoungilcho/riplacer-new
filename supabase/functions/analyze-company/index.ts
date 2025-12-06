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
    const { website_url } = await req.json();
    
    if (!website_url) {
      throw new Error('Website URL is required');
    }

    console.log('Analyzing company website:', website_url);

    // Fetch the website content
    let pageContent = '';
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

    // Use OpenAI to analyze
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a sales intelligence analyst. Analyze the given website content and extract:
1. A concise one-sentence description of what the company sells
2. Their top 3 direct competitors in the market

Return your response as JSON with this exact format:
{
  "selling_proposition": "One sentence describing what they sell",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"]
}

If you cannot determine the information, provide reasonable estimates based on the industry.`
          },
          {
            role: 'user',
            content: `Analyze this company website (${website_url}):\n\n${pageContent}`
          }
        ],
        temperature: 0.3,
      }),
    });

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
        selling_proposition: 'Unable to determine from website',
        competitors: [],
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
