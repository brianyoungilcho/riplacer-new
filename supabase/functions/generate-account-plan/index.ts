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
      prospectId,
      repNotes,
    } = await req.json();

    console.log('Generating account plan for:', prospectId);

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

    // Get advantage brief
    const { data: briefData } = await supabase
      .from('advantage_briefs')
      .select('brief')
      .eq('session_id', sessionId)
      .maybeSingle();

    // Get prospect dossier
    const { data: dossierData } = await supabase
      .from('prospect_dossiers')
      .select('prospect_name, dossier')
      .eq('session_id', sessionId)
      .eq('prospect_key', prospectId)
      .maybeSingle();

    if (!dossierData) {
      return new Response(
        JSON.stringify({ error: 'Prospect dossier not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or use provided rep notes
    let notes = repNotes;
    if (!notes) {
      const { data: savedNotes } = await supabase
        .from('rep_notes')
        .select('notes')
        .eq('session_id', sessionId)
        .eq('prospect_key', prospectId)
        .eq('user_id', user.id)
        .maybeSingle();
      notes = savedNotes?.notes;
    }

    // Use Lovable AI to generate account plan
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const criteria = session.criteria as any;
    const brief = briefData?.brief as any;
    const dossier = dossierData.dossier as any;

    const prompt = `You are a strategic sales advisor. Create an account plan for this prospect.

PROSPECT: ${dossierData.prospect_name}

WHAT WE SELL: ${criteria?.productDescription || 'Enterprise software'}

COMPETITIVE ADVANTAGES:
${brief?.positioningSummary || 'No advantage brief available'}
${brief?.advantages?.map((a: any) => `- ${a.title}: ${a.whyItMattersToBuyer}`).join('\n') || ''}

PROSPECT DOSSIER:
Summary: ${dossier?.summary || 'No summary'}
Current Vendor: ${dossier?.incumbent?.vendor || 'Unknown'}
Contract Value: ${dossier?.contract?.estimatedAnnualValue || 'Unknown'}
Contract Expiration: ${dossier?.contract?.estimatedExpiration || 'Unknown'}

Stakeholders:
${dossier?.stakeholders?.map((s: any) => `- ${s.name || 'Unknown'} (${s.title || 'Unknown'}): ${s.stance}`).join('\n') || 'None identified'}

Signals:
${dossier?.macroSignals?.map((m: any) => `- ${m.type}: ${m.description}`).join('\n') || 'None identified'}

Recommended Angles:
${dossier?.recommendedAngles?.map((a: any) => `- ${a.title}: ${a.message}`).join('\n') || 'None'}

${notes ? `REP NOTES (private context):\n${notes}` : ''}

Create an actionable account plan with:

1. executiveSummary: 2-3 sentence strategic overview

2. whoToTarget: Array of specific people/roles to engage first

3. whoToAvoid: Array of people/roles to avoid or be careful with

4. nextSteps: Array of 3-5 specific, actionable next steps in priority order

5. talkTrack: Array of 3-5 key talking points customized for this account

6. emailDraft: A personalized cold email draft (2-3 paragraphs)

7. risks: Array of potential deal risks and how to mitigate them

8. confidence: Overall confidence score 0-100 for winning this deal

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
          { role: 'system', content: 'You are a strategic B2B sales advisor. Return only valid JSON.' },
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
    
    let plan;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      console.error('Failed to parse plan:', e);
      plan = {
        executiveSummary: 'Unable to generate plan. Please try again.',
        whoToTarget: [],
        whoToAvoid: [],
        nextSteps: ['Research the prospect further', 'Identify key stakeholders'],
        talkTrack: [],
        risks: [],
        confidence: 50,
      };
    }

    plan.lastUpdated = new Date().toISOString();

    const latency = Date.now() - startTime;
    console.log(`Account plan generated in ${latency}ms`);

    return new Response(
      JSON.stringify({ plan, latency }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-account-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
