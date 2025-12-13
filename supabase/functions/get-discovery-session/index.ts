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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get user from auth header (optional for anonymous sessions)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { sessionId, processNextJob = true } = await req.json();

    console.log('Getting discovery session:', sessionId, 'user:', userId || 'anonymous');

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('discovery_sessions')
      .select('id, user_id, status, criteria, created_at, updated_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify access: either user owns it or it's anonymous
    if (session.user_id && session.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get advantage brief
    const { data: brief } = await supabase
      .from('advantage_briefs')
      .select('brief, status')
      .eq('session_id', sessionId)
      .maybeSingle();

    // Get prospects/dossiers
    const { data: dossiers } = await supabase
      .from('prospect_dossiers')
      .select('prospect_key, prospect_name, prospect_state, prospect_lat, prospect_lng, dossier, status, last_updated')
      .eq('session_id', sessionId);

    // Get jobs
    const { data: jobs } = await supabase
      .from('research_jobs')
      .select('id, job_type, prospect_key, status, progress, error, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // Process next queued job if requested (poll-triggered execution)
    if (processNextJob) {
      const queuedJob = jobs?.find(j => j.status === 'queued');
      if (queuedJob) {
        console.log('Processing queued job:', queuedJob.id, queuedJob.job_type);
        
        // Mark job as running
        await supabase
          .from('research_jobs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', queuedJob.id);

        // Trigger async dossier research (fire and forget via waitUntil pattern)
        if (queuedJob.job_type === 'dossier' && queuedJob.prospect_key) {
          // Get the prospect info
          const prospect = dossiers?.find(d => d.prospect_key === queuedJob.prospect_key);
          if (prospect) {
            // Call research-prospect-dossier in background
            const dossierUrl = `${supabaseUrl}/functions/v1/research-prospect-dossier`;
            
            // Fire and forget - don't await
            fetch(dossierUrl, {
              method: 'POST',
              headers: {
                ...(authHeader ? { 'Authorization': authHeader } : {}),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId,
                prospect: {
                  name: prospect.prospect_name,
                  state: prospect.prospect_state,
                  lat: prospect.prospect_lat,
                  lng: prospect.prospect_lng,
                },
                jobId: queuedJob.id,
              }),
            }).catch(e => console.error('Background dossier fetch failed:', e));
          }
        }
      }
    }

    // Format response
    const prospects = (dossiers || []).map(d => {
      // Return dossier data if it exists and status is not 'failed'
      // This allows showing partial data even when research is still in progress
      const shouldIncludeDossier = d.dossier && d.status !== 'failed';
      
      return {
        prospectId: d.prospect_key,
        name: d.prospect_name,
        state: d.prospect_state,
        lat: d.prospect_lat,
        lng: d.prospect_lng,
        dossierStatus: d.status,
        dossierLastUpdated: d.last_updated,
        dossier: shouldIncludeDossier ? d.dossier : undefined,
        angles: d.dossier?.anglesForList,
        score: d.dossier?.score,
      };
    });

    const formattedJobs = (jobs || []).map(j => ({
      id: j.id,
      type: j.job_type,
      prospectKey: j.prospect_key,
      status: j.status,
      progress: j.progress,
      error: j.error,
    }));

    // Calculate overall progress
    const totalJobs = formattedJobs.length;
    const completedJobs = formattedJobs.filter(j => j.status === 'complete' || j.status === 'failed').length;
    const progress = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    return new Response(
      JSON.stringify({
        session: {
          id: session.id,
          status: session.status,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          criteria: session.criteria,
          isAnonymous: !session.user_id,
        },
        advantageBrief: brief?.status === 'ready' ? brief.brief : undefined,
        advantageBriefStatus: brief?.status || 'pending',
        prospects,
        jobs: formattedJobs,
        progress,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in get-discovery-session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});