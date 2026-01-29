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
      console.error('PERPLEXITY_API_KEY not configured, falling back to Gemini');
      // Fall back to Gemini if Perplexity not configured
      return await fallbackToGemini(supabase, sessionId, prospectKey, prospect, session.criteria, jobId);
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
    
    // Build a strong JSON-enforcing system prompt
    const systemPrompt = `You are a B2B sales intelligence analyst. Your task is to research organizations and return ONLY a valid JSON object - no markdown, no explanation, no code fences.

CRITICAL: Your entire response must be a single valid JSON object starting with { and ending with }. Do not include any text before or after the JSON.

Research the organization thoroughly and populate this exact JSON structure:
{
  "summary": "3-4 sentence executive summary explaining why this is a strong sales prospect",
  "incumbent": {
    "vendor": "Current vendor name (or 'Unknown' if not found)",
    "product": "Specific product/solution they use",
    "confidence": 0.7,
    "contractDetails": "Any known contract details, values, or dates"
  },
  "contract": {
    "estimatedAnnualValue": "$X/year estimate based on org size",
    "estimatedExpiration": "Date or timeframe if known",
    "procurementHistory": "Recent procurement activity or RFPs"
  },
  "stakeholders": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "department": "Department",
      "linkedinUrl": "URL if found",
      "stance": "unknown",
      "notes": "Relevant background"
    }
  ],
  "organizationProfile": {
    "size": "Employee count or sworn officers",
    "annualBudget": "IT/tech budget if available",
    "recentNews": ["Recent news item 1", "Recent news item 2"],
    "techStack": ["Known tech vendor 1", "Known tech vendor 2"]
  },
  "macroSignals": [
    {
      "type": "budget|leadership|election|audit|rfp|expansion|modernization|compliance|other",
      "description": "What is happening",
      "timing": "When (e.g., Q2 2025)",
      "impact": "high|medium|low"
    }
  ],
  "painPoints": [
    {
      "pain": "Specific pain point",
      "evidence": "How you know this",
      "ourSolution": "How we address it"
    }
  ],
  "recommendedAngles": [
    {
      "title": "Short angle name",
      "message": "2-3 sentence sales pitch",
      "whyNow": "Why this angle is timely",
      "talkTrack": ["Talking point 1", "Talking point 2", "Talking point 3"]
    }
  ],
  "anglesForList": ["Tag 1", "Tag 2"],
  "score": 75,
  "scoreBreakdown": {
    "competitorMatch": 70,
    "timingSignals": 80,
    "budgetReadiness": 65,
    "accessToDecisionMakers": 60
  }
}

Fill in ALL fields with real research data. Use actual vendor names, real people, real numbers when available.
For fields you cannot find data for, use reasonable estimates based on organization type and size.
RESPOND ONLY WITH THE JSON OBJECT.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: researchPrompt }
        ],
        search_domain_filter: ['-reddit.com', '-twitter.com', '-pinterest.com', '-quora.com'],
        search_recency_filter: 'year',
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
    console.log('Raw content length:', content.length);
    console.log('Content preview:', content.substring(0, 300));

    let dossier;
    let parseAttempt = '';
    
    try {
      // Attempt 1: Try parsing the entire content directly (ideal case)
      parseAttempt = 'direct';
      dossier = JSON.parse(content);
      console.log('Successfully parsed JSON directly');
    } catch (e1) {
      try {
        // Attempt 2: Extract JSON from markdown code blocks
        parseAttempt = 'code-block';
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          dossier = JSON.parse(codeBlockMatch[1].trim());
          console.log('Successfully parsed JSON from code block');
        } else {
          throw new Error('No code block found');
        }
      } catch (e2) {
        try {
          // Attempt 3: Extract JSON object with regex (greedy match)
          parseAttempt = 'regex';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            dossier = JSON.parse(jsonMatch[0]);
            console.log('Successfully parsed JSON via regex extraction');
          } else {
            throw new Error('No JSON object found in content');
          }
        } catch (e3) {
          // All parsing failed - create a detailed fallback
          console.error('All JSON parsing attempts failed');
          console.error('Parse attempt:', parseAttempt);
          console.error('Raw content (first 1000 chars):', content.substring(0, 1000));
          
          // Extract any useful information from the text response
          const textSummary = content
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/\*\*/g, '')            // Remove bold markers
            .replace(/\n+/g, ' ')            // Normalize newlines
            .trim()
            .substring(0, 500);
          
          dossier = {
            summary: textSummary || `Research completed for ${prospect.name}. Manual review recommended.`,
            incumbent: { vendor: 'Unknown', confidence: 0.3, contractDetails: 'Unable to determine from available sources' },
            contract: { estimatedAnnualValue: 'Unknown', estimatedExpiration: 'Unknown' },
            stakeholders: [],
            organizationProfile: { size: 'Unknown', recentNews: [], techStack: [] },
            macroSignals: [],
            painPoints: [],
            recommendedAngles: [{
              title: 'Discovery Call',
              message: `Schedule a discovery call with ${prospect.name} to understand their current technology landscape and pain points.`,
              whyNow: 'Establish relationship and gather intelligence for targeted pitch.',
              talkTrack: [
                'Introduce your solution and value proposition',
                'Ask about current vendors and satisfaction levels',
                'Identify budget cycles and decision-making process',
                'Determine key stakeholders and timeline'
              ],
            }],
            anglesForList: ['Research needed', 'Discovery call'],
            score: 55,
            scoreBreakdown: {
              competitorMatch: 50,
              timingSignals: 50,
              budgetReadiness: 60,
              accessToDecisionMakers: 50,
            },
            _parseError: true,
            _rawContentPreview: content.substring(0, 200),
          };
        }
      }
    }

    // Enrich with metadata and citations
    dossier.lastUpdated = new Date().toISOString();
    dossier.researchMethod = 'perplexity-sonar-pro';
    
    // Transform Perplexity citations to our format
    // Perplexity returns citations as URLs or objects with metadata
    dossier.sources = citations.map((citation: string | { url?: string; title?: string; publishedDate?: string; snippet?: string }, idx: number) => {
      // Handle both string URLs and object citations
      if (typeof citation === 'string') {
        let hostname = 'Source';
        try { hostname = new URL(citation).hostname.replace('www.', ''); } catch {}
        return {
          url: citation,
          title: hostname,
          excerpt: 'Retrieved via Perplexity AI research',
        };
      }
      // Object format with potential metadata
      return {
        url: citation.url || '',
        title: citation.title || `Source ${idx + 1}`,
        excerpt: citation.snippet || 'Retrieved via Perplexity AI research',
        publishedDate: citation.publishedDate || null,
      };
    });

    // Ensure required fields exist
    if (!dossier.anglesForList || dossier.anglesForList.length === 0) {
      dossier.anglesForList = ['Research complete'];
    }
    if (!dossier.score) {
      dossier.score = 60;
    }

    // Save dossier
    console.log(`Saving dossier with ${dossier.sources?.length || 0} sources to DB`);
    
    const { error: saveError } = await supabase
      .from('prospect_dossiers')
      .update({
        dossier,
        sources: dossier.sources,
        status: 'ready',
        last_updated: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('prospect_key', prospectKey);
    
    if (saveError) {
      console.error('Error saving dossier:', saveError);
    }

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

// Fallback to Gemini if Perplexity not configured
async function fallbackToGemini(
  supabase: any, 
  sessionId: string, 
  prospectKey: string, 
  prospect: any, 
  criteria: any,
  jobId?: string
) {
  const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  
  if (!GOOGLE_GEMINI_API_KEY) {
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

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GOOGLE_GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-pro',
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
  dossier.researchMethod = 'gemini-fallback';
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
