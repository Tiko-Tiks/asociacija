-- ==================================================
-- FIX: meeting_quorum_status - Įtraukti nuotoliniu būdu balsavusius
-- ==================================================
-- Problema: Kvorumo skaičiavimas neįtraukia nuotolinių dalyvių
-- Sprendimas: Sumuoti IN_PERSON + REMOTE/WRITTEN dalyvius
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
  SELECT COUNT(*)::int
    INTO v_total
  FROM public.memberships mem
  WHERE mem.org_id = v_org_id
    AND mem.member_status = 'ACTIVE';

  -- Count IN_PERSON attendees (from meeting_attendance)
  SELECT COUNT(*)::int
    INTO v_present_in_person
  FROM public.meeting_attendance ma
  JOIN public.memberships mem ON mem.id = ma.membership_id
  WHERE ma.meeting_id = p_meeting_id
    AND ma.present = true
    AND ma.mode = 'IN_PERSON'
    AND mem.org_id = v_org_id
    AND mem.member_status = 'ACTIVE';

  -- Count REMOTE voters (from meeting_remote_voters - those who expressed intent)
  SELECT COUNT(DISTINCT mrv.membership_id)::int
    INTO v_present_remote
  FROM public.meeting_remote_voters mrv
  JOIN public.memberships mem ON mem.id = mrv.membership_id
  WHERE mrv.meeting_id = p_meeting_id
    AND mem.org_id = v_org_id
    AND mem.member_status = 'ACTIVE';

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

-- Test the fix
-- SELECT * FROM meeting_quorum_status('your-meeting-id-here');

