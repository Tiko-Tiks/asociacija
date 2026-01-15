-- ==================================================
-- FIX: Ensure search_path is set for rpc_get_legacy_summary function
-- ==================================================
-- Security Issue: Function may have mutable search_path (security vulnerability)
-- Solution: Recreate function with SET search_path = public, pg_temp
-- Governance: Audit-safe - no schema changes, only security fix
-- ==================================================
-- 
-- IMPORTANT: This migration ensures rpc_get_legacy_summary function has
-- an explicit search_path set, which prevents search path manipulation attacks.
-- Even if the function was created with search_path, this ensures it's correct.
-- ==================================================

-- Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS public.rpc_get_legacy_summary(uuid);

-- Recreate function with explicit search_path
CREATE OR REPLACE FUNCTION public.rpc_get_legacy_summary(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_legacy int;
  v_projects int;
  v_ideas int;
  v_total_planned_eur numeric;
  v_avg_progress numeric;
  v_unique_phases text[];
  v_result jsonb;
BEGIN
  -- Count total legacy resolutions (DRAFT with project.* metadata)
  SELECT COUNT(*) INTO v_total_legacy
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}';
  
  -- Count projects (have project.tag)
  SELECT COUNT(*) INTO v_projects
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' ? 'tag';
  
  -- Count ideas (legacy ideas, typically without project.tag or with specific marker)
  -- Assumption: ideas don't have project.tag, or have a specific structure
  SELECT COUNT(*) INTO v_ideas
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND NOT (metadata -> 'project' ? 'tag');
  
  -- Calculate total planned budget (from project.budget.planned.amount)
  SELECT COALESCE(SUM((metadata -> 'project' -> 'budget' -> 'planned' ->> 'amount')::numeric), 0)
  INTO v_total_planned_eur
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' -> 'budget' -> 'planned' ? 'amount';
  
  -- Calculate average progress (from project.progress)
  SELECT COALESCE(AVG((metadata -> 'project' ->> 'progress')::numeric), 0)
  INTO v_avg_progress
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' ? 'progress';
  
  -- Get unique phases (from project.phase)
  SELECT COALESCE(ARRAY_AGG(DISTINCT metadata -> 'project' ->> 'phase'), ARRAY[]::text[])
  INTO v_unique_phases
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' ? 'phase';
  
  -- Build JSON result
  v_result := jsonb_build_object(
    'org_id', p_org_id,
    'total_legacy', v_total_legacy,
    'projects', v_projects,
    'ideas', v_ideas,
    'total_planned_eur', v_total_planned_eur,
    'avg_progress', COALESCE(v_avg_progress, 0),
    'unique_phases', v_unique_phases
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_get_legacy_summary IS 
'Governance: Returns JSON summary of legacy projects/ideas from resolutions.metadata (project.* namespace). Metadata-only extension, no schema changes. Security: search_path is set to prevent injection attacks.';

GRANT EXECUTE ON FUNCTION public.rpc_get_legacy_summary TO authenticated;

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Verify search_path is set correctly
DO $$
DECLARE
    v_search_path text;
BEGIN
    -- Check rpc_get_legacy_summary
    SELECT pg_get_functiondef(oid) INTO v_search_path
    FROM pg_proc
    WHERE proname = 'rpc_get_legacy_summary'
    AND pronamespace = 'public'::regnamespace;
    
    IF v_search_path LIKE '%SET search_path%' THEN
        RAISE NOTICE 'SUCCESS: rpc_get_legacy_summary has search_path set';
    ELSE
        RAISE WARNING 'rpc_get_legacy_summary does not have search_path set';
    END IF;
END $$;
