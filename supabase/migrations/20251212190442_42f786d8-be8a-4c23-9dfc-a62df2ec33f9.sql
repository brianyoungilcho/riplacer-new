-- Discovery Sessions: stores durable research runs with criteria
CREATE TABLE discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  criteria JSONB NOT NULL,
  criteria_hash TEXT NOT NULL,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovery_sessions_user ON discovery_sessions(user_id, created_at DESC);
CREATE INDEX idx_discovery_sessions_hash ON discovery_sessions(criteria_hash);

ALTER TABLE discovery_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON discovery_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON discovery_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON discovery_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON discovery_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Advantage Briefs: strategic competitive analysis per session
CREATE TABLE advantage_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE NOT NULL,
  brief JSONB NOT NULL,
  sources JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

ALTER TABLE advantage_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefs" ON advantage_briefs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM discovery_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid())
  );

CREATE POLICY "Users can create own briefs" ON advantage_briefs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM discovery_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid())
  );

CREATE POLICY "Users can update own briefs" ON advantage_briefs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM discovery_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid())
  );

-- Prospect Dossiers: deep research per prospect per session
CREATE TABLE prospect_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE NOT NULL,
  prospect_key TEXT NOT NULL,
  prospect_name TEXT NOT NULL,
  prospect_state TEXT,
  prospect_lat DOUBLE PRECISION,
  prospect_lng DOUBLE PRECISION,
  dossier JSONB,
  sources JSONB DEFAULT '[]',
  status TEXT DEFAULT 'queued',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, prospect_key)
);

CREATE INDEX idx_dossiers_session ON prospect_dossiers(session_id);
CREATE INDEX idx_dossiers_status ON prospect_dossiers(session_id, status);

ALTER TABLE prospect_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dossiers" ON prospect_dossiers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM discovery_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid())
  );

CREATE POLICY "Users can create own dossiers" ON prospect_dossiers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM discovery_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid())
  );

CREATE POLICY "Users can update own dossiers" ON prospect_dossiers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM discovery_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid())
  );

-- Research Jobs: track async job status
CREATE TABLE research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL,
  prospect_key TEXT,
  status TEXT DEFAULT 'queued',
  progress INT DEFAULT 0,
  error TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_session ON research_jobs(session_id, created_at DESC);
CREATE INDEX idx_jobs_status ON research_jobs(session_id, status);

ALTER TABLE research_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON research_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON research_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON research_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Rep Notes: private user notes per prospect
CREATE TABLE rep_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES discovery_sessions(id) ON DELETE CASCADE NOT NULL,
  prospect_key TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id, prospect_key)
);

CREATE INDEX idx_rep_notes_session ON rep_notes(session_id, prospect_key);

ALTER TABLE rep_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON rep_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes" ON rep_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON rep_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON rep_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_discovery_sessions_updated_at
  BEFORE UPDATE ON discovery_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advantage_briefs_updated_at
  BEFORE UPDATE ON advantage_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rep_notes_updated_at
  BEFORE UPDATE ON rep_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();