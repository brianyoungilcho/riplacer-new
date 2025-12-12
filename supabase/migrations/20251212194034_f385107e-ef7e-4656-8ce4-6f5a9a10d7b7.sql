-- Allow null user_id for anonymous discovery sessions
ALTER TABLE public.discovery_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies for discovery_sessions to allow anonymous access
DROP POLICY IF EXISTS "Users can create own sessions" ON public.discovery_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.discovery_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.discovery_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.discovery_sessions;

-- Allow anyone to create sessions (auth or anon)
CREATE POLICY "Anyone can create sessions"
ON public.discovery_sessions
FOR INSERT
WITH CHECK (true);

-- Allow users to view their own sessions OR anonymous sessions
CREATE POLICY "Users can view own or anon sessions"
ON public.discovery_sessions
FOR SELECT
USING (user_id IS NULL OR auth.uid() = user_id);

-- Allow users to update their own sessions OR anonymous sessions
CREATE POLICY "Users can update own or anon sessions"
ON public.discovery_sessions
FOR UPDATE
USING (user_id IS NULL OR auth.uid() = user_id);

-- Allow users to delete their own sessions only
CREATE POLICY "Users can delete own sessions"
ON public.discovery_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Update prospect_dossiers RLS to allow anonymous session access
DROP POLICY IF EXISTS "Users can view own dossiers" ON public.prospect_dossiers;
DROP POLICY IF EXISTS "Users can create own dossiers" ON public.prospect_dossiers;
DROP POLICY IF EXISTS "Users can update own dossiers" ON public.prospect_dossiers;

CREATE POLICY "Users can view dossiers for accessible sessions"
ON public.prospect_dossiers
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = prospect_dossiers.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

CREATE POLICY "Anyone can create dossiers for accessible sessions"
ON public.prospect_dossiers
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = prospect_dossiers.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

CREATE POLICY "Anyone can update dossiers for accessible sessions"
ON public.prospect_dossiers
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = prospect_dossiers.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

-- Update research_jobs RLS for anonymous access
DROP POLICY IF EXISTS "Users can view own jobs" ON public.research_jobs;
DROP POLICY IF EXISTS "Users can create own jobs" ON public.research_jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.research_jobs;

-- Allow null user_id for anonymous jobs
ALTER TABLE public.research_jobs ALTER COLUMN user_id DROP NOT NULL;

CREATE POLICY "Users can view jobs for accessible sessions"
ON public.research_jobs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = research_jobs.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

CREATE POLICY "Anyone can create jobs for accessible sessions"
ON public.research_jobs
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = research_jobs.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

CREATE POLICY "Anyone can update jobs for accessible sessions"
ON public.research_jobs
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = research_jobs.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

-- Update advantage_briefs RLS for anonymous access
DROP POLICY IF EXISTS "Users can view own briefs" ON public.advantage_briefs;
DROP POLICY IF EXISTS "Users can create own briefs" ON public.advantage_briefs;
DROP POLICY IF EXISTS "Users can update own briefs" ON public.advantage_briefs;

CREATE POLICY "Users can view briefs for accessible sessions"
ON public.advantage_briefs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = advantage_briefs.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

CREATE POLICY "Anyone can create briefs for accessible sessions"
ON public.advantage_briefs
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = advantage_briefs.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));

CREATE POLICY "Anyone can update briefs for accessible sessions"
ON public.advantage_briefs
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM discovery_sessions ds
  WHERE ds.id = advantage_briefs.session_id
  AND (ds.user_id IS NULL OR ds.user_id = auth.uid())
));