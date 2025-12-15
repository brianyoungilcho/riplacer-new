-- Enable realtime for prospect_dossiers table for faster updates
ALTER TABLE public.prospect_dossiers REPLICA IDENTITY FULL;

-- Enable realtime for research_jobs table for faster job status updates
ALTER TABLE public.research_jobs REPLICA IDENTITY FULL;

-- Add tables to realtime publication
-- Note: Using DO block to handle case where tables might already be in publication
DO $$
BEGIN
  -- Add prospect_dossiers to realtime if not already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_dossiers;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication, ignore
  END;
  
  -- Add research_jobs to realtime if not already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.research_jobs;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication, ignore
  END;
END $$;

-- Add index for faster session-based queries on research_jobs
CREATE INDEX IF NOT EXISTS idx_research_jobs_session_status 
ON public.research_jobs (session_id, status);

-- Add index for faster dossier lookups by session
CREATE INDEX IF NOT EXISTS idx_prospect_dossiers_session_status
ON public.prospect_dossiers (session_id, status);