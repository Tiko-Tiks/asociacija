-- ==================================================
-- MIGRATION: Fix search_path for set_vote_live_totals function
-- ==================================================
-- Date: 2024
-- Issue: Function has mutable search_path (security vulnerability)
-- Fix: Add SET search_path = public, pg_temp
-- ==================================================
-- 
-- This migration fixes the security issue where the SECURITY DEFINER function
-- doesn't have an explicit search_path set, which can lead to search path
-- manipulation attacks.
--
-- Function fixed:
-- 1. set_vote_live_totals
-- ==================================================

CREATE OR REPLACE FUNCTION public.set_vote_live_totals(
  p_vote_id uuid,
  p_live_against_count int,
  p_live_abstain_count int
)
RETURNS TABLE(
  ok boolean,
  reason text,
  live_present_count int,
  live_for_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_meeting_id uuid;
  v_computed_live_present_count int;
  v_computed_live_for_count int;
  v_vote_exists boolean;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, 0, 0;
    RETURN;
  END IF;

  -- Get vote and meeting_id
  SELECT meeting_id INTO v_meeting_id
  FROM public.votes
  WHERE id = p_vote_id
    AND kind = 'GA';

  IF v_meeting_id IS NULL THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, 0, 0;
    RETURN;
  END IF;

  -- Derive live_present_count from meeting_attendance
  -- This ensures remote voters are not double-counted (they're blocked from IN_PERSON registration)
  SELECT COUNT(*) INTO v_computed_live_present_count
  FROM public.meeting_attendance
  WHERE meeting_id = v_meeting_id
    AND present = true
    AND mode = 'IN_PERSON';

  -- Calculate live_for_count (must be >= 0)
  v_computed_live_for_count := v_computed_live_present_count - p_live_against_count - p_live_abstain_count;

  IF v_computed_live_for_count < 0 THEN
    RETURN QUERY SELECT 
      false, 
      'INVALID_TOTALS'::text,
      v_computed_live_present_count,
      v_computed_live_for_count;
    RETURN;
  END IF;

  -- Check if vote_live_totals table exists and insert/update
  -- Note: This assumes the table structure exists
  -- If table doesn't exist, this will fail and should be handled separately
  
  -- Try to insert/update (assuming table exists)
  INSERT INTO public.vote_live_totals (
    vote_id,
    live_present_count,
    live_for_count,
    live_against_count,
    live_abstain_count,
    updated_at
  ) VALUES (
    p_vote_id,
    v_computed_live_present_count,
    v_computed_live_for_count,
    p_live_against_count,
    p_live_abstain_count,
    NOW()
  )
  ON CONFLICT (vote_id)
  DO UPDATE SET
    live_present_count = v_computed_live_present_count,
    live_for_count = v_computed_live_for_count,
    live_against_count = p_live_against_count,
    live_abstain_count = p_live_abstain_count,
    updated_at = NOW();

  RETURN QUERY SELECT 
    true, 
    'OK'::text,
    v_computed_live_present_count,
    v_computed_live_for_count;
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist - return error
    RETURN QUERY SELECT false, 'TABLE_NOT_FOUND'::text, 0, 0;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'OPERATION_FAILED'::text, 0, 0;
END;
$$;

COMMENT ON FUNCTION public.set_vote_live_totals IS 
'[GA HARD MODE] Sets live voting totals for a GA vote through AGGREGATED input only. live_present_count is automatically derived from meeting_attendance (IN_PERSON present=true). live_for_count is calculated as (present - against - abstain). Ensures remote voters are not double-counted. This is the ONLY way to record live votes for GA - individual IN_PERSON ballots are blocked.';

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================
-- set_vote_live_totals function now has SET search_path = public, pg_temp
-- This prevents search path manipulation attacks
-- ==================================================
