import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      productDescription,
      territory,
      targetCategories,
      competitors,
      companyDomain,
    } = await req.json();

    console.log('Creating discovery session for user:', user.id);

    // Build criteria object
    const criteria = {
      productDescription,
      territory,
      targetCategories,
      competitors,
      companyDomain,
    };

    // Create hash for deduplication
    const criteriaHash = createHash(JSON.stringify({
      productDescription,
      states: territory?.states?.sort(),
      categories: targetCategories?.sort(),
      competitors: competitors?.sort(),
    }));

    // Check if session with same criteria exists (within last 24 hours)
    const { data: existingSession } = await supabase
      .from('discovery_sessions')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .eq('criteria_hash', criteriaHash)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      console.log('Returning existing session:', existingSession.id);
      return new Response(
        JSON.stringify({
          sessionId: existingSession.id,
          status: existingSession.status,
          isExisting: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new session
    const { data: session, error: insertError } = await supabase
      .from('discovery_sessions')
      .insert({
        user_id: user.id,
        criteria,
        criteria_hash: criteriaHash,
        status: 'created',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create session:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created new session:', session.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        status: 'created',
        isExisting: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-discovery-session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
