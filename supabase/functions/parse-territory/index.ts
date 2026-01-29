import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common region mappings
const REGION_STATES: Record<string, string[]> = {
  'northeast': ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island', 'Vermont', 'New Jersey', 'New York', 'Pennsylvania'],
  'new england': ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island', 'Vermont'],
  'mid-atlantic': ['New Jersey', 'New York', 'Pennsylvania'],
  'southeast': ['Alabama', 'Arkansas', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 'Mississippi', 'North Carolina', 'South Carolina', 'Tennessee', 'Virginia', 'West Virginia'],
  'midwest': ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'South Dakota', 'Wisconsin'],
  'southwest': ['Arizona', 'New Mexico', 'Oklahoma', 'Texas'],
  'west': ['Alaska', 'California', 'Colorado', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'Oregon', 'Utah', 'Washington', 'Wyoming'],
  'pacific northwest': ['Oregon', 'Washington', 'Idaho'],
  'mountain west': ['Colorado', 'Idaho', 'Montana', 'Nevada', 'Utah', 'Wyoming'],
  'great plains': ['Kansas', 'Nebraska', 'North Dakota', 'South Dakota'],
  'gulf coast': ['Alabama', 'Florida', 'Louisiana', 'Mississippi', 'Texas'],
  'east coast': ['Connecticut', 'Delaware', 'Florida', 'Georgia', 'Maine', 'Maryland', 'Massachusetts', 'New Hampshire', 'New Jersey', 'New York', 'North Carolina', 'Rhode Island', 'South Carolina', 'Virginia'],
  'west coast': ['California', 'Oregon', 'Washington'],
  'tri-state': ['New York', 'New Jersey', 'Connecticut'],
};

// Major cities by state for lookup
const MAJOR_CITIES: Record<string, string[]> = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 'Fresno'],
  'Texas': ['Houston', 'Dallas', 'San Antonio', 'Austin', 'Fort Worth', 'El Paso'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
  'Illinois': ['Chicago', 'Aurora', 'Naperville', 'Rockford'],
  'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie'],
  'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo'],
  'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Savannah'],
  'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge'],
  'Washington': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Territory description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing territory description:', description);

    // Try simple pattern matching first for common cases
    const descLower = description.toLowerCase();
    
    // Check for known regions
    for (const [region, states] of Object.entries(REGION_STATES)) {
      if (descLower.includes(region)) {
        return new Response(
          JSON.stringify({
            states,
            cities: [],
            regions: [region],
            populationFilter: extractPopulationFilter(descLower),
            interpretation: `Found match for ${region} region: ${states.join(', ')}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Use Gemini for complex parsing
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          states: [],
          cities: [],
          regions: [],
          interpretation: 'Could not parse territory. Please select states manually.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Parse this sales territory description into structured data:
"${description}"

Return a JSON object with:
- states: array of full US state names that match
- cities: array of specific cities mentioned
- regions: array of region names (e.g., "Pacific Northwest", "New England")
- populationFilter: population requirement if mentioned (e.g., ">100000")
- interpretation: 1-sentence human-readable interpretation

Return ONLY valid JSON.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a geography expert. Parse territory descriptions into structured data. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('AI parsing failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(
        JSON.stringify({
          states: parsed.states || [],
          cities: parsed.cities || [],
          regions: parsed.regions || [],
          populationFilter: parsed.populationFilter || null,
          interpretation: parsed.interpretation || 'Territory parsed successfully',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        states: [],
        cities: [],
        regions: [],
        interpretation: 'Could not parse territory. Please select states manually.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in parse-territory:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractPopulationFilter(text: string): string | null {
  const popMatch = text.match(/(?:pop(?:ulation)?|over|more than|greater than)\s*(?:of\s*)?([\d,]+)/i);
  if (popMatch) {
    return `>${popMatch[1].replace(/,/g, '')}`;
  }
  return null;
}
