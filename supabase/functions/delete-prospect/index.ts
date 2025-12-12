import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prospectId } = await req.json();

    if (!prospectId) {
      return new Response(
        JSON.stringify({ error: 'Prospect ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Soft deleting prospect:', prospectId, 'for user:', user.id);

    // Soft delete by setting deleted_at
    const deletedAt = new Date().toISOString();
    
    // First check if there's an existing user_lead entry
    const { data: existingLead } = await supabase
      .from('user_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('prospect_id', prospectId)
      .single();

    if (existingLead) {
      // Update existing lead with deleted_at
      const { error: updateError } = await supabase
        .from('user_leads')
        .update({ deleted_at: deletedAt })
        .eq('id', existingLead.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create a new lead entry with deleted status
      const { error: insertError } = await supabase
        .from('user_leads')
        .insert({
          user_id: user.id,
          prospect_id: prospectId,
          status: 'irrelevant',
          deleted_at: deletedAt,
        });

      if (insertError) {
        throw insertError;
      }
    }

    // Also soft delete from user_prospect_lists if exists
    await supabase
      .from('user_prospect_lists')
      .update({ deleted_at: deletedAt })
      .eq('user_id', user.id)
      .filter('prospect_data->id', 'eq', prospectId);

    console.log('Prospect soft deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        deletedAt,
        prospectId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in delete-prospect:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
