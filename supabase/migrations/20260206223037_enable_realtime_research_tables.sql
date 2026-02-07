-- Enable realtime for research_requests table for live status updates
ALTER TABLE public.research_requests REPLICA IDENTITY FULL;

-- Enable realtime for research_reports table for live report delivery
ALTER TABLE public.research_reports REPLICA IDENTITY FULL;

-- Add tables to realtime publication
-- Note: Using DO block to handle case where tables might already be in publication
DO $$
BEGIN
  -- Add research_requests to realtime if not already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.research_requests;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication, ignore
  END;

  -- Add research_reports to realtime if not already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.research_reports;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication, ignore
  END;
END $$;