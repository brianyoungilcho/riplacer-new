import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { place_id, prospect_data, user_notes } = await req.json();
    
    if (!place_id) {
      throw new Error('place_id is required');
    }

    console.log('Saving prospect for user:', user.id, 'place_id:', place_id);

    // First, upsert the prospect into the prospects table
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .upsert({
        place_id,
        name: prospect_data?.name || 'Unknown',
        address: prospect_data?.address,
        lat: prospect_data?.lat,
        lng: prospect_data?.lng,
        phone: prospect_data?.phone,
        website_url: prospect_data?.website_url,
        ai_enrichment_json: prospect_data?.enrichment || null,
        enriched_at: prospect_data?.enrichment ? new Date().toISOString() : null,
      }, {
        onConflict: 'place_id'
      })
      .select()
      .single();

    if (prospectError) {
      console.error('Error upserting prospect:', prospectError);
      throw prospectError;
    }

    // Then, upsert the user_lead (favorite)
    const { data: userLead, error: leadError } = await supabase
      .from('user_leads')
      .upsert({
        user_id: user.id,
        prospect_id: prospect.id,
        notes: user_notes || null,
        status: 'saved',
      }, {
        onConflict: 'user_id,prospect_id'
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error upserting user_lead:', leadError);
      throw leadError;
    }

    console.log('Prospect saved successfully:', prospect.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        prospect_id: prospect.id,
        user_lead_id: userLead.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in save-prospect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
