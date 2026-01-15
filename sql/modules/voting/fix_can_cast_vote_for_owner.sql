-- ==================================================
-- FIX: can_cast_vote - OWNER visada gali balsuoti
-- ==================================================
-- Problema: OWNER negali balsuoti, nes can_vote funkcija
-- gali blokuoti arba narystės patikra neveikia teisingai
-- ==================================================

CREATE OR REPLACE FUNCTION public.can_cast_vote(
  p_vote_id UUID,
  p_user_id UUID,
  p_channel public.vote_channel DEFAULT 'IN_PERSON'
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
  v_ballot_exists BOOLEAN;
  v_can_vote_result RECORD;
  v_can_vote_exists BOOLEAN;
  v_is_owner BOOLEAN := false;
BEGIN
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_NOT_FOUND'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id);
    RETURN;
  END IF;
  
  -- Check if vote is OPEN
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_CLOSED'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id, 'status', v_vote.status);
    RETURN;
  END IF;
  
  -- Check if vote has closed (closes_at)
  IF v_vote.closes_at IS NOT NULL AND now() >= v_vote.closes_at THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_CLOSED'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id, 'closes_at', v_vote.closes_at);
    RETURN;
  END IF;
  
  -- Check if user has ACTIVE membership in the org
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = p_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'NOT_A_MEMBER'::TEXT, 
      jsonb_build_object(
        'org_id', v_vote.org_id, 
        'user_id', p_user_id,
        'message', 'Vartotojas neturi aktyvios narystės organizacijoje'
      );
    RETURN;
  END IF;
  
  -- Check if user is OWNER - OWNER visada gali balsuoti
  IF v_membership.role = 'OWNER' THEN
    v_is_owner := true;
  END IF;
  
  -- Check if can_vote function exists and call it (governance rules)
  -- BET: OWNER praleidžiame can_vote patikrą
  IF NOT v_is_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'can_vote'
    ) INTO v_can_vote_exists;
    
    IF v_can_vote_exists THEN
      -- Call can_vote function (if it exists) - checks governance rules
      SELECT * INTO v_can_vote_result
      FROM public.can_vote(v_vote.org_id, p_user_id);
      
      IF NOT v_can_vote_result.allowed THEN
        RETURN QUERY SELECT 
          false, 
          'CAN_VOTE_BLOCKED'::TEXT, 
          jsonb_build_object(
            'org_id', v_vote.org_id,
            'user_id', p_user_id,
            'can_vote_reason', v_can_vote_result.reason,
            'can_vote_details', v_can_vote_result.details
          );
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- Check if already voted
  SELECT EXISTS (
    SELECT 1 FROM public.vote_ballots
    WHERE vote_id = p_vote_id
      AND membership_id = v_membership.id
  ) INTO v_ballot_exists;
  
  IF v_ballot_exists THEN
    RETURN QUERY SELECT 
      false, 
      'ALREADY_VOTED'::TEXT, 
      jsonb_build_object('membership_id', v_membership.id);
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'OK'::TEXT, 
    jsonb_build_object(
      'vote_id', p_vote_id, 
      'membership_id', v_membership.id,
      'org_id', v_vote.org_id,
      'is_owner', v_is_owner
    );
END;
$$;

COMMENT ON FUNCTION public.can_cast_vote IS 'Tikrina ar vartotojas gali balsuoti rezoliucijos balsavime. OWNER visada gali balsuoti (praleidžia can_vote patikrą).';

