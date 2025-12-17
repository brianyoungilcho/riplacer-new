import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STATE_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Alabama': { lat: 32.3182, lng: -86.9023 },
  'Alaska': { lat: 64.2008, lng: -152.4937 },
  'Arizona': { lat: 34.0489, lng: -111.0937 },
  'Arkansas': { lat: 35.2010, lng: -91.8318 },
  'California': { lat: 36.7783, lng: -119.4179 },
  'Colorado': { lat: 39.5501, lng: -105.7821 },
  'Connecticut': { lat: 41.6032, lng: -72.7554 },
  'Delaware': { lat: 38.9108, lng: -75.5277 },
  'Florida': { lat: 27.6648, lng: -81.5158 },
  'Georgia': { lat: 32.1656, lng: -82.9001 },
  'Hawaii': { lat: 19.8968, lng: -155.5828 },
  'Idaho': { lat: 44.0682, lng: -114.7420 },
  'Illinois': { lat: 40.6331, lng: -89.3985 },
  'Indiana': { lat: 40.2672, lng: -86.1349 },
  'Iowa': { lat: 41.8780, lng: -93.0977 },
  'Kansas': { lat: 39.0119, lng: -98.4842 },
  'Kentucky': { lat: 37.8393, lng: -84.2700 },
  'Louisiana': { lat: 30.9843, lng: -91.9623 },
  'Maine': { lat: 45.2538, lng: -69.4455 },
  'Maryland': { lat: 39.0458, lng: -76.6413 },
  'Massachusetts': { lat: 42.4072, lng: -71.3824 },
  'Michigan': { lat: 44.3148, lng: -85.6024 },
  'Minnesota': { lat: 46.7296, lng: -94.6859 },
  'Mississippi': { lat: 32.3547, lng: -89.3985 },
  'Missouri': { lat: 37.9643, lng: -91.8318 },
  'Montana': { lat: 46.8797, lng: -110.3626 },
  'Nebraska': { lat: 41.4925, lng: -99.9018 },
  'Nevada': { lat: 38.8026, lng: -116.4194 },
  'New Hampshire': { lat: 43.1939, lng: -71.5724 },
  'New Jersey': { lat: 40.0583, lng: -74.4057 },
  'New Mexico': { lat: 34.5199, lng: -105.8701 },
  'New York': { lat: 43.2994, lng: -75.4999 },
  'North Carolina': { lat: 35.7596, lng: -79.0193 },
  'North Dakota': { lat: 47.5515, lng: -101.0020 },
  'Ohio': { lat: 40.4173, lng: -82.9071 },
  'Oklahoma': { lat: 35.4676, lng: -97.5164 },
  'Oregon': { lat: 43.8041, lng: -120.5542 },
  'Pennsylvania': { lat: 41.2033, lng: -77.1945 },
  'Rhode Island': { lat: 41.5801, lng: -71.4774 },
  'South Carolina': { lat: 33.8361, lng: -81.1637 },
  'South Dakota': { lat: 43.9695, lng: -99.9018 },
  'Tennessee': { lat: 35.5175, lng: -86.5804 },
  'Texas': { lat: 31.9686, lng: -99.9018 },
  'Utah': { lat: 39.3210, lng: -111.0937 },
  'Vermont': { lat: 44.5588, lng: -72.5778 },
  'Virginia': { lat: 37.4316, lng: -78.6569 },
  'Washington': { lat: 47.7511, lng: -120.7401 },
  'West Virginia': { lat: 38.5976, lng: -80.4549 },
  'Wisconsin': { lat: 43.7844, lng: -88.7879 },
  'Wyoming': { lat: 43.0760, lng: -107.2903 },
};

function createProspectKey(name: string, state: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${state.toLowerCase()}`;
}

function randomOffset(scale: number = 0.5): number {
  return (Math.random() - 0.5) * scale;
}

// Geocode prospect using Mapbox API with retry
async function geocodeProspect(
  name: string,
  city: string | undefined,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  
  if (!MAPBOX_TOKEN) {
    return null;
  }

  const queries = [];
  if (city) {
    queries.push(`${name}, ${city}, ${state}, USA`);
    queries.push(`${city}, ${state}, USA`);
  } else {
    queries.push(`${name}, ${state}, USA`);
  }

  for (const query of queries) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`;
      
      const response = await fetch(url);
      
      if (!response.ok) continue;

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        console.log(`Geocoded "${query}" -> lat: ${lat}, lng: ${lng}`);
        return { lat, lng };
      }
    } catch (e) {
      console.error(`Geocoding error for "${query}":`, e);
    }
  }

  return null;
}

