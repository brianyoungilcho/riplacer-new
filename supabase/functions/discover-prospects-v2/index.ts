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

// Geocode prospect location using Mapbox Geocoding API
async function geocodeProspect(name: string, city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
  if (!mapboxToken) {
    console.warn('MAPBOX_ACCESS_TOKEN not configured, using fallback coordinates');
    return null;
  }

  try {
    // Try geocoding with organization name + city + state for best accuracy
    const query = `${name}, ${city}, ${state}, USA`;
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1&types=poi,address,place`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log(`Geocoded ${name} in ${city}, ${state}: ${lat}, ${lng}`);
      return { lat, lng };
    }

    // Fallback: Try just city + state if organization name doesn't work
    const cityQuery = `${city}, ${state}, USA`;
    const cityGeocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityQuery)}.json?access_token=${mapboxToken}&limit=1`;
    
    const cityResponse = await fetch(cityGeocodeUrl);
    const cityData = await cityResponse.json();

    if (cityData.features && cityData.features.length > 0) {
      const [lng, lat] = cityData.features[0].center;
      console.log(`Geocoded ${city}, ${state} (fallback): ${lat}, ${lng}`);
      return { lat, lng };
    }

    console.warn(`Failed to geocode ${name} in ${city}, ${state}, using state center`);
    return null;
  } catch (error) {
    console.error(`Geocoding error for ${name} in ${city}, ${state}:`, error);
    return null;
  }
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

    // Use Lovable AI to find high-quality prospects
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const states = territory?.states || [];
    
    const prompt = `You are a B2B sales intelligence researcher finding high-value "rip and replace" opportunities.

Find ${limit} government/enterprise accounts that:
1. Are located ONLY in these states: ${states.join(", ")}
2. Fall into these categories: ${targetCategories?.join(", ") || "government agencies"}
3. Currently use or likely use: ${competitors?.join(", ") || "incumbent vendors"}
4. Would be excellent prospects for: ${productDescription || "enterprise software"}

For each prospect, provide:
- name: Full organization name (e.g., "Boston Police Department")
- city: City name (REQUIRED - must be included for accurate geolocation)
- state: State name (MUST be from the specified states)
- score: Initial confidence score 60-100
- angles: Array of 1-2 short "how to win" tags like ["Renewal window", "Replacement play", "Budget approved", "New leadership"]
- reasoning: Brief explanation of why they're a good target

Focus on REAL organizations with realistic scenarios. No fictional entities.
Return ONLY a valid JSON array. No explanation text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a B2B market research expert. Return only valid JSON arrays.' },
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
    const content = data.choices[0]?.message?.content || '[]';
    
    let aiProspects: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiProspects = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI prospects:', e);
    }

    // Filter to only valid states
    aiProspects = aiProspects.filter(p => states.includes(p.state));

    // Create prospect dossiers and jobs
    const prospects: any[] = [];
    const jobs: any[] = [];

    for (const p of aiProspects.slice(0, limit)) {
      const prospectKey = createProspectKey(p.name, p.state);
      const stateCenter = STATE_CENTERS[p.state] || { lat: 39.8283, lng: -98.5795 };
      
      // Geocode prospect location for accurate positioning
      let coordinates = { lat: stateCenter.lat, lng: stateCenter.lng };
      if (p.city && p.name) {
        const geocoded = await geocodeProspect(p.name, p.city, p.state);
        if (geocoded) {
          coordinates = geocoded;
        } else {
          // Fallback to state center with small random offset if geocoding fails
          coordinates = {
            lat: stateCenter.lat + randomOffset(0.3),
            lng: stateCenter.lng + randomOffset(0.3),
          };
        }
      } else {
        // If no city provided, use state center with random offset
        coordinates = {
          lat: stateCenter.lat + randomOffset(1.0),
          lng: stateCenter.lng + randomOffset(1.5),
        };
      }
      
      // Create dossier record (queued for research)
      const { error: dossierError } = await supabase
        .from('prospect_dossiers')
        .upsert({
          session_id: sessionId,
          prospect_key: prospectKey,
          prospect_name: p.name,
          prospect_state: p.state,
          prospect_lat: coordinates.lat,
          prospect_lng: coordinates.lng,
          dossier: {
            score: p.score || 75,
            anglesForList: p.angles || ['Potential opportunity'],
            summary: p.reasoning || 'Pending deep research',
          },
          status: 'queued',
        }, { onConflict: 'session_id,prospect_key' });

      if (dossierError) {
        console.error('Failed to create dossier:', dossierError);
        continue;
      }

      // Create research job (user_id can be null for anonymous)
      const { data: job, error: jobError } = await supabase
        .from('research_jobs')
        .insert({
          user_id: userId,
          session_id: sessionId,
          job_type: 'dossier',
          prospect_key: prospectKey,
          status: 'queued',
        })
        .select('id')
        .single();

      if (job) {
        jobs.push({
          jobId: job.id,
          prospectId: prospectKey,
          status: 'queued',
        });
      }

      prospects.push({
        prospectId: prospectKey,
        name: p.name,
        state: p.state,
        lat: coordinates.lat,
        lng: coordinates.lng,
        initialScore: p.score || 75,
        angles: p.angles || ['Potential opportunity'],
        researchStatus: 'queued',
      });
    }

    // Update session status
    await supabase
      .from('discovery_sessions')
      .update({ status: 'prospects_discovered' })
      .eq('id', sessionId);

    const latency = Date.now() - startTime;
    console.log(`Discovered ${prospects.length} prospects in ${latency}ms`);

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