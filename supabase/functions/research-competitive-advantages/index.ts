import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Robust JSON extraction with multiple fallback strategies
function extractBriefFromResponse(content: string): any {
  // Strategy 1: Direct JSON object extraction
  try {
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
  } catch (e) {
    console.log('Strategy 1 (object match) failed:', e);
  }

  // Strategy 2: Look for code block with JSON
  try {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const jsonContent = codeBlockMatch[1].trim();
      return JSON.parse(jsonContent);
    }
  } catch (e) {
    console.log('Strategy 2 (code block) failed:', e);
  }

  // Strategy 3: Try to fix common JSON issues
  try {
    let fixed = content;
    // Remove trailing commas before ] or }
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    const objMatch = fixed.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
  } catch (e) {
    console.log('Strategy 3 (fix trailing commas) failed:', e);
  }

  console.error('All JSON extraction strategies failed');
  return null;
}

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

    if (existingBrief?.status === 'ready' && existingBrief.brief?.positioningSummary) {
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

    // Use Gemini with tool calling for structured output
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Analyze competitive positioning for this B2B sales situation:

PRODUCT/SERVICE: ${productDescription}
${companyDomain ? `COMPANY: ${companyDomain}` : ''}
TARGET BUYERS: ${targetCategories?.join(', ') || 'government and enterprise'}
COMPETITORS: ${competitors?.join(', ') || 'various incumbents'}

Create a Strategic Advantage Brief with:
1. A 2-3 sentence positioning summary
2. 3-5 key competitive advantages with:
   - Why it matters to the buyer
   - How we compare to each competitor
   - Key talking points for sales reps
   - Common objections and responses`;

    // Use tool calling for guaranteed structured output
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a competitive intelligence expert. Provide actionable sales positioning.' },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_advantage_brief',
            description: 'Submit the competitive advantage brief',
            parameters: {
              type: 'object',
              properties: {
                positioningSummary: { 
                  type: 'string', 
                  description: '2-3 sentence overall competitive positioning' 
                },
                advantages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'Short advantage name' },
                      whyItMattersToBuyer: { type: 'string', description: 'Why this matters to the target buyer' },
                      competitorComparisons: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            competitor: { type: 'string' },
                            claim: { type: 'string', description: 'Specific comparison claim' },
                            confidence: { type: 'number', description: '0.0-1.0' }
                          },
                          required: ['competitor', 'claim', 'confidence']
                        }
                      },
                      talkTrackBullets: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: '3-4 key talking points'
                      },
                      objectionsAndResponses: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            objection: { type: 'string' },
                            response: { type: 'string' }
                          },
                          required: ['objection', 'response']
                        }
                      }
                    },
                    required: ['title', 'whyItMattersToBuyer', 'competitorComparisons', 'talkTrackBullets']
                  }
                }
              },
              required: ['positioningSummary', 'advantages']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'submit_advantage_brief' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      // Update brief to failed
      await supabase
        .from('advantage_briefs')
        .update({ status: 'failed' })
        .eq('session_id', sessionId);
      
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
    
    let brief: any = null;
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        brief = JSON.parse(toolCall.function.arguments);
        console.log(`Extracted brief with ${brief.advantages?.length || 0} advantages from tool call`);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }
    
    // Fallback to content parsing if tool call didn't work
    if (!brief || !brief.positioningSummary) {
      const content = data.choices?.[0]?.message?.content || '';
      console.log('Falling back to content parsing, raw length:', content.length);
      brief = extractBriefFromResponse(content);
    }
    
    // Final fallback - create minimal valid brief
    if (!brief || !brief.positioningSummary) {
      console.error('Failed to extract brief, using fallback');
      brief = {
        positioningSummary: `Competitive positioning for ${productDescription || 'your solution'} against ${competitors?.join(', ') || 'incumbent vendors'}.`,
        advantages: [{
          title: 'Needs Further Research',
          whyItMattersToBuyer: 'Additional competitive analysis recommended.',
          competitorComparisons: (competitors || []).map((c: string) => ({
            competitor: c,
            claim: 'Comparison pending further research',
            confidence: 0.5
          })),
          talkTrackBullets: ['Schedule discovery call to understand current pain points'],
          objectionsAndResponses: []
        }]
      };
    }

    // Add metadata
    brief.lastUpdated = new Date().toISOString();

    // Save brief
    const { error: saveError } = await supabase
      .from('advantage_briefs')
      .upsert({
        session_id: sessionId,
        brief,
        sources: brief.advantages?.flatMap((a: any) => 
          a.competitorComparisons?.flatMap((c: any) => c.citations || []) || []
        ) || [],
        status: 'ready',
      }, { onConflict: 'session_id' });
    
    if (saveError) {
      console.error('Failed to save brief:', saveError);
    }

    const latency = Date.now() - startTime;
    console.log(`Advantage brief generated in ${latency}ms with ${brief.advantages?.length || 0} advantages`);

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
