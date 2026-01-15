-- ==================================================
-- SIMPLE VOTE MODULIO RPC FUNKCIJOS
-- ==================================================
-- Visos DB-centrinė logika
-- ==================================================

-- ==================================================
-- 1) can_cast_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.can_cast_simple_vote(
  p_vote_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_vote RECORD;
  v_membership RECORD;
  v_can_vote_result RECORD;
  v_can_vote_exists BOOLEAN;
BEGIN
  -- Check if vote exists and is OPEN
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND', jsonb_build_object('vote_id', p_vote_id);
    RETURN;
  END IF;
  
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_NOT_OPEN', 
      jsonb_build_object('vote_id', p_vote_id, 'status', v_vote.status);
    RETURN;
  END IF;
  
  -- Check if user has ACTIVE membership in the org
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = p_user_id
    AND m.member_status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'NOT_A_MEMBER', 
      jsonb_build_object('org_id', v_vote.org_id, 'user_id', p_user_id);
    RETURN;
  END IF;
  
  -- Check if can_vote function exists and call it
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'can_vote'
  ) INTO v_can_vote_exists;
  
  IF v_can_vote_exists THEN
    -- Call can_vote function (if it exists)
    SELECT * INTO v_can_vote_result
    FROM public.can_vote(v_vote.org_id, p_user_id);
    
    IF NOT v_can_vote_result.allowed THEN
      RETURN QUERY SELECT 
        false, 
        'CAN_VOTE_BLOCKED', 
        jsonb_build_object(
          'org_id', v_vote.org_id,
          'user_id', p_user_id,
          'can_vote_reason', v_can_vote_result.reason,
          'can_vote_details', v_can_vote_result.details
        );
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'OK', 
    jsonb_build_object('vote_id', p_vote_id, 'membership_id', v_membership.id);
END;
$$;

COMMENT ON FUNCTION public.can_cast_simple_vote IS 'Tikrina ar vartotojas gali balsuoti paprastame balsavime';

-- ==================================================
-- 2) cast_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.cast_simple_vote(
  p_vote_id UUID,
  p_choice public.vote_choice
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_can_vote_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Preflight check
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_simple_vote(p_vote_id, v_user_id);
  
  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false, v_can_vote_check.reason;
    RETURN;
  END IF;
  
  -- Get membership_id from can_vote_check details
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  -- Upsert ballot (INSERT ... ON CONFLICT UPDATE)
  INSERT INTO public.simple_vote_ballots (
    vote_id,
    membership_id,
    choice
  )
  VALUES (
    p_vote_id,
    v_membership.id,
    p_choice
  )
  ON CONFLICT (vote_id, membership_id)
  DO UPDATE SET
    choice = EXCLUDED.choice,
    cast_at = NOW();
  
  RETURN QUERY SELECT true, 'CAST';
END;
$$;

COMMENT ON FUNCTION public.cast_simple_vote IS 'Balsuoja paprastame balsavime (upsert)';

-- ==================================================
-- 3) close_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.close_simple_vote(
  p_vote_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  votes_for INT,
  votes_against INT,
  votes_abstain INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_tally RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND', NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if already closed
  IF v_vote.status = 'CLOSED' THEN
    RETURN QUERY SELECT false, 'VOTE_ALREADY_CLOSED', NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_vote.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::INT, NULL::INT, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Get tallies before closing
  SELECT * INTO v_tally
  FROM public.simple_vote_tallies
  WHERE vote_id = p_vote_id;
  
  -- Close vote
  UPDATE public.simple_votes
  SET 
    status = 'CLOSED',
    closed_at = NOW()
  WHERE id = p_vote_id;
  
  RETURN QUERY SELECT 
    true,
    'VOTE_CLOSED',
    COALESCE(v_tally.votes_for, 0),
    COALESCE(v_tally.votes_against, 0),
    COALESCE(v_tally.votes_abstain, 0);
END;
$$;

COMMENT ON FUNCTION public.close_simple_vote IS 'Uždaro paprastą balsavimą (tik OWNER/BOARD)';

-- ==================================================
-- 4) create_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.create_simple_vote(
  p_org_id UUID,
  p_title TEXT,
  p_summary TEXT DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_closes_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  vote_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_new_vote_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = p_org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = p_org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Create vote
  INSERT INTO public.simple_votes (
    org_id,
    title,
    summary,
    details,
    closes_at,
    created_by
  )
  VALUES (
    p_org_id,
    p_title,
    p_summary,
    p_details,
    p_closes_at,
    v_user_id
  )
  RETURNING id INTO v_new_vote_id;
  
  RETURN QUERY SELECT true, 'VOTE_CREATED', v_new_vote_id;
END;
$$;

COMMENT ON FUNCTION public.create_simple_vote IS 'Sukuria paprastą balsavimą (tik OWNER/BOARD)';

-- ==================================================
-- 5) attach_simple_vote_file_metadata
-- ==================================================

CREATE OR REPLACE FUNCTION public.attach_simple_vote_file_metadata(
  p_vote_id UUID,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT DEFAULT NULL,
  p_size_bytes BIGINT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  attachment_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_vote.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Insert attachment metadata
  INSERT INTO public.simple_vote_attachments (
    vote_id,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    uploaded_by
  )
  VALUES (
    p_vote_id,
    p_storage_path,
    p_file_name,
    p_mime_type,
    p_size_bytes,
    v_user_id
  )
  RETURNING id INTO attachment_id;
  
  RETURN QUERY SELECT true, 'ATTACHMENT_ADDED', attachment_id;
END;
$$;

COMMENT ON FUNCTION public.attach_simple_vote_file_metadata IS 'Prideda priedo metaduomenis (tik OWNER/BOARD, failas jau uploadintas į Storage)';

