-- ==================================================
-- CREATE/UPDATE set_vote_live_totals FUNCTION
-- ==================================================
-- Sets live voting totals for a GA vote
-- live_present_count is derived from meeting_attendance (not manually provided)
-- ==================================================

-- Note: This assumes vote_live_totals table exists
-- If it doesn't exist, it should be created first

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
  v_resolution_id uuid;
  v_computed_live_present_count int;
  v_computed_live_for_count int;
  v_vote_exists boolean;
  v_votes_has_metadata boolean;
  v_current_vote_metadata jsonb;
  v_current_resolution_metadata jsonb;
  v_updated_vote_metadata jsonb;
  v_updated_resolution_metadata jsonb;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, 0, 0;
    RETURN;
  END IF;

  -- Get vote, meeting_id, and resolution_id
  SELECT meeting_id, resolution_id INTO v_meeting_id, v_resolution_id
  FROM public.votes
  WHERE id = p_vote_id
    AND kind = 'GA';

  IF v_meeting_id IS NULL THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, 0, 0;
    RETURN;
  END IF;

  -- Check if votes table has metadata column
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'votes'
      AND column_name = 'metadata'
  ) INTO v_votes_has_metadata;

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

  -- ==================================================
  -- SEMANTIC METADATA WRITE (Governance v19.0)
  -- ==================================================
  -- Store semantic layer: fact.* (human input), indicator.* (derived/calculated)
  -- Metadata is semantic layer only - does NOT duplicate table column values
  -- ==================================================
  
  IF v_votes_has_metadata THEN
    -- Store in votes.metadata
    SELECT COALESCE(metadata, '{}'::jsonb) INTO v_current_vote_metadata
    FROM public.votes
    WHERE id = p_vote_id;
    
    -- Update metadata with semantic keys (preserve existing metadata)
    -- Build nested structure: fact.* and indicator.*
    v_updated_vote_metadata := COALESCE(v_current_vote_metadata, '{}'::jsonb);
    -- Set fact.live_against
    v_updated_vote_metadata := jsonb_set(
      v_updated_vote_metadata,
      ARRAY['fact', 'live_against'],
      to_jsonb(p_live_against_count),
      true
    );
    -- Set fact.live_abstain
    v_updated_vote_metadata := jsonb_set(
      v_updated_vote_metadata,
      ARRAY['fact', 'live_abstain'],
      to_jsonb(p_live_abstain_count),
      true
    );
    -- Set indicator.live_present
    v_updated_vote_metadata := jsonb_set(
      v_updated_vote_metadata,
      ARRAY['indicator', 'live_present'],
      to_jsonb(v_computed_live_present_count),
      true
    );
    -- Set indicator.live_for
    v_updated_vote_metadata := jsonb_set(
      v_updated_vote_metadata,
      ARRAY['indicator', 'live_for'],
      to_jsonb(v_computed_live_for_count),
      true
    );
    
    UPDATE public.votes
    SET metadata = v_updated_vote_metadata
    WHERE id = p_vote_id;
  ELSE
    -- Fallback: Store in resolution.metadata
    IF v_resolution_id IS NOT NULL THEN
      SELECT COALESCE(metadata, '{}'::jsonb) INTO v_current_resolution_metadata
      FROM public.resolutions
      WHERE id = v_resolution_id;
      
      -- Update metadata with semantic keys (preserve existing metadata)
      -- Build nested structure: fact.* and indicator.*
      v_updated_resolution_metadata := COALESCE(v_current_resolution_metadata, '{}'::jsonb);
      -- Set fact.live_against
      v_updated_resolution_metadata := jsonb_set(
        v_updated_resolution_metadata,
        ARRAY['fact', 'live_against'],
        to_jsonb(p_live_against_count),
        true
      );
      -- Set fact.live_abstain
      v_updated_resolution_metadata := jsonb_set(
        v_updated_resolution_metadata,
        ARRAY['fact', 'live_abstain'],
        to_jsonb(p_live_abstain_count),
        true
      );
      -- Set indicator.live_present
      v_updated_resolution_metadata := jsonb_set(
        v_updated_resolution_metadata,
        ARRAY['indicator', 'live_present'],
        to_jsonb(v_computed_live_present_count),
        true
      );
      -- Set indicator.live_for
      v_updated_resolution_metadata := jsonb_set(
        v_updated_resolution_metadata,
        ARRAY['indicator', 'live_for'],
        to_jsonb(v_computed_live_for_count),
        true
      );
      
      UPDATE public.resolutions
      SET metadata = v_updated_resolution_metadata
      WHERE id = v_resolution_id;
    END IF;
  END IF;

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
'[GA HARD MODE] Sets live voting totals for a GA vote through AGGREGATED input only. live_present_count is automatically derived from meeting_attendance (IN_PERSON present=true). live_for_count is calculated as (present - against - abstain). Ensures remote voters are not double-counted. This is the ONLY way to record live votes for GA - individual IN_PERSON ballots are blocked. Governance v19.0: Also writes semantic metadata (fact.live_against, fact.live_abstain, indicator.live_present, indicator.live_for) to votes.metadata if available, otherwise to resolution.metadata. Metadata is semantic layer only - does not duplicate table column values.';