// OPTIMIZATION: Batch geocode with concurrency limit
async function batchGeocode(
  prospects: Array<{ name: string; city?: string; state: string }>,
  concurrency: number = 3
): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();
  
  // Process in batches to respect rate limits
  for (let i = 0; i < prospects.length; i += concurrency) {
    const batch = prospects.slice(i, i + concurrency);
    const promises = batch.map(async (p) => {
      const key = createProspectKey(p.name, p.state);
      const stateCenter = STATE_CENTERS[p.state] || { lat: 39.8283, lng: -98.5795 };
      
      const geocoded = await geocodeProspect(p.name, p.city, p.state);
      
      if (geocoded) {
        results.set(key, geocoded);
      } else {
        // Fallback to state center with offset
        results.set(key, {
          lat: stateCenter.lat + randomOffset(p.city ? 0.3 : 1.0),
          lng: stateCenter.lng + randomOffset(p.city ? 0.3 : 1.5),
        });
      }
    });
    
    await Promise.all(promises);
  }
  
  return results;
}

// Robust JSON extraction with multiple fallback strategies
function extractProspectsFromResponse(content: string): any[] {
  // Strategy 1: Direct JSON array extraction
  try {
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
  } catch (e) {
    console.log('Strategy 1 (array match) failed:', e);
  }

  // Strategy 2: Look for code block with JSON
  try {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const jsonContent = codeBlockMatch[1].trim();
      const parsed = JSON.parse(jsonContent);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.log('Strategy 2 (code block) failed:', e);
  }

  // Strategy 3: Try to fix common JSON issues and parse
  try {
    let fixed = content;
    // Remove trailing commas before ] or }
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    // Try to extract array again
    const arrayMatch = fixed.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
  } catch (e) {
    console.log('Strategy 3 (fix trailing commas) failed:', e);
  }

  // Strategy 4: Parse individual objects line by line
  try {
    const objects: any[] = [];
    const lines = content.split('\n');
    let currentObj = '';
    let braceCount = 0;
    
    for (const line of lines) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount > 0 || char === '{' || char === '}') {
          currentObj += char;
        }
        if (braceCount === 0 && currentObj.length > 0) {
          try {
            const obj = JSON.parse(currentObj);
            if (obj.name && obj.state) {
              objects.push(obj);
            }
          } catch {}
          currentObj = '';
        }
      }
      if (braceCount > 0) currentObj += ' ';
    }
    
    if (objects.length > 0) {
      console.log(`Strategy 4 extracted ${objects.length} objects`);
      return objects;
    }
  } catch (e) {
    console.log('Strategy 4 (line by line) failed:', e);
  }

  console.error('All JSON extraction strategies failed');
  return [];
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
      territory,
      targetCategories,
      competitors,
      limit = 8,
    } = await req.json();

    console.log('Discover prospects v2 for session:', sessionId, 'user:', userId || 'anonymous');

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

    // Check for existing prospects in this session
    const { data: existingDossiers } = await supabase
      .from('prospect_dossiers')
      .select('prospect_key, prospect_name, prospect_state, prospect_lat, prospect_lng, status, dossier')
      .eq('session_id', sessionId);

    if (existingDossiers && existingDossiers.length > 0) {
      console.log('Returning existing prospects for session');
      const prospects = existingDossiers.map(d => ({
        prospectId: d.prospect_key,
        name: d.prospect_name,
        state: d.prospect_state,
        lat: d.prospect_lat,
        lng: d.prospect_lng,
        initialScore: d.dossier?.score,
        angles: d.dossier?.anglesForList,
        researchStatus: d.status,
      }));
      
      return new Response(
        JSON.stringify({ prospects, jobs: [], cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI with tool calling for structured output
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const states = territory?.states || [];
    
    const prompt = `Find ${limit} high-value "rip and replace" sales opportunities.

TERRITORY: ${states.join(", ")}
TARGET CATEGORIES: ${targetCategories?.join(", ") || "government agencies"}
COMPETITORS TO DISPLACE: ${competitors?.join(", ") || "incumbent vendors"}
PRODUCT: ${productDescription || "enterprise software"}

For each prospect, identify:
- Real organization name
- City (required for geocoding)
- State (must be from territory)
- Score 60-100 based on opportunity quality
- 1-2 short angle tags like "Renewal window" or "Budget approved"
- Brief reasoning why they're a good target`;

    // Use tool calling for guaranteed structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a B2B sales intelligence expert. Find real organizations that match the criteria.' },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_prospects',
            description: 'Submit the list of discovered prospects',
            parameters: {
              type: 'object',
              properties: {
                prospects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Full organization name' },
                      city: { type: 'string', description: 'City name' },
                      state: { type: 'string', description: 'State name' },
                      score: { type: 'number', description: 'Opportunity score 60-100' },
                      angles: { type: 'array', items: { type: 'string' }, description: '1-2 short angle tags' },
                      reasoning: { type: 'string', description: 'Why this is a good target' }
                    },
                    required: ['name', 'city', 'state', 'score', 'angles', 'reasoning']
                  }
                }
              },
              required: ['prospects']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'submit_prospects' } }
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
    
    let aiProspects: any[] = [];
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        aiProspects = args.prospects || [];
        console.log(`Extracted ${aiProspects.length} prospects from tool call`);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }
    
    // Fallback to content parsing if tool call didn't work
    if (aiProspects.length === 0) {
      const content = data.choices?.[0]?.message?.content || '';
      console.log('Falling back to content parsing, raw length:', content.length);
      aiProspects = extractProspectsFromResponse(content);
    }

    // Filter to only valid states
    aiProspects = aiProspects.filter(p => states.includes(p.state)).slice(0, limit);
    
    console.log(`After filtering: ${aiProspects.length} prospects in territory`);

    if (aiProspects.length === 0) {
      console.error('No prospects generated after filtering');
      // Update session status but don't create empty records
      await supabase
        .from('discovery_sessions')
        .update({ status: 'prospects_discovered' })
        .eq('id', sessionId);
        
      return new Response(
        JSON.stringify({ prospects: [], jobs: [], message: 'No prospects found matching criteria. Try adjusting your territory or categories.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OPTIMIZATION #1: Batch geocode all prospects in parallel (with concurrency limit)
    const geocodeResults = await batchGeocode(
      aiProspects.map(p => ({ name: p.name, city: p.city, state: p.state })),
      3 // Process 3 at a time to respect Mapbox rate limits
    );

    // OPTIMIZATION #2: Prepare all dossiers and jobs for batch insert
    const dossierRecords = aiProspects.map(p => {
      const prospectKey = createProspectKey(p.name, p.state);
      const coords = geocodeResults.get(prospectKey) || { 
        lat: STATE_CENTERS[p.state]?.lat || 39.8283, 
        lng: STATE_CENTERS[p.state]?.lng || -98.5795 
      };
      
      return {
        session_id: sessionId,
        prospect_key: prospectKey,
        prospect_name: p.name,
        prospect_state: p.state,
        prospect_lat: coords.lat,
        prospect_lng: coords.lng,
        dossier: {
          score: p.score || 75,
          anglesForList: p.angles || ['Potential opportunity'],
          summary: p.reasoning || 'Pending deep research',
        },
        status: 'queued',
      };
    });

    const jobRecords = aiProspects.map(p => ({
      user_id: userId,
      session_id: sessionId,
      job_type: 'dossier',
      prospect_key: createProspectKey(p.name, p.state),
      status: 'queued',
    }));

    // OPTIMIZATION #3: Batch insert dossiers
    const { error: dossiersError } = await supabase
      .from('prospect_dossiers')
      .upsert(dossierRecords, { onConflict: 'session_id,prospect_key' });

    if (dossiersError) {
      console.error('Failed to batch insert dossiers:', dossiersError);
      throw new Error('Failed to create prospect records');
    }

    // OPTIMIZATION #4: Batch insert jobs
    const { data: insertedJobs, error: jobsError } = await supabase
      .from('research_jobs')
      .insert(jobRecords)
      .select('id, prospect_key');

    if (jobsError) {
      console.error('Failed to batch insert jobs:', jobsError);
    }

    // Update session status
    await supabase
      .from('discovery_sessions')
      .update({ status: 'prospects_discovered' })
      .eq('id', sessionId);

    // Build response
    const prospects = dossierRecords.map(d => ({
      prospectId: d.prospect_key,
      name: d.prospect_name,
      state: d.prospect_state,
      lat: d.prospect_lat,
      lng: d.prospect_lng,
      initialScore: d.dossier.score,
      angles: d.dossier.anglesForList,
      researchStatus: 'queued',
    }));

    const jobs = (insertedJobs || []).map(j => ({
      jobId: j.id,
      prospectId: j.prospect_key,
      status: 'queued',
    }));

    const latency = Date.now() - startTime;
    console.log(`Discovered ${prospects.length} prospects in ${latency}ms (batch optimized)`);

    return new Response(
      JSON.stringify({ prospects, jobs, latency }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in discover-prospects-v2:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
