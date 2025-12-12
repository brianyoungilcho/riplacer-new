import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get user from auth header (optional for anonymous sessions)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const {
      sessionId,
      productDescription,
      targetCategories,
      competitors,
      companyDomain,
    } = await req.json();

    console.log('Researching competitive advantages for session:', sessionId, 'user:', userId || 'anonymous');

    // Verify session exists and is accessible
    const { data: session, error: sessionError } = await supabase
      .from('discovery_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify access: either user owns it or it's anonymous
    if (session.user_id && session.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing brief
    const { data: existingBrief } = await supabase
      .from('advantage_briefs')
      .select('brief, sources, status')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingBrief?.status === 'ready') {
      console.log('Returning existing advantage brief');
      return new Response(
        JSON.stringify({ brief: existingBrief.brief, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update brief record with pending status
    await supabase
      .from('advantage_briefs')
      .upsert({
        session_id: sessionId,
        brief: {},
        status: 'researching',
      }, { onConflict: 'session_id' });

    // Use Lovable AI to generate competitive advantages
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a competitive intelligence analyst. Analyze the competitive landscape for:

PRODUCT/SERVICE: ${productDescription}
${companyDomain ? `COMPANY WEBSITE: ${companyDomain}` : ''}
TARGET BUYERS: ${targetCategories?.join(', ') || 'government and enterprise'}
COMPETITORS: ${competitors?.join(', ') || 'various incumbents'}

Create a Strategic Advantage Brief with:

1. positioningSummary: 2-3 sentences on overall competitive positioning

2. advantages: Array of 3-5 key competitive advantages, each with:
   - title: Short advantage name (e.g., "Lower Total Cost of Ownership")
   - whyItMattersToBuyer: Why this matters to the target buyer
   - competitorComparisons: Array of comparisons to each competitor with:
     - competitor: Competitor name
     - claim: Specific, defensible claim about the advantage
     - confidence: 0.0-1.0 confidence score
     - citations: Array of {url, title, excerpt} for sources (use realistic placeholder URLs)
   - talkTrackBullets: 3-4 key talking points for sales reps
   - objectionsAndResponses: Array of {objection, response} pairs

Return ONLY valid JSON matching this structure. No explanation text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a competitive intelligence expert. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI service error');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    // Parse JSON from response
    let brief;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        brief = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      brief = {
        positioningSummary: 'Unable to generate positioning summary.',
        advantages: [],
      };
    }

    // Add metadata
    brief.lastUpdated = new Date().toISOString();

    // Save brief
    await supabase
      .from('advantage_briefs')
      .upsert({
        session_id: sessionId,
        brief,
        sources: brief.advantages?.flatMap((a: any) => 
          a.competitorComparisons?.flatMap((c: any) => c.citations || []) || []
        ) || [],
        status: 'ready',
      }, { onConflict: 'session_id' });

    const latency = Date.now() - startTime;
    console.log(`Advantage brief generated in ${latency}ms`);

    return new Response(
      JSON.stringify({ brief, cached: false, latency }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in research-competitive-advantages:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});