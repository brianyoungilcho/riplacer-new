-- Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- Add riplace-related columns directly to prospects table for faster queries
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS riplace_score INTEGER DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contract_value TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS highlight TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS highlight_type TEXT CHECK (highlight_type IN ('timing', 'opportunity', 'weakness'));
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS riplace_angle TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS decision_maker TEXT;

-- Add index for riplace_score queries
CREATE INDEX IF NOT EXISTS idx_prospects_riplace_score ON prospects(riplace_score DESC);

-- Add index for user_leads by status
CREATE INDEX IF NOT EXISTS idx_user_leads_status ON user_leads(user_id, status);