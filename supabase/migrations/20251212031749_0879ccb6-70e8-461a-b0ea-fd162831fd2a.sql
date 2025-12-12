-- Add is_custom_territory column to user_territories
ALTER TABLE user_territories ADD COLUMN IF NOT EXISTS is_custom_territory BOOLEAN DEFAULT false;