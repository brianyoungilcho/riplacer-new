-- Enable realtime for agent_memory table for live progress updates
ALTER TABLE public.agent_memory REPLICA IDENTITY FULL;

-- Add agent_memory to realtime publication
-- Note: Using DO block to handle case where tables might already be in publication
DO $$
BEGIN
  -- Add agent_memory to realtime if not already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_memory;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication, ignore
  END;
END $$;

-- Add service-role INSERT policy for agent_memory
-- This allows the edge function (using service role) to insert agent memory records
CREATE POLICY "Service role can insert agent memory"
  ON agent_memory
  FOR INSERT
  TO service_role
  WITH CHECK (true);