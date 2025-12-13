-- Drop overly permissive INSERT and UPDATE policies on prospects table
-- Prospects is a shared cache - edge functions (via service role) handle writes
-- Regular authenticated users should only be able to READ

DROP POLICY IF EXISTS "Authenticated users can insert prospects" ON public.prospects;
DROP POLICY IF EXISTS "Authenticated users can update prospects" ON public.prospects;

-- The SELECT policy remains (shared cache is readable by all authenticated users)
-- Service role bypasses RLS, so edge functions can still insert/update