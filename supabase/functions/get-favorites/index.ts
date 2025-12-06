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

    console.log('Fetching favorites for user:', user.id);

    // Get user's leads with prospect data
    const { data: leads, error: leadsError } = await supabase
      .from('user_leads')
      .select(`
        id,
        status,
        notes,
        ai_hook,
        created_at,
        updated_at,
        prospects (
          id,
          name,
          address,
          lat,
          lng,
          phone,
          website_url,
          place_id,
          ai_enrichment_json,
          enriched_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    // Transform the data for the frontend
    const prospects = leads?.map(lead => {
      const prospect = lead.prospects as any;
      const enrichment = prospect?.ai_enrichment_json || {};
      
      return {
        id: prospect?.id,
        user_lead_id: lead.id,
        name: prospect?.name,
        address: prospect?.address,
        lat: prospect?.lat,
        lng: prospect?.lng,
        phone: prospect?.phone,
        website_url: prospect?.website_url,
        place_id: prospect?.place_id,
        status: lead.status,
        user_notes: lead.notes,
        ai_hook: lead.ai_hook,
        riplace_score: enrichment.riplace_score || 0,
        highlight: enrichment.highlight,
        highlight_type: enrichment.highlight_type,
        contract_value: enrichment.contract_value,
        riplace_angle: enrichment.riplace_angle,
        decision_maker: enrichment.decision_maker,
        sources: enrichment.sources || [],
        last_enriched_at: prospect?.enriched_at,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      };
    }) || [];

    // Sort by riplace_score descending
    prospects.sort((a, b) => (b.riplace_score || 0) - (a.riplace_score || 0));

    console.log('Found', prospects.length, 'favorites for user');

    return new Response(
      JSON.stringify({ prospects }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-favorites:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, prospects: [] }),
      { 
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
