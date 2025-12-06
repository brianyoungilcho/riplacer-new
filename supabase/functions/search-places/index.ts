import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, radius } = await req.json();
    
    if (!query || !location) {
      throw new Error('Query and location are required');
    }

    console.log('Searching for:', query, 'near', location, 'radius:', radius);

    // First, geocode the location to get coordinates
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxToken}&limit=1`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (!geocodeData.features || geocodeData.features.length === 0) {
      throw new Error('Could not find the specified location');
    }

    const [lng, lat] = geocodeData.features[0].center;
    console.log('Location coordinates:', lat, lng);

    // Search for places using Mapbox Search API
    const radiusMeters = radius * 1609.34; // Convert miles to meters
    const searchUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&proximity=${lng},${lat}&limit=20&types=poi`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.features) {
      throw new Error('Search failed');
    }

    // Transform results to our format
    const results = searchData.features
      .filter((feature: any) => {
        // Filter by radius
        const [pLng, pLat] = feature.center;
        const distance = getDistanceFromLatLonInMiles(lat, lng, pLat, pLng);
        return distance <= radius;
      })
      .map((feature: any) => ({
        place_id: feature.id,
        name: feature.text || feature.place_name.split(',')[0],
        address: feature.place_name,
        lat: feature.center[1],
        lng: feature.center[0],
        phone: feature.properties?.tel || null,
        website: feature.properties?.website || null,
      }));

    console.log(`Found ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-places:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, results: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getDistanceFromLatLonInMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Radius of the earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
