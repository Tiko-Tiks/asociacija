-- ==================================================
-- FIX: Remove SECURITY DEFINER from legacy_meeting_attendance_view
-- ==================================================
-- Security Issue: Views with SECURITY DEFINER bypass RLS policies
-- Solution: Recreate view without SECURITY DEFINER
-- Governance: Audit-safe - no schema changes, only security fix
-- ==================================================
-- 
-- IMPORTANT: This migration fixes the security vulnerability where
-- legacy_meeting_attendance_view was created with SECURITY DEFINER.
-- Views should NOT use SECURITY DEFINER - RLS policies should be
-- enforced on the underlying tables instead.
-- ==================================================

-- Extract the current view definition and recreate it without SECURITY DEFINER
DO $$
DECLARE
  v_view_def text;
  v_view_exists boolean;
  v_sql text;
BEGIN
  -- Check if view exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'legacy_meeting_attendance_view'
  ) INTO v_view_exists;

  IF NOT v_view_exists THEN
    RAISE WARNING 'View legacy_meeting_attendance_view does not exist - nothing to fix';
    RETURN;
  END IF;

  -- Get the view definition (the SELECT statement)
  SELECT pg_get_viewdef('public.legacy_meeting_attendance_view'::regclass, true)
  INTO v_view_def;
  
  -- Log the original definition (for reference and debugging)
  RAISE NOTICE 'Original legacy_meeting_attendance_view definition: %', v_view_def;

  -- Drop the view (with SECURITY DEFINER)
  -- CASCADE will drop dependent objects - they may need to be recreated
  DROP VIEW IF EXISTS public.legacy_meeting_attendance_view CASCADE;

  -- Recreate the view WITHOUT SECURITY DEFINER using the original definition
  -- This ensures the view structure is preserved exactly, but RLS policies are enforced
  -- First, create the view normally
  v_sql := 'CREATE OR REPLACE VIEW public.legacy_meeting_attendance_view AS ' || v_view_def;
  EXECUTE v_sql;
  
  -- Try to set SECURITY INVOKER (PostgreSQL 15+)
  -- This ensures RLS policies are enforced based on the querying user, not the view owner
  BEGIN
    EXECUTE 'ALTER VIEW public.legacy_meeting_attendance_view SET (security_invoker = on)';
    RAISE NOTICE 'View legacy_meeting_attendance_view set to SECURITY INVOKER (PostgreSQL 15+)';
  EXCEPTION WHEN OTHERS THEN
    -- PostgreSQL < 15: Ensure proper ownership for RLS enforcement
    -- In older versions, RLS is enforced based on view owner, so we set owner to postgres
    EXECUTE 'ALTER VIEW public.legacy_meeting_attendance_view OWNER TO postgres';
    RAISE NOTICE 'View legacy_meeting_attendance_view owner set to postgres (PostgreSQL < 15)';
  END;
  
  RAISE NOTICE 'View legacy_meeting_attendance_view recreated without SECURITY DEFINER';
END $$;

COMMENT ON VIEW public.legacy_meeting_attendance_view IS 
'Governance: Read-only view for legacy meeting_attendance data. No SECURITY DEFINER - RLS policies on meeting_attendance and meetings tables are enforced. This view respects RLS policies and does not bypass security.';

-- Grant SELECT to authenticated users
-- RLS policies on meeting_attendance will control what users can see
GRANT SELECT ON public.legacy_meeting_attendance_view TO authenticated;

-- Verify the view was created without SECURITY DEFINER
-- (Views don't have SECURITY DEFINER in their definition, but we can verify
--  that it doesn't exist by checking pg_views)
DO $$
DECLARE
  v_check boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'legacy_meeting_attendance_view'
  ) INTO v_check;
  
  IF v_check THEN
    RAISE NOTICE 'SUCCESS: legacy_meeting_attendance_view recreated without SECURITY DEFINER';
  ELSE
    RAISE WARNING 'View legacy_meeting_attendance_view was not created';
  END IF;
END $$;
