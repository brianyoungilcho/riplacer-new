-- User Territories Table
CREATE TABLE IF NOT EXISTS user_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region TEXT,
  states JSONB DEFAULT '[]'::jsonb,
  cities JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_territories_user_id ON user_territories(user_id);

-- User Categories Table
CREATE TABLE IF NOT EXISTS user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

CREATE INDEX idx_user_categories_user_id ON user_categories(user_id);

-- User Competitors Table
CREATE TABLE IF NOT EXISTS user_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  category_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, competitor_name)
);

CREATE INDEX idx_user_competitors_user_id ON user_competitors(user_id);

-- Add additional indexes to prospects table
CREATE INDEX IF NOT EXISTS idx_prospects_favorite ON prospects(lat, lng);

-- Enable RLS on new tables
ALTER TABLE user_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_competitors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_territories
CREATE POLICY "Users can view own territories" ON user_territories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own territories" ON user_territories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own territories" ON user_territories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own territories" ON user_territories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_categories
CREATE POLICY "Users can view own categories" ON user_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON user_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON user_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON user_categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_competitors
CREATE POLICY "Users can view own competitors" ON user_competitors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitors" ON user_competitors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitors" ON user_competitors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitors" ON user_competitors
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for user_territories updated_at
CREATE TRIGGER update_user_territories_updated_at
  BEFORE UPDATE ON user_territories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();