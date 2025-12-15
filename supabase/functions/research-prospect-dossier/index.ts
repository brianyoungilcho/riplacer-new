import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Structured JSON schema for prospect dossier
const DOSSIER_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'prospect_dossier',
    schema: {
      type: 'object',
      properties: {
        summary: { 
          type: 'string', 
          description: '3-4 sentence executive summary of the organization and why they are a strong prospect' 
        },
        incumbent: {
          type: 'object',
          properties: {
            vendor: { type: 'string', description: 'Current vendor name or "Unknown"' },
            product: { type: 'string', description: 'Specific product being used' },
            confidence: { type: 'number', description: 'Confidence 0.0-1.0' },
            contractDetails: { type: 'string', description: 'Any known contract details' },
          },
        },
        contract: {
          type: 'object',
          properties: {
            estimatedAnnualValue: { type: 'string', description: 'Estimated value like "$500,000/yr"' },
            estimatedExpiration: { type: 'string', description: 'Expiration date or timeframe' },
            procurementHistory: { type: 'string', description: 'Recent procurement activity' },
          },
        },
        stakeholders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              title: { type: 'string' },
              department: { type: 'string' },
              linkedinUrl: { type: 'string' },
              stance: { type: 'string', enum: ['supporter', 'opponent', 'neutral', 'unknown'] },
              notes: { type: 'string' },
            },
          },
        },
        organizationProfile: {
          type: 'object',
          properties: {
            size: { type: 'string', description: 'Employee count or budget size' },
            annualBudget: { type: 'string', description: 'IT/tech budget if known' },
            recentNews: { type: 'array', items: { type: 'string' }, description: 'Recent relevant news' },
            techStack: { type: 'array', items: { type: 'string' }, description: 'Known technologies used' },
          },
        },
        macroSignals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['budget', 'leadership', 'election', 'audit', 'rfp', 'expansion', 'modernization', 'compliance', 'other'] },
              description: { type: 'string' },
              timing: { type: 'string', description: 'When this is relevant (e.g., "Q2 2025")' },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
          },
        },
        painPoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pain: { type: 'string' },
              evidence: { type: 'string' },
              ourSolution: { type: 'string' },
            },
          },
        },
        recommendedAngles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short angle name' },
              message: { type: 'string', description: '2-3 sentence sales pitch' },
              whyNow: { type: 'string', description: 'Why this angle is timely' },
              talkTrack: { type: 'array', items: { type: 'string' }, description: '3-4 key talking points' },
            },
          },
        },
        anglesForList: { 
          type: 'array', 
          items: { type: 'string' },
          description: '2-3 short labels for UI chips like "Renewal window", "Budget approved"'
        },
        score: { 
          type: 'number', 
          description: 'Overall prospect score 0-100 based on likelihood to convert' 
        },
        scoreBreakdown: {
          type: 'object',
          properties: {
            competitorMatch: { type: 'number', description: 'Score 0-100 for competitor presence' },
            timingSignals: { type: 'number', description: 'Score 0-100 for timing opportunity' },
            budgetReadiness: { type: 'number', description: 'Score 0-100 for budget availability' },
            accessToDecisionMakers: { type: 'number', description: 'Score 0-100 for stakeholder access' },
          },
        },
      },
      required: ['summary', 'score', 'anglesForList', 'recommendedAngles'],
    },
  },
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

    // Support both authenticated and anonymous sessions
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const {
      sessionId,
      prospect,
      jobId,
      forceRefresh = false,
    } = await req.json();

    const prospectKey = `${prospect.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${prospect.state?.toLowerCase() || 'unknown'}`;
    
    console.log('Researching prospect dossier with Perplexity:', prospectKey);

    // Verify session exists and is accessible
    const { data: session, error: sessionError } = await supabase
      .from('discovery_sessions')
      .select('id, user_id, criteria')
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

    // Use Perplexity for grounded web research
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY not configured, falling back to Lovable AI');
      // Fall back to Lovable AI if Perplexity not configured
      return await fallbackToLovableAI(supabase, sessionId, prospectKey, prospect, session.criteria, jobId);
    }

    const criteria = session.criteria as any;
    const competitors = criteria?.competitors || [];
    const productDescription = criteria?.productDescription || 'enterprise software solutions';

    // Craft a detailed research prompt for Perplexity
    const researchPrompt = `Research this organization thoroughly for B2B sales intelligence:

ORGANIZATION: ${prospect.name}
LOCATION: ${prospect.state}, USA
${prospect.website ? `WEBSITE: ${prospect.website}` : ''}
${prospect.address ? `ADDRESS: ${prospect.address}` : ''}

SALES CONTEXT: 
- We sell: ${productDescription}
- Our competitors: ${competitors.join(', ') || 'various incumbent vendors'}
- Goal: Identify "rip and replace" opportunities where they might switch from a competitor to us

RESEARCH TASKS:
1. Find who their CURRENT VENDOR is for ${productDescription} or similar solutions. Look for:
   - Public contracts, procurement records, RFPs
   - Press releases, case studies mentioning vendors
   - Job postings that reveal tech stack
   - News about technology implementations

2. Find CONTRACT and PROCUREMENT information:
   - Government contract databases (GovSpend, USAspending, SAM.gov)
   - Recent RFPs or procurement announcements
   - Contract expiration dates or renewal cycles
   - Budget allocations for technology

3. Identify KEY STAKEHOLDERS:
   - IT Director, CTO, Chief Information Officer
   - Procurement officers
   - Department heads who would use this technology
   - Include their titles and LinkedIn profiles if available

4. Find TIMING SIGNALS:
   - Leadership changes
   - Budget approvals
   - Audit findings or compliance requirements
   - Modernization initiatives
   - Election cycles (for government)
   - Strategic plan announcements

5. Identify PAIN POINTS:
   - Public complaints or issues with current systems
   - Audit reports showing technology problems
   - News about security incidents, outages, or failures
   - Budget constraints affecting technology

6. Assess overall OPPORTUNITY:
   - Score 0-100 based on likelihood to switch
   - Recommend 3 specific sales angles based on your findings

Be specific with evidence. Include actual vendor names, contract values, and dates when you find them.`;

    console.log('Calling Perplexity API with sonar-pro model...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Multi-step reasoning with real citations
        messages: [
          { 
            role: 'system', 
            content: `You are a B2B sales intelligence analyst specializing in government and enterprise procurement. 
Research thoroughly using real data sources. Be specific with vendor names, contract details, and dates.
Return your findings as a structured JSON object with these fields:
- summary: 3-4 sentence executive summary
- incumbent: { vendor, product, confidence, contractDetails }
- contract: { estimatedAnnualValue, estimatedExpiration, procurementHistory }
- stakeholders: [{ name, title, department, linkedinUrl, stance, notes }]
- organizationProfile: { size, annualBudget, recentNews[], techStack[] }
- macroSignals: [{ type, description, timing, impact }]
- painPoints: [{ pain, evidence, ourSolution }]
- recommendedAngles: [{ title, message, whyNow, talkTrack[] }]
- anglesForList: ["short label 1", "short label 2"]
- score: 0-100
- scoreBreakdown: { competitorMatch, timingSignals, budgetReadiness, accessToDecisionMakers }`
          },
          { role: 'user', content: researchPrompt }
        ],
        search_domain_filter: [
          'govspend.com',
          'usaspending.gov', 
          'sam.gov',
          'opengov.com',
          'linkedin.com',
          '-reddit.com', // Exclude unreliable sources
          '-twitter.com',
        ],
        return_citations: true,
        search_recency_filter: 'year', // Focus on recent data
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      
      // Update job and dossier status to failed
      if (jobId) {
        await supabase
          .from('research_jobs')
          .update({ 
            status: 'failed', 
            error: `Perplexity error: ${response.status}`,
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
      
      throw new Error('Research service error');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    const citations = data.citations || [];
    
    console.log(`Perplexity returned ${citations.length} citations`);

    let dossier;
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        dossier = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire content as JSON
        dossier = JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to parse dossier JSON:', e);
      console.log('Raw content:', content.substring(0, 500));
      
      // Create a structured dossier from the text response
      dossier = {
        summary: content.substring(0, 500) || 'Research completed with limited findings.',
        incumbent: { vendor: 'Unknown', confidence: 0.3 },
        contract: {},
        stakeholders: [],
        organizationProfile: {},
        macroSignals: [],
        painPoints: [],
        recommendedAngles: [{
          title: 'Initial Outreach',
          message: 'Based on our research, this organization shows potential for our solution. Further discovery call recommended.',
          whyNow: 'Needs additional research to identify specific timing.',
          talkTrack: ['Introduction call to understand current technology landscape'],
        }],
        anglesForList: ['Needs discovery'],
        score: 50,
        scoreBreakdown: {
          competitorMatch: 50,
          timingSignals: 50,
          budgetReadiness: 50,
          accessToDecisionMakers: 50,
        },
      };
    }

    // Enrich with metadata and citations
    dossier.lastUpdated = new Date().toISOString();
    dossier.researchMethod = 'perplexity-sonar-pro';
    
    // Transform Perplexity citations to our format
    dossier.sources = citations.map((url: string, idx: number) => ({
      url,
      title: `Source ${idx + 1}`,
      excerpt: 'Retrieved via Perplexity AI research',
    }));

    // Ensure required fields exist
    if (!dossier.anglesForList || dossier.anglesForList.length === 0) {
      dossier.anglesForList = ['Research complete'];
    }
    if (!dossier.score) {
      dossier.score = 60;
    }

    // Save dossier
    await supabase
      .from('prospect_dossiers')
      .update({
        dossier,
        sources: dossier.sources,
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
    console.log(`Dossier researched with Perplexity in ${latency}ms, ${citations.length} citations`);

    return new Response(
      JSON.stringify({ dossier, cached: false, latency, citationCount: citations.length }),
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

// Fallback to Lovable AI if Perplexity not configured
async function fallbackToLovableAI(
  supabase: any, 
  sessionId: string, 
  prospectKey: string, 
  prospect: any, 
  criteria: any,
  jobId?: string
) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('No AI service configured');
  }

  const competitors = criteria?.competitors || [];
  const productDescription = criteria?.productDescription || 'enterprise software';

  const prompt = `You are a B2B sales intelligence researcher. Research this organization:

ORGANIZATION: ${prospect.name}
LOCATION: ${prospect.state}
${prospect.website ? `WEBSITE: ${prospect.website}` : ''}

CONTEXT: We sell ${productDescription} and compete against ${competitors.join(', ') || 'incumbent vendors'}.

Provide a dossier with:
- summary: 2-3 sentence overview
- incumbent: { vendor, confidence }
- stakeholders: [{ name, title, stance }]
- macroSignals: [{ type, description }]
- recommendedAngles: [{ title, message, whyNow }]
- anglesForList: ["tag1", "tag2"]
- score: 0-100

Return only valid JSON.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro', // Use pro model for better reasoning
      messages: [
        { role: 'system', content: 'You are a B2B sales intelligence researcher. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('AI service error');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '{}';
  
  let dossier;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      dossier = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    dossier = {
      summary: 'Research completed with limited findings.',
      incumbent: { vendor: 'Unknown', confidence: 0.3 },
      recommendedAngles: [],
      anglesForList: ['Needs research'],
      score: 50,
    };
  }

  dossier.lastUpdated = new Date().toISOString();
  dossier.researchMethod = 'lovable-ai-fallback';
  dossier.sources = [];

  await supabase
    .from('prospect_dossiers')
    .update({
      dossier,
      sources: [],
      status: 'ready',
      last_updated: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('prospect_key', prospectKey);

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

  return new Response(
    JSON.stringify({ dossier, cached: false, fallback: true }),
    { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
  );
}
