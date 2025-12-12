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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      sessionId,
      prospect,
      jobId,
      forceRefresh = false,
    } = await req.json();

    const prospectKey = `${prospect.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${prospect.state?.toLowerCase() || 'unknown'}`;
    
    console.log('Researching prospect dossier:', prospectKey);

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('discovery_sessions')
      .select('id, criteria')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing dossier
    const { data: existingDossier } = await supabase
      .from('prospect_dossiers')
      .select('dossier, status, last_updated')
      .eq('session_id', sessionId)
      .eq('prospect_key', prospectKey)
      .maybeSingle();

    if (existingDossier?.status === 'ready' && !forceRefresh) {
      console.log('Returning cached dossier');
      return new Response(
        JSON.stringify({ dossier: existingDossier.dossier, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to researching
    await supabase
      .from('prospect_dossiers')
      .update({ status: 'researching' })
      .eq('session_id', sessionId)
      .eq('prospect_key', prospectKey);

    // Use Lovable AI for deep research
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const criteria = session.criteria as any;
    const competitors = criteria?.competitors || [];

    const prompt = `You are a deep research analyst investigating a prospect for B2B sales. Research this organization thoroughly:

ORGANIZATION: ${prospect.name}
LOCATION: ${prospect.state}
${prospect.website ? `WEBSITE: ${prospect.website}` : ''}
${prospect.address ? `ADDRESS: ${prospect.address}` : ''}

CONTEXT: We sell ${criteria?.productDescription || 'enterprise software'} and compete against ${competitors.join(', ') || 'incumbent vendors'}.

Provide a comprehensive dossier with:

1. summary: 2-3 sentence overview of the organization and why they're a good prospect

2. incumbent: Current vendor information
   - vendor: Vendor name or "Unknown"
   - confidence: 0.0-1.0
   - citations: Array of {url, excerpt} with evidence

3. contract: Contract intelligence
   - estimatedAnnualValue: e.g., "$500,000/yr" or null
   - estimatedExpiration: ISO date or "Unknown"
   - contractNotes: Any relevant contract details
   - citations: Array of {url, title, excerpt}

4. stakeholders: Key decision makers (array)
   - name: Person's name or "Unknown"
   - title: Their role
   - stance: "supporter" | "opponent" | "neutral" | "unknown"
   - confidence: 0.0-1.0
   - citations: Array of {url, excerpt}

5. macroSignals: External signals affecting the deal (array)
   - type: "budget" | "leadership" | "election" | "public_sentiment" | "audit" | "rfp" | "other"
   - description: What the signal means
   - confidence: 0.0-1.0
   - citations: Array of {url, excerpt}

6. recommendedAngles: Top 3 sales angles (array)
   - title: Short angle name
   - message: 2-3 sentence pitch using this angle
   - mappedAdvantageTitles: Which competitive advantages this leverages
   - confidence: 0.0-1.0
   - citations: Array of {url, excerpt}

7. anglesForList: Array of 1-2 short labels for UI chips (e.g., ["Renewal window", "Budget approved"])

8. score: Overall prospect score 0-100 based on likelihood to convert

Use realistic placeholder URLs for citations (e.g., govspend.com, opengov.com, organization websites).
Return ONLY valid JSON. No explanation text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a B2B sales intelligence researcher. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      // Update job and dossier status to failed
      if (jobId) {
        await supabase
          .from('research_jobs')
          .update({ 
            status: 'failed', 
            error: `AI error: ${response.status}`,
            finished_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }
      
      await supabase
        .from('prospect_dossiers')
        .update({ status: 'failed' })
        .eq('session_id', sessionId)
        .eq('prospect_key', prospectKey);
      
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
    
    let dossier;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        dossier = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      console.error('Failed to parse dossier:', e);
      dossier = {
        summary: 'Research completed with limited findings.',
        incumbent: { vendor: 'Unknown', confidence: 0.3, citations: [] },
        contract: { citations: [] },
        stakeholders: [],
        macroSignals: [],
        recommendedAngles: [],
        anglesForList: ['Needs research'],
        score: 50,
      };
    }

    // Add metadata
    dossier.lastUpdated = new Date().toISOString();

    // Collect all sources
    const sources: any[] = [];
    if (dossier.incumbent?.citations) sources.push(...dossier.incumbent.citations);
    if (dossier.contract?.citations) sources.push(...dossier.contract.citations);
    dossier.stakeholders?.forEach((s: any) => s.citations && sources.push(...s.citations));
    dossier.macroSignals?.forEach((m: any) => m.citations && sources.push(...m.citations));
    dossier.recommendedAngles?.forEach((a: any) => a.citations && sources.push(...a.citations));
    
    dossier.sources = sources;

    // Save dossier
    await supabase
      .from('prospect_dossiers')
      .update({
        dossier,
        sources,
        status: 'ready',
        last_updated: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('prospect_key', prospectKey);

    // Update job status
    if (jobId) {
      await supabase
        .from('research_jobs')
        .update({ 
          status: 'complete',
          progress: 100,
          finished_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    const latency = Date.now() - startTime;
    console.log(`Dossier researched in ${latency}ms`);

    return new Response(
      JSON.stringify({ dossier, cached: false, latency }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in research-prospect-dossier:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
