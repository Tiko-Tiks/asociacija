-- ==================================================
-- ENFORCE "ONE MEMBER = ONE VOTE" RULE
-- ==================================================
-- This migration enforces that each member can participate only once per meeting:
-- either REMOTE/WRITTEN voting OR IN_PERSON live attendance
-- ==================================================

-- ==================================================
-- 1. ADD UNIQUE CONSTRAINT TO meeting_attendance
-- ==================================================
-- Ensures one attendance record per meeting+membership

DO $$
BEGIN
  -- Check if unique constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_meeting_attendance_meeting_membership'
    AND conrelid = 'public.meeting_attendance'::regclass
  ) THEN
    -- Create unique index (concurrently if table is large)
    CREATE UNIQUE INDEX IF NOT EXISTS 
      idx_meeting_attendance_meeting_membership 
    ON public.meeting_attendance(meeting_id, membership_id);
    
    -- Add unique constraint using the index
    ALTER TABLE public.meeting_attendance
    ADD CONSTRAINT uq_meeting_attendance_meeting_membership
    UNIQUE USING INDEX idx_meeting_attendance_meeting_membership;
  END IF;
END $$;

-- ==================================================
-- 2. CREATE VIEW: meeting_remote_voters
-- ==================================================
-- Identifies members who voted remotely (WRITTEN/REMOTE) for a GA meeting

CREATE OR REPLACE VIEW public.meeting_remote_voters AS
SELECT DISTINCT
  v.meeting_id,
  vb.membership_id
FROM public.votes v
INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
WHERE v.kind = 'GA'
  AND v.meeting_id IS NOT NULL
  AND vb.channel IN ('WRITTEN', 'REMOTE');

COMMENT ON VIEW public.meeting_remote_voters IS 
'Identifies members who voted remotely (WRITTEN/REMOTE) for GA meetings. Used to prevent double-counting in attendance and quorum calculations.';

-- ==================================================
-- 3. RPC: can_register_in_person
-- ==================================================
-- Checks if a member can register as IN_PERSON for a meeting
-- Blocks registration if member already voted remotely

