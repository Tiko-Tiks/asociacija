-- ==================================================
-- MIGRATION: Fix search_path for SECURITY DEFINER voting functions
-- ==================================================
-- Date: 2024
-- Issue: Functions have mutable search_path (security vulnerability)
-- Fix: Add SET search_path = public, pg_temp to all SECURITY DEFINER functions
-- ==================================================
-- 
-- This migration fixes the security issue where SECURITY DEFINER functions
-- don't have an explicit search_path set, which can lead to search path
-- manipulation attacks.
--
-- Functions fixed:
-- 1. can_cast_vote
-- 2. cast_vote  
-- 3. close_vote
-- 4. apply_vote_outcome
-- ==================================================

-- ==================================================
-- 1) can_cast_vote
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_vote RECORD;
  v_membership RECORD;
  v_ballot_exists BOOLEAN;
  v_can_vote_result RECORD;
  v_can_vote_exists BOOLEAN;
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
  
  -- ==================================================
  -- GA HARD MODE ENFORCEMENT (VARTŲ SARGAS)
  -- ==================================================
  -- GA balsavimai veikia procedūriniu režimu:
  -- 1. NELEIDŽIA IN_PERSON individualaus balsavimo
  -- 2. LEIDŽIA tik REMOTE ir WRITTEN iki freeze momento
  -- 3. Gyvas balsavimas vyksta tik per agreguotą suvedimą
  -- ==================================================
  IF v_vote.kind = 'GA' THEN
    -- 1. Blokuoti bet kokį ne-REMOTE ir ne-WRITTEN kanalą
    IF p_channel NOT IN ('REMOTE', 'WRITTEN') THEN
      RETURN QUERY SELECT 
        false, 
        'GA_CHANNEL_NOT_ALLOWED'::TEXT,
        jsonb_build_object(
          'message', 'GA balsavimai leidžia tik REMOTE arba WRITTEN kanalus iki susirinkimo. Gyvas balsavimas vyksta tik per agreguotą suvedimą (set_vote_live_totals).',
          'vote_kind', v_vote.kind,
          'channel', p_channel,
          'allowed_channels', ARRAY['REMOTE', 'WRITTEN'],
          'ga_hard_mode', true
        );
      RETURN;
    END IF;
    
    -- 2. Patikrinti freeze (jei meeting_id yra)
    -- Freeze = NOW() >= meeting.scheduled_at
    -- Snapshot freeze_at bus naudojamas klientinėje validacijoje
    -- Čia naudojame tiesioginį meeting.scheduled_at patikrinimą
    IF v_vote.meeting_id IS NOT NULL THEN
      DECLARE
        v_meeting_scheduled_at TIMESTAMPTZ;
      BEGIN
        SELECT scheduled_at INTO v_meeting_scheduled_at
        FROM public.meetings
        WHERE id = v_vote.meeting_id;
        
        IF v_meeting_scheduled_at IS NOT NULL AND NOW() >= v_meeting_scheduled_at THEN
          RETURN QUERY SELECT 
            false, 
            'GA_VOTING_FROZEN'::TEXT,
            jsonb_build_object(
              'message', 'Nuotolinis balsavimas užšaldytas. Susirinkimas jau prasidėjo. Balsuoti galima tik gyvai.',
              'vote_kind', v_vote.kind,
              'freeze_at', v_meeting_scheduled_at,
              'ga_hard_mode', true
            );
          RETURN;
        END IF;
      END;
    END IF;
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
  
  -- OWNER visada gali balsuoti - praleidžiame can_vote patikrą
  -- Check if can_vote function exists and call it (governance rules)
  -- BET: OWNER praleidžiame can_vote patikrą
  IF v_membership.role != 'OWNER' THEN
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
      'org_id', v_vote.org_id
    );
END;
$$;

COMMENT ON FUNCTION public.can_cast_vote IS '[GA HARD MODE VARTŲ SARGAS] Tikrina ar vartotojas gali balsuoti rezoliucijos balsavime. OWNER visada gali balsuoti (praleidžia can_vote patikrą). Patikrina narystę, governance taisykles ir ar jau balsavo. GA HARD MODE: (1) Leidžia tik REMOTE/WRITTEN kanalus, (2) Tikrina freeze (NOW >= scheduled_at), (3) Blokuoja individualų gyvą balsavimą.';

