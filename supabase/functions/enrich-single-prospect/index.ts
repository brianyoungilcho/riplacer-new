import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// State center coordinates
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationName, location, userContext } = await req.json();

    if (!organizationName) {
      return new Response(
        JSON.stringify({ error: 'Organization name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enriching prospect:', organizationName, location);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const territoryStates = userContext?.territory?.states || [];
    
    const prompt = `Research this organization for B2B sales intelligence:
Organization: "${organizationName}"
${location ? `Location hint: ${location}` : ''}

The sales rep sells: ${userContext?.productDescription || 'enterprise solutions'}
Their competitors include: ${userContext?.competitors?.join(', ') || 'various vendors'}
${territoryStates.length > 0 ? `Their territory covers: ${territoryStates.join(', ')}` : ''}

Provide intelligence about this organization:
1. Verify it's a real organization
2. Determine its location (city, state)
3. Assess if they might use the competitors mentioned
4. Find any timing signals (contracts, RFPs, budget cycles)
5. Identify decision makers if possible

Return a JSON object with:
- name: Organization's full official name
- city: City location
- state: State location (full name)
- score: Confidence score 0-100 for sales opportunity
- contractValue: Estimated annual contract value (e.g., "$200K/yr")
- highlight: Key timing or opportunity signal
- highlightType: "timing" | "opportunity" | "weakness"
- riplaceAngle: 2-3 sentence sales angle
- decisionMaker: Likely decision maker title/name if known
- confidence: 0-1 confidence in the research accuracy
- isInTerritory: boolean - is this in the specified territory states?

Return ONLY valid JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a B2B sales research expert. Research organizations and return actionable sales intelligence. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('AI enrichment failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let enrichedData: any = {};
    
    if (jsonMatch) {
      enrichedData = JSON.parse(jsonMatch[0]);
    }

    // Get coordinates for the state
    const state = enrichedData.state || (location?.split(',').pop()?.trim());
    const stateCenter = STATE_CENTERS[state] || { lat: 39.8283, lng: -98.5795 };
    
    // Check if in territory
    const isInTerritory = territoryStates.length === 0 || 
      territoryStates.some((s: string) => s.toLowerCase() === state?.toLowerCase());

    const prospect = {
      id: crypto.randomUUID(),
      name: enrichedData.name || organizationName,
      score: enrichedData.score || 70,
      contractValue: enrichedData.contractValue || '$150K/yr',
      highlight: enrichedData.highlight || 'Research Complete',
      highlightType: enrichedData.highlightType || 'opportunity',
      riplaceAngle: enrichedData.riplaceAngle || `Potential target for ${userContext?.productDescription || 'your solution'}.`,
      sources: [
        { label: 'AI Research', url: 'https://riplacer.com' },
      ],
      lastUpdated: new Date().toISOString(),
      lat: stateCenter.lat + (Math.random() - 0.5) * 0.5,
      lng: stateCenter.lng + (Math.random() - 0.5) * 0.8,
      state: state || 'Unknown',
      address: enrichedData.city ? `${enrichedData.city}, ${state}` : location || 'Unknown',
      decisionMaker: enrichedData.decisionMaker,
    };

    return new Response(
      JSON.stringify({
        prospect,
        confidence: enrichedData.confidence || 0.7,
        isInTerritory,
        sources: ['AI Research'],
        warning: !isInTerritory ? `This organization may be outside your territory (${territoryStates.join(', ')})` : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in enrich-single-prospect:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
