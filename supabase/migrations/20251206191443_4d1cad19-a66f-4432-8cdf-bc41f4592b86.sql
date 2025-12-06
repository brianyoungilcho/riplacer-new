-- Add unique constraint on user_territories.user_id for upsert to work
ALTER TABLE public.user_territories ADD CONSTRAINT user_territories_user_id_key UNIQUE (user_id);