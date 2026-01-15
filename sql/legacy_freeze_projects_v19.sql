-- LEGACY PROJECTS FREEZE — v19.0
-- Purpose: Freeze legacy Projects module as READ-ONLY
-- Governance: v19.0 CODE FREEZE compliant

-- 1. projects table
REVOKE INSERT, UPDATE, DELETE ON public.projects FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.projects FROM anon;

COMMENT ON TABLE public.projects IS
'LEGACY (v17–v18): Read-only. Projects v19.0+ are derived from APPROVED resolutions metadata.';

-- 2. project_contributions table (if exists)
REVOKE INSERT, UPDATE, DELETE ON public.project_contributions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.project_contributions FROM anon;

COMMENT ON TABLE public.project_contributions IS
'LEGACY (v17–v18): Read-only. Superseded by v19.0 Projects Registry.';

-- 3. project_funding_totals (table or view)
REVOKE INSERT, UPDATE, DELETE ON public.project_funding_totals FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.project_funding_totals FROM anon;

COMMENT ON TABLE public.project_funding_totals IS
'LEGACY (v17–v18): Read-only. Financial indicators move to resolutions.metadata.indicator.*';