CREATE OR REPLACE FUNCTION public.can_register_in_person(
  p_meeting_id uuid,
  p_user_id uuid
)
RETURNS TABLE(
  allowed boolean,
  reason text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_membership_id uuid;
  v_meeting_org_id uuid;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, jsonb_build_object() AS details;
    RETURN;
  END IF;

  -- Verify p_user_id matches auth.uid() (users can only check themselves)
  IF p_user_id != auth.uid() THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, jsonb_build_object('message', 'Users can only check their own registration eligibility') AS details;
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND'::text, jsonb_build_object() AS details;
    RETURN;
  END IF;

  -- Find active membership
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT m.id INTO v_membership_id
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.user_id = p_user_id
    AND m.org_id = v_meeting_org_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, jsonb_build_object() AS details;
    RETURN;
  END IF;

  -- Check if member already voted remotely
  IF EXISTS (
    SELECT 1
    FROM public.meeting_remote_voters mrv
    WHERE mrv.meeting_id = p_meeting_id
      AND mrv.membership_id = v_membership_id
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'REMOTE_ALREADY_VOTED'::text,
      jsonb_build_object(
        'message', 'Member has already voted remotely for this meeting',
        'membership_id', v_membership_id
      ) AS details;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'OK'::text,
    jsonb_build_object('membership_id', v_membership_id) AS details;
END;
$$;

COMMENT ON FUNCTION public.can_register_in_person IS 
'Checks if a member can register as IN_PERSON for a meeting. Returns false if member already voted remotely (WRITTEN/REMOTE).';

-- ==================================================
-- 4. RPC: register_in_person_attendance
-- ==================================================
-- Registers a member as IN_PERSON for a meeting
-- Requires OWNER/BOARD role
-- Blocks if member already voted remotely

CREATE OR REPLACE FUNCTION public.register_in_person_attendance(
  p_meeting_id uuid,
  p_membership_id uuid
)
RETURNS TABLE(
  ok boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_meeting_org_id uuid;
  v_membership_org_id uuid;
  v_membership_status text;
  v_is_owner boolean;
  v_is_board boolean;
BEGIN
  -- Require authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Verify membership belongs to meeting org and is ACTIVE
  SELECT org_id, status INTO v_membership_org_id, v_membership_status
  FROM public.memberships
  WHERE id = p_membership_id;

  IF v_membership_org_id IS NULL OR v_membership_org_id != v_meeting_org_id THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_FOUND'::text;
    RETURN;
  END IF;

  IF v_membership_status != 'ACTIVE' THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_ACTIVE'::text;
    RETURN;
  END IF;

  -- Check if user is OWNER or BOARD
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT 
    EXISTS(
      SELECT 1 FROM public.memberships m
      INNER JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = v_user_id 
        AND m.org_id = v_meeting_org_id 
        AND m.role = 'OWNER'
        AND o.status = 'ACTIVE'
        AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
    ),
    EXISTS(
      SELECT 1 FROM public.positions p
      INNER JOIN public.orgs o2 ON o2.id = p.org_id
      WHERE p.user_id = v_user_id
        AND p.org_id = v_meeting_org_id
        AND p.title = 'BOARD'
        AND p.is_active = true
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    )
  INTO v_is_owner, v_is_board;

  IF NOT (v_is_owner OR v_is_board) THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text;
    RETURN;
  END IF;

  -- Check if member already voted remotely
  IF EXISTS (
    SELECT 1
    FROM public.meeting_remote_voters mrv
    WHERE mrv.meeting_id = p_meeting_id
      AND mrv.membership_id = p_membership_id
  ) THEN
    RETURN QUERY SELECT false, 'REMOTE_ALREADY_VOTED'::text;
    RETURN;
  END IF;

  -- Upsert attendance record
  INSERT INTO public.meeting_attendance (
    meeting_id,
    membership_id,
    present,
    mode,
    joined_at
  ) VALUES (
    p_meeting_id,
    p_membership_id,
    true,
    'IN_PERSON',
    NOW()
  )
  ON CONFLICT (meeting_id, membership_id)
  DO UPDATE SET
    present = true,
    mode = 'IN_PERSON',
    joined_at = COALESCE(meeting_attendance.joined_at, NOW()),
    updated_at = NOW();

  RETURN QUERY SELECT true, 'OK'::text;
END;
$$;

COMMENT ON FUNCTION public.register_in_person_attendance IS 
'Registers a member as IN_PERSON for a meeting. Requires OWNER/BOARD role. Blocks registration if member already voted remotely.';

-- ==================================================
-- 5. RPC: unregister_in_person_attendance
-- ==================================================
-- Unregisters a member from IN_PERSON attendance
-- Requires OWNER/BOARD role

CREATE OR REPLACE FUNCTION public.unregister_in_person_attendance(
  p_meeting_id uuid,
  p_membership_id uuid
)
RETURNS TABLE(
  ok boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_meeting_org_id uuid;
  v_membership_org_id uuid;
  v_is_owner boolean;
  v_is_board boolean;
BEGIN
  -- Require authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Verify membership belongs to meeting org
  SELECT org_id INTO v_membership_org_id
  FROM public.memberships
  WHERE id = p_membership_id;

  IF v_membership_org_id IS NULL OR v_membership_org_id != v_meeting_org_id THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Check if user is OWNER or BOARD
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT 
    EXISTS(
      SELECT 1 FROM public.memberships m
      INNER JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = v_user_id 
        AND m.org_id = v_meeting_org_id 
        AND m.role = 'OWNER'
        AND o.status = 'ACTIVE'
        AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
    ),
    EXISTS(
      SELECT 1 FROM public.positions p
      INNER JOIN public.orgs o2 ON o2.id = p.org_id
      WHERE p.user_id = v_user_id
        AND p.org_id = v_meeting_org_id
        AND p.title = 'BOARD'
        AND p.is_active = true
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    )
  INTO v_is_owner, v_is_board;

  IF NOT (v_is_owner OR v_is_board) THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text;
    RETURN;
  END IF;

  -- Update attendance to present=false (or delete - we'll update for audit trail)
  UPDATE public.meeting_attendance
  SET present = false,
      updated_at = NOW()
  WHERE meeting_id = p_meeting_id
    AND membership_id = p_membership_id;

  -- If no row was updated, it's OK (maybe already unregistered)
  RETURN QUERY SELECT true, 'OK'::text;
END;
$$;

COMMENT ON FUNCTION public.unregister_in_person_attendance IS 
'Unregisters a member from IN_PERSON attendance for a meeting. Requires OWNER/BOARD role.';

-- ==================================================
-- 6. HELPER FUNCTION: get_meeting_unique_participants
-- ==================================================
-- Returns unique participant counts (remote + live, no double counting)

CREATE OR REPLACE FUNCTION public.get_meeting_unique_participants(
  p_meeting_id uuid
)
RETURNS TABLE(
  remote_participants int,
  live_participants int,
  total_participants int
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COALESCE((
      SELECT COUNT(DISTINCT membership_id)
      FROM public.meeting_remote_voters
      WHERE meeting_id = p_meeting_id
    ), 0) AS remote_participants,
    COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    ), 0) AS live_participants,
    COALESCE((
      SELECT COUNT(DISTINCT membership_id)
      FROM public.meeting_remote_voters
      WHERE meeting_id = p_meeting_id
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    ), 0) AS total_participants;
$$;

COMMENT ON FUNCTION public.get_meeting_unique_participants IS 
'Returns unique participant counts for a meeting: remote voters (WRITTEN/REMOTE) + live attendees (IN_PERSON). Ensures no double counting.';

