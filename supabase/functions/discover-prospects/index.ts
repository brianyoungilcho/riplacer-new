import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// State center coordinates for generating realistic locations
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

// Category to search terms mapping
const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  'police': ['Police Department', 'Sheriff Office', 'Law Enforcement', 'Public Safety'],
  'fire': ['Fire Department', 'Fire Station', 'Fire Rescue'],
  'schools_k12': ['School District', 'Public School', 'Board of Education'],
  'higher_ed': ['University', 'College', 'Community College'],
  'hospitals': ['Hospital', 'Medical Center', 'Health System'],
  'utilities': ['Water District', 'Electric Utility', 'Power Authority'],
  'transit': ['Transit Authority', 'Transportation District', 'Metro'],
  'corrections': ['Correctional Facility', 'Prison', 'Detention Center'],
  'military': ['Military Base', 'National Guard', 'Air Force Base'],
  'federal': ['Federal Agency', 'Government Office'],
};

function createHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate random offset within state bounds
function randomOffset(scale: number = 0.5): number {
  return (Math.random() - 0.5) * scale;
}

// Generate mock prospects for development/fallback
function generateMockProspects(
  states: string[],
  categories: string[],
  competitors: string[],
  count: number = 10
): any[] {
  const prospects: any[] = [];
  const highlightTypes = ['timing', 'opportunity', 'weakness'] as const;
  const highlights = {
    timing: ['Contract Expiring Q2', 'RFP Open Now', 'Budget Cycle Starting', 'Contract Up for Renewal'],
    opportunity: ['New Funding Approved', 'Expansion Planned', 'Leadership Change', 'Modernization Initiative'],
    weakness: ['Vendor Issues Reported', 'Service Complaints', 'Seeking Alternatives', 'Budget Constraints'],
  };

  for (let i = 0; i < count; i++) {
    const state = states[Math.floor(Math.random() * states.length)];
    const stateCenter = STATE_CENTERS[state] || { lat: 39.8283, lng: -98.5795 };
    const category = categories[Math.floor(Math.random() * categories.length)];
    const categoryTerms = CATEGORY_SEARCH_TERMS[category] || ['Department'];
    const term = categoryTerms[Math.floor(Math.random() * categoryTerms.length)];
    const competitor = competitors[Math.floor(Math.random() * competitors.length)] || 'Incumbent';
    const highlightType = highlightTypes[Math.floor(Math.random() * highlightTypes.length)];
    const highlight = highlights[highlightType][Math.floor(Math.random() * highlights[highlightType].length)];
    const score = Math.floor(Math.random() * 40) + 60; // 60-100

    const cities = getCitiesForState(state);
    const city = cities[Math.floor(Math.random() * cities.length)];

    prospects.push({
      id: crypto.randomUUID(),
      name: `${city} ${term}`,
      score,
      contractValue: `$${Math.floor(Math.random() * 900 + 100)}K/yr`,
      highlight,
      highlightType,
      riplaceAngle: `Currently using ${competitor}. ${highlight}. Strong opportunity for displacement with competitive pricing and better service.`,
      sources: [
        { label: 'GovSpend', url: 'https://govspend.com' },
        { label: 'Public Records', url: 'https://example.com' },
      ],
      lastUpdated: new Date().toISOString(),
      lat: stateCenter.lat + randomOffset(1.5),
      lng: stateCenter.lng + randomOffset(2),
      state,
      address: `${Math.floor(Math.random() * 999) + 1} Main St, ${city}, ${state}`,
    });
  }

  return prospects.sort((a, b) => b.score - a.score);
}

