
-- Drop permissive public policies
DROP POLICY IF EXISTS "Anyone can read audits" ON public.audits;
DROP POLICY IF EXISTS "Public can insert valid audits" ON public.audits;
DROP POLICY IF EXISTS "Anyone can read scores" ON public.audit_scores;
DROP POLICY IF EXISTS "Public can insert valid scores" ON public.audit_scores;

-- Revoke anon/authenticated privileges; server uses service_role (bypasses RLS)
REVOKE ALL ON public.audits FROM anon, authenticated;
REVOKE ALL ON public.audit_scores FROM anon, authenticated;

-- Keep service_role grants explicit
GRANT ALL ON public.audits TO service_role;
GRANT ALL ON public.audit_scores TO service_role;

-- Ensure RLS remains enabled (no policies = deny for non-superuser roles)
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_scores ENABLE ROW LEVEL SECURITY;
