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

    const { prospect_id, user_notes, status } = await req.json();
    
    if (!prospect_id) {
      throw new Error('prospect_id is required');
    }

    console.log('Updating notes for prospect:', prospect_id, 'user:', user.id);

    // Build update object
    const updates: any = { updated_at: new Date().toISOString() };
    if (user_notes !== undefined) updates.notes = user_notes;
    if (status !== undefined) updates.status = status;

    // Update the user_lead
    const { data, error } = await supabase
      .from('user_leads')
      .update(updates)
      .eq('user_id', user.id)
      .eq('prospect_id', prospect_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notes:', error);
      throw error;
    }

    console.log('Notes updated successfully');

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-prospect-notes:', error);
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
