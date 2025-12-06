-- Add unique constraint on place_id for prospects table
ALTER TABLE prospects ADD CONSTRAINT prospects_place_id_unique UNIQUE (place_id);

-- Add unique constraint on user_id + prospect_id for user_leads table
ALTER TABLE user_leads ADD CONSTRAINT user_leads_user_prospect_unique UNIQUE (user_id, prospect_id);