function getCitiesForState(state: string): string[] {
  const stateCities: Record<string, string[]> = {
    'Connecticut': ['Hartford', 'New Haven', 'Stamford', 'Bridgeport', 'Waterbury'],
    'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell'],
    'New York': ['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
    'New Jersey': ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Trenton'],
    'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
    'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland'],
    'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
    'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
  };
  return stateCities[state] || ['Springfield', 'Franklin', 'Clinton', 'Washington', 'Madison'];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const {
      productDescription,
      territory,
      targetCategories,
      competitors,
      page = 0,
      pageSize = 10,
      existingProspectIds = [],
    } = await req.json();

    console.log('Discover prospects request:', {
      productDescription: productDescription?.substring(0, 50),
      states: territory?.states,
      categories: targetCategories,
      competitors,
      page,
    });

    if (!territory?.states?.length) {
      return new Response(
        JSON.stringify({ error: 'Territory states are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cache key
    const cacheKey = createHash(JSON.stringify({
      productDescription,
      states: territory.states.sort(),
      categories: targetCategories?.sort(),
      competitors: competitors?.sort(),
    }));

    // Check Supabase for cached results
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached } = await supabase
      .from('prospect_discovery_cache')
      .select('prospects, total_estimate')
      .eq('criteria_hash', cacheKey)
      .eq('page_number', page)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log('Returning cached discovery results');
      const prospects = cached.prospects.filter(
        (p: any) => !existingProspectIds.includes(p.id)
      );
      return new Response(
        JSON.stringify({
          prospects,
          totalEstimate: cached.total_estimate,
          hasMore: page < 4,
          searchMetadata: {
            cached: true,
            latency: Date.now() - startTime,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Gemini to generate intelligent prospect suggestions
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    let aiProspects: any[] = [];
    let aiLatency = 0;

    if (GOOGLE_GEMINI_API_KEY) {
      const aiStartTime = Date.now();
      try {
        const prompt = `You are a B2B sales intelligence researcher. Find government/enterprise accounts that:

1. Are located ONLY in these states: ${territory.states.join(", ")}
2. Fall into these categories: ${targetCategories?.join(", ") || "government agencies"}
3. Currently use or might use: ${competitors?.join(", ") || "various vendors"}
4. Would be good prospects for: ${productDescription || "enterprise software"}

For each prospect, provide:
- name: Organization name
- city: City name
- state: State (MUST be from the specified states)
- score: Confidence score 60-100
- contractValue: Estimated annual contract value like "$250K/yr"
- highlight: One of: "Contract Expiring", "RFP Open", "New Funding", "Leadership Change", "Vendor Issues"
- highlightType: One of: "timing", "opportunity", "weakness"
- riplaceAngle: 2-3 sentence explanation of why they're a good target

Return a JSON array of 10 prospects. Return ONLY valid JSON, no explanation.`;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GOOGLE_GEMINI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a B2B market research expert. Return only valid JSON arrays of prospect objects.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content || '[]';
          
          // Parse the JSON array from the response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiProspects = parsed.map((p: any) => {
              const stateCenter = STATE_CENTERS[p.state] || STATE_CENTERS[territory.states[0]] || { lat: 39.8283, lng: -98.5795 };
              return {
                id: crypto.randomUUID(),
                name: p.name,
                score: p.score || Math.floor(Math.random() * 30) + 70,
                contractValue: p.contractValue || '$200K/yr',
                highlight: p.highlight || 'Potential Opportunity',
                highlightType: p.highlightType || 'opportunity',
                riplaceAngle: p.riplaceAngle || 'Good prospect for displacement.',
                sources: [
                  { label: 'AI Research', url: 'https://riplacer.com' },
                ],
                lastUpdated: new Date().toISOString(),
                lat: stateCenter.lat + randomOffset(1.5),
                lng: stateCenter.lng + randomOffset(2),
                state: p.state || territory.states[0],
                address: `${p.city || 'City'}, ${p.state || territory.states[0]}`,
              };
            });
          }
        }
        aiLatency = Date.now() - aiStartTime;
      } catch (e) {
        console.error('AI prospect generation failed:', e);
      }
    }

    // Fall back to mock data if AI didn't return enough
    let prospects = aiProspects;
    if (prospects.length < pageSize) {
      const mockCount = pageSize - prospects.length;
      const mockProspects = generateMockProspects(
        territory.states,
        targetCategories || ['police', 'schools_k12'],
        competitors || ['Incumbent'],
        mockCount
      );
      prospects = [...prospects, ...mockProspects];
    }

    // Filter out already-shown prospects
    prospects = prospects.filter((p: any) => !existingProspectIds.includes(p.id));

    // Cache the results
    try {
      await supabase
        .from('prospect_discovery_cache')
        .upsert({
          criteria_hash: cacheKey,
          page_number: page,
          prospects,
          total_estimate: 50,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'criteria_hash,page_number' });
    } catch (e) {
      console.error('Cache save failed:', e);
    }

    const totalLatency = Date.now() - startTime;
    console.log(`Discover prospects completed in ${totalLatency}ms (AI: ${aiLatency}ms)`);

    return new Response(
      JSON.stringify({
        prospects,
        totalEstimate: 50,
        hasMore: page < 4,
        searchMetadata: {
          aiLatency,
          totalLatency,
          sourcesSearched: ['AI Research', 'Mock Data'],
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in discover-prospects:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
