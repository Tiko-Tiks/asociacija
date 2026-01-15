-- ==================================================
-- MIGRATION: Fix search_path for meeting_quorum_status function
-- ==================================================
-- Date: 2024
-- Issue: Function has mutable search_path (security vulnerability)
-- Fix: Add SET search_path = public, pg_temp
-- ==================================================
-- 
-- This migration fixes the security issue where the function
-- doesn't have an explicit search_path set, which can lead to search path
-- manipulation attacks.
--
-- Function fixed:
-- 1. meeting_quorum_status
-- ==================================================

CREATE OR REPLACE FUNCTION public.meeting_quorum_status(p_meeting_id uuid)
RETURNS TABLE(
  meeting_id uuid,
  org_id uuid,
  total_active_members int,
  present_count int,
  quorum_required int,
  has_quorum boolean,
  reason text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id uuid;
  v_total int;
  v_present_in_person int;
  v_present_remote int;
  v_present_total int;
  v_required int;
BEGIN
  meeting_id := p_meeting_id;

  -- Get org_id from meeting
  SELECT m.org_id
    INTO v_org_id
  FROM public.meetings m
  WHERE m.id = p_meeting_id;

  org_id := v_org_id;

  IF v_org_id IS NULL THEN
    total_active_members := 0;
    present_count := 0;
    quorum_required := 0;
    has_quorum := false;
    reason := 'MEETING_NOT_FOUND';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Count total active members
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT COUNT(*)::int
    INTO v_total
  FROM public.memberships mem
  INNER JOIN public.orgs o ON o.id = mem.org_id
  WHERE mem.org_id = v_org_id
    AND mem.member_status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');

  -- Count IN_PERSON attendees (from meeting_attendance)
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT COUNT(*)::int
    INTO v_present_in_person
  FROM public.meeting_attendance ma
  JOIN public.memberships mem ON mem.id = ma.membership_id
  INNER JOIN public.orgs o ON o.id = mem.org_id
  WHERE ma.meeting_id = p_meeting_id
    AND ma.present = true
    AND ma.mode = 'IN_PERSON'
    AND mem.org_id = v_org_id
    AND mem.member_status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');

  -- Count REMOTE voters (from meeting_remote_voters - those who expressed intent)
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT COUNT(DISTINCT mrv.membership_id)::int
    INTO v_present_remote
  FROM public.meeting_remote_voters mrv
  JOIN public.memberships mem ON mem.id = mrv.membership_id
  INNER JOIN public.orgs o ON o.id = mem.org_id
  WHERE mrv.meeting_id = p_meeting_id
    AND mem.org_id = v_org_id
    AND mem.member_status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');

  -- Total present = IN_PERSON + REMOTE (no double counting)
  -- Note: We rely on the fact that a person can only be in one category
  v_present_total := v_present_in_person + v_present_remote;

  -- Calculate required quorum (50% + 1)
  v_required := (v_total / 2) + 1;

  -- Set return values
  total_active_members := v_total;
  present_count := v_present_total;  -- THIS IS THE FIX: Now includes remote!
  quorum_required := v_required;
  has_quorum := v_present_total >= v_required;
  
  IF has_quorum THEN
    reason := 'QUORUM_MET';
  ELSE
    reason := 'QUORUM_NOT_MET';
  END IF;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.meeting_quorum_status IS 'Kvorumo statusas įtraukiant nuotolinius dalyvius (FIX v18.8.7)';

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================
-- meeting_quorum_status function now has SET search_path = public, pg_temp
-- This prevents search path manipulation attacks
-- ==================================================
