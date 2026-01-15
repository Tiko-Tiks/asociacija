-- ==================================================
-- GA HARD MODE - SQL DEPLOYMENT SCRIPT
-- ==================================================
-- Versija: 18.8.6
-- Data: 2025-01-09
-- Autorius: Branduolys AI
-- ==================================================
-- 
-- Šis scriptas įdiegia GA HARD MODE procedūrinį sluoksnį:
-- 1. can_cast_vote - Channel restrictions + Freeze
-- 2. cast_vote - HARD BLOCK enforcement
-- 3. set_vote_live_totals - Agregato balsavimas
--
-- SVARBU:
-- - Tai yra CREATE OR REPLACE funkcijos
-- - Jos perašo esamas funkcijas
-- - Saugus paleisti bet kada (idempotent)
-- - Nepakeičia duomenų, tik funkcijų logiką
-- ==================================================

-- ==================================================
-- ETAPAS 1: can_cast_vote (VARTŲ SARGAS)
-- ==================================================
-- Blokuoja GA + IN_PERSON individualų balsavimą
-- Tikrina freeze momentą
-- Leidžia tik REMOTE ir WRITTEN iki susirinkimo
-- ==================================================

DO $$ BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ETAPAS 1: Updating can_cast_vote...';
  RAISE NOTICE '==================================================';
END $$;

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

DO $$ BEGIN
  RAISE NOTICE '✅ can_cast_vote updated';
END $$;

-- ==================================================
-- ETAPAS 2: cast_vote (HARD BLOCK)
-- ==================================================
-- Antras nepriklausomas barjeras
-- Blokuoja PRIEŠ bet kokį INSERT
-- Net jei can_cast_vote apeitas - sustabdo
-- ==================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ETAPAS 2: Updating cast_vote...';
  RAISE NOTICE '==================================================';
END $$;

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

DO $$ BEGIN
  RAISE NOTICE '✅ cast_vote updated';
END $$;

-- ==================================================
-- ETAPAS 3: set_vote_live_totals (AGREGUOTAS BALSAVIMAS)
-- ==================================================
-- Vienintelis būdas fiksuoti gyvus GA balsus
-- Automatinis live_for_count skaičiavimas
-- Neleidžia neigiamų reikšmių
-- ==================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'ETAPAS 3: Updating set_vote_live_totals...';
  RAISE NOTICE '==================================================';
END $$;

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

DO $$ BEGIN
  RAISE NOTICE '✅ set_vote_live_totals updated';
  RAISE NOTICE '';
END $$;

-- ==================================================
-- PABAIGA
-- ==================================================

DO $$ BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'GA HARD MODE DEPLOYMENT COMPLETE';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Deployed functions:';
  RAISE NOTICE '  ✅ can_cast_vote (VARTŲ SARGAS)';
  RAISE NOTICE '  ✅ cast_vote (HARD BLOCK)';
  RAISE NOTICE '  ✅ set_vote_live_totals (AGREGATAS)';
  RAISE NOTICE '';
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  Run: SELECT pg_get_functiondef(''public.can_cast_vote''::regproc);';
  RAISE NOTICE '  Should see: [GA HARD MODE VARTŲ SARGAS]';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Set GA_MODE environment variable (TEST or PRODUCTION)';
  RAISE NOTICE '  2. Restart application';
  RAISE NOTICE '  3. Test GA meeting creation and voting';
  RAISE NOTICE '';
  RAISE NOTICE 'Documentation: docs/GA_HARD_MODE_IMPLEMENTATION.md';
  RAISE NOTICE '==================================================';
END $$;

