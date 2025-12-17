import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Number of jobs to process in parallel per poll
const MAX_PARALLEL_JOBS = 3;

// Timeout for stuck jobs (2 minutes)
const JOB_TIMEOUT_MS = 2 * 60 * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
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

    // OPTIMIZATION: Fetch all data in parallel instead of sequentially
    const [sessionResult, briefResult, dossiersResult, jobsResult] = await Promise.all([
      // Get session
      supabase
        .from('discovery_sessions')
        .select('id, user_id, status, criteria, created_at, updated_at')
        .eq('id', sessionId)
        .single(),
      
      // Get advantage brief
      supabase
        .from('advantage_briefs')
        .select('brief, status')
        .eq('session_id', sessionId)
        .maybeSingle(),
      
      // Get prospects/dossiers
      supabase
        .from('prospect_dossiers')
        .select('prospect_key, prospect_name, prospect_state, prospect_lat, prospect_lng, dossier, status, last_updated')
        .eq('session_id', sessionId),
      
      // Get jobs
      supabase
        .from('research_jobs')
        .select('id, job_type, prospect_key, status, progress, error, created_at, started_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
    ]);

    const { data: session, error: sessionError } = sessionResult;
    const { data: brief } = briefResult;
    const { data: dossiers } = dossiersResult;
    const { data: jobs } = jobsResult;

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

    // Track jobs that need updating (batch updates at end)
    const jobUpdates: { ids: string[]; update: Record<string, any> }[] = [];

    // Reset stuck jobs (running for more than 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - JOB_TIMEOUT_MS).toISOString();
    const stuckJobs = jobs?.filter(j => 
      j.status === 'running' && 
      j.started_at && 
      j.started_at < twoMinutesAgo
    ) || [];

    if (stuckJobs.length > 0) {
      console.log(`Resetting ${stuckJobs.length} stuck jobs:`, stuckJobs.map(j => j.id));
      
      jobUpdates.push({
        ids: stuckJobs.map(j => j.id),
        update: { 
          status: 'queued', 
          started_at: null, 
          error: 'Timeout - automatically retrying' 
        }
      });

      // Update local jobs array to reflect the change
      stuckJobs.forEach(stuckJob => {
        const jobInArray = jobs?.find(j => j.id === stuckJob.id);
        if (jobInArray) {
          jobInArray.status = 'queued';
          jobInArray.started_at = null;
        }
      });
    }

    // Process multiple queued jobs in parallel
    if (processNextJob) {
      const queuedJobs = jobs?.filter(j => j.status === 'queued') || [];
      const jobsToProcess = queuedJobs.slice(0, MAX_PARALLEL_JOBS);

      if (jobsToProcess.length > 0) {
        console.log(`Processing ${jobsToProcess.length} queued jobs in parallel:`, jobsToProcess.map(j => j.id));
        
        // OPTIMIZATION: Batch mark all jobs as running in single query
        const jobIds = jobsToProcess.map(j => j.id);
        jobUpdates.push({
          ids: jobIds,
          update: { status: 'running', started_at: new Date().toISOString() }
        });

        // Fire off all dossier research requests in parallel (don't await)
        const dossierPromises = jobsToProcess
          .filter(job => job.job_type === 'dossier' && job.prospect_key)
          .map(async (queuedJob) => {
            const prospect = dossiers?.find(d => d.prospect_key === queuedJob.prospect_key);
            if (!prospect) {
              console.error(`Prospect not found for job ${queuedJob.id}:`, queuedJob.prospect_key);
              // Mark job as failed if prospect doesn't exist
              jobUpdates.push({
                ids: [queuedJob.id],
                update: { 
                  status: 'failed', 
                  error: 'Prospect not found',
                  finished_at: new Date().toISOString()
                }
              });
              return;
            }

            const dossierUrl = `${supabaseUrl}/functions/v1/research-prospect-dossier`;
            
            try {
              // Fire with proper headers for function-to-function call
              // Use apikey header (required) and optionally Authorization
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'apikey': anonKey, // Required for Supabase function invocation
              };
              
              // Pass through auth header if present
              if (authHeader) {
                headers['Authorization'] = authHeader;
              }

              console.log(`Starting dossier research for ${prospect.prospect_name} (job ${queuedJob.id})`);
              
              fetch(dossierUrl, {
                method: 'POST',
                headers,
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
              }).then(async (res) => {
                if (!res.ok) {
                  const errText = await res.text().catch(() => 'unknown');
                  console.error(`Dossier research failed for job ${queuedJob.id}: ${res.status} - ${errText}`);
                } else {
                  console.log(`Dossier research started successfully for job ${queuedJob.id}`);
                }
              }).catch((e) => {
                console.error(`Background dossier fetch failed for job ${queuedJob.id}:`, e);
              });
            } catch (e) {
              console.error(`Error starting dossier research for job ${queuedJob.id}:`, e);
            }
          });

        // Wait for all fire-and-forget calls to be initiated
        await Promise.all(dossierPromises);
      }
    }

    // OPTIMIZATION: Execute all job updates in parallel
    if (jobUpdates.length > 0) {
      await Promise.all(
        jobUpdates.map(({ ids, update }) =>
          supabase
            .from('research_jobs')
            .update(update)
            .in('id', ids)
        )
      );
    }

    // Format response
    const prospects = (dossiers || []).map(d => {
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