-- ==================================================
-- 2) cast_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_vote_id UUID,
  p_choice public.vote_choice,
  p_channel public.vote_channel DEFAULT 'IN_PERSON'
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if vote exists AND get ALL info for validation
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Check if vote is OPEN (basic safety)
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT false, 'VOTE_CLOSED'::TEXT;
    RETURN;
  END IF;
  
  -- ==================================================
  -- GA HARD MODE HARD BLOCK (NEPRIKLAUSOMAS BARJERAS)
  -- ==================================================
  -- Antras nepriklausomas GA HARD MODE barjeras
  -- Net apeinant can_cast_vote - pažeidimai techniškai neįmanomi
  -- KRITINĖ SAUGA: Tikrinama PRIEŠ bet kokį ballot INSERT/UPSERT
  -- ==================================================
  IF v_vote.kind = 'GA' THEN
    -- 1. HARD BLOCK: Tik REMOTE ir WRITTEN kanalai leidžiami
    IF p_channel NOT IN ('REMOTE', 'WRITTEN') THEN
      RETURN QUERY SELECT false, 'GA_CHANNEL_BLOCKED'::TEXT;
      RETURN;
    END IF;
    
    -- 2. FREEZE ENFORCEMENT: Patikrinti ar susirinkimas prasidėjo
    IF v_vote.meeting_id IS NOT NULL THEN
      DECLARE
        v_meeting_scheduled_at TIMESTAMPTZ;
        v_meeting_status TEXT;
      BEGIN
        SELECT scheduled_at, status INTO v_meeting_scheduled_at, v_meeting_status
        FROM public.meetings
        WHERE id = v_vote.meeting_id;
        
        -- Jei susirinkimas jau prasidėjo (NOW >= scheduled_at)
        -- IR channel yra REMOTE/WRITTEN → BLOKUOTI
        IF v_meeting_scheduled_at IS NOT NULL AND NOW() >= v_meeting_scheduled_at THEN
          RETURN QUERY SELECT false, 'GA_VOTING_FROZEN'::TEXT;
          RETURN;
        END IF;
      END;
    END IF;
  END IF;
  
  -- Preflight check using can_cast_vote
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_vote(p_vote_id, v_user_id, p_channel);
  
  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false, v_can_vote_check.reason;
    RETURN;
  END IF;
  
  -- Get membership_id from can_vote_check details
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Insert ballot (upsert - allow changing vote)
  INSERT INTO public.vote_ballots (
    vote_id,
    membership_id,
    choice,
    channel
  )
  VALUES (
    p_vote_id,
    v_membership.id,
    p_choice,
    p_channel
  )
  ON CONFLICT (vote_id, membership_id)
  DO UPDATE SET
    choice = EXCLUDED.choice,
    channel = EXCLUDED.channel,
    cast_at = NOW();
  
  RETURN QUERY SELECT true, 'CAST'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.cast_vote IS '[GA HARD MODE HARD BLOCK] Balsuoja rezoliucijos balsavime. Leidžia keisti balsą (upsert). GA HARD MODE NEPRIKLAUSOMAS BARJERAS: (1) Tikrina channel restrictions PRIEŠ INSERT, (2) Tikrina freeze (NOW >= scheduled_at) PRIEŠ INSERT, (3) Veikia net jei can_cast_vote apeitas. Defense in depth.';

-- ==================================================
-- 3) close_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.close_vote(
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
SET search_path = public, pg_temp
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
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT, NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::TEXT, NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if already closed
  IF v_vote.status = 'CLOSED' THEN
    RETURN QUERY SELECT false, 'VOTE_ALREADY_CLOSED'::TEXT, NULL::INT, NULL::INT, NULL::INT;
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
      RETURN QUERY SELECT false, 'ACCESS_DENIED'::TEXT, NULL::INT, NULL::INT, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Get tallies before closing
  SELECT * INTO v_tally
  FROM public.vote_tallies
  WHERE vote_id = p_vote_id;
  
  -- Close vote
  UPDATE public.votes
  SET 
    status = 'CLOSED',
    closed_at = NOW()
  WHERE id = p_vote_id;
  
  RETURN QUERY SELECT 
    true,
    'VOTE_CLOSED'::TEXT,
    COALESCE(v_tally.votes_for, 0),
    COALESCE(v_tally.votes_against, 0),
    COALESCE(v_tally.votes_abstain, 0);
END;
$$;

COMMENT ON FUNCTION public.close_vote IS 'Uždaro rezoliucijos balsavimą (tik OWNER/BOARD)';

-- ==================================================
-- 4) apply_vote_outcome
-- ==================================================

CREATE OR REPLACE FUNCTION public.apply_vote_outcome(
  p_vote_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  out_vote_id UUID,
  resolution_id UUID,
  outcome TEXT,
  votes_for INT,
  votes_against INT,
  votes_abstain INT,
  updated_rows INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_tally RECORD;
  v_membership RECORD;
  v_outcome TEXT;
  v_updated_count INT := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false, 'AUTH_REQUIRED'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 'VOTE_NOT_FOUND'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
    RETURN;
  END IF;
  
  -- Check if vote is closed
  IF v_vote.status != 'CLOSED' THEN
    RETURN QUERY SELECT 
      false, 'VOTE_NOT_CLOSED'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
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
      RETURN QUERY SELECT 
        false, 'ACCESS_DENIED'::TEXT, 
        NULL::UUID, NULL::UUID, NULL::TEXT, 
        NULL::INT, NULL::INT, NULL::INT, 0;
      RETURN;
    END IF;
  END IF;
  
  -- Get tallies
  SELECT * INTO v_tally
  FROM public.vote_tallies
  WHERE vote_id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 'TALLY_NOT_FOUND'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
    RETURN;
  END IF;
  
  -- Determine outcome based on votes
  -- Simple majority: FOR > AGAINST
  IF v_tally.votes_for > v_tally.votes_against THEN
    v_outcome := 'APPROVED';
  ELSIF v_tally.votes_against > v_tally.votes_for THEN
    v_outcome := 'REJECTED';
  ELSE
    -- Tie or no votes
    v_outcome := 'REJECTED';
  END IF;
  
  -- Update resolution status
  UPDATE public.resolutions
  SET 
    status = v_outcome,
    adopted_at = CASE WHEN v_outcome = 'APPROVED' THEN NOW() ELSE NULL END,
    adopted_by = CASE WHEN v_outcome = 'APPROVED' THEN v_user_id ELSE NULL END
  WHERE id = v_vote.resolution_id
    AND status = 'PROPOSED'; -- Only update if still PROPOSED
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    true,
    'OUTCOME_APPLIED'::TEXT,
    p_vote_id,
    v_vote.resolution_id,
    v_outcome,
    v_tally.votes_for,
    v_tally.votes_against,
    v_tally.votes_abstain,
    v_updated_count;
END;
$$;

COMMENT ON FUNCTION public.apply_vote_outcome IS 'Taiko balsavimo rezultatą rezoliucijai (tik OWNER/BOARD). Atnaujina resolutions.status.';

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================
-- All 4 voting functions now have SET search_path = public, pg_temp
-- This prevents search path manipulation attacks
-- ==================================================
