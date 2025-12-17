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

    const { prospect_id, place_id } = await req.json();
    
    if (!prospect_id && !place_id) {
      throw new Error('prospect_id or place_id is required');
    }

    console.log('Removing prospect from favorites for user:', user.id);

    let deleteQuery = supabase
      .from('user_leads')
      .delete()
      .eq('user_id', user.id);

    if (prospect_id) {
      // Direct prospect_id match
      deleteQuery = deleteQuery.eq('prospect_id', prospect_id);
    } else if (place_id) {
      // Need to find prospect by place_id first
      const { data: prospect } = await supabase
        .from('prospects')
        .select('id')
        .eq('place_id', place_id)
        .maybeSingle();
      
      if (!prospect) {
        return new Response(
          JSON.stringify({ success: true, message: 'Prospect not found in favorites' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      deleteQuery = deleteQuery.eq('prospect_id', prospect.id);
    }

    const { error: deleteError, count } = await deleteQuery;

    if (deleteError) {
      console.error('Error removing from favorites:', deleteError);
      throw deleteError;
    }

    console.log('Successfully removed from favorites, rows affected:', count);

    return new Response(
      JSON.stringify({ 
        success: true, 
        removed: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in remove-prospect:', error);
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
