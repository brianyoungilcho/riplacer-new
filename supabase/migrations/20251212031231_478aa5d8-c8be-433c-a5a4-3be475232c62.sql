-- Add deleted_at to user_leads for soft delete
ALTER TABLE user_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_user_leads_deleted ON user_leads(user_id, deleted_at);

-- Add state to prospects for territory filtering
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS state TEXT;
CREATE INDEX IF NOT EXISTS idx_prospects_state ON prospects(state);

-- Competitor research cache table
CREATE TABLE IF NOT EXISTS competitor_research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT UNIQUE NOT NULL,
  competitors JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_competitor_cache_hash ON competitor_research_cache(input_hash);
CREATE INDEX IF NOT EXISTS idx_competitor_cache_expires ON competitor_research_cache(expires_at);

-- Enable RLS on competitor_research_cache (public read for caching)
ALTER TABLE competitor_research_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read competitor cache" ON competitor_research_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert competitor cache" ON competitor_research_cache
  FOR INSERT WITH CHECK (true);

-- Prospect discovery cache table
CREATE TABLE IF NOT EXISTS prospect_discovery_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_hash TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  prospects JSONB NOT NULL,
  total_estimate INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE(criteria_hash, page_number)
);

CREATE INDEX IF NOT EXISTS idx_discovery_cache_hash ON prospect_discovery_cache(criteria_hash);

-- Enable RLS on prospect_discovery_cache
ALTER TABLE prospect_discovery_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read discovery cache" ON prospect_discovery_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert discovery cache" ON prospect_discovery_cache
  FOR INSERT WITH CHECK (true);

-- User prospect lists table for persisting discovery results
CREATE TABLE IF NOT EXISTS user_prospect_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_data JSONB NOT NULL,
  source TEXT DEFAULT 'discovery',
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_prospect_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prospect lists" ON user_prospect_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prospect lists" ON user_prospect_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prospect lists" ON user_prospect_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prospect lists" ON user_prospect_lists
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_prospects_user ON user_prospect_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prospects_deleted ON user_prospect_lists(user_id, deleted_at);