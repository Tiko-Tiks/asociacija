-- ==================================================
-- FIX: Protocol number should be sequential per org per year
-- ==================================================
-- Problema: protocol_number = YYYY-0001 kiekvienam susirinkimui
-- Teisingas: protocol_number = YYYY-XXXX kur XXXX didėja per org per metus
-- ==================================================

DROP FUNCTION IF EXISTS public.finalize_meeting_protocol(uuid);

CREATE OR REPLACE FUNCTION public.finalize_meeting_protocol(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  protocol_id UUID,
  protocol_version INT,
  protocol_number TEXT,
  snapshot_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_snapshot JSONB;
  v_hash TEXT;
  v_version INT;
  v_protocol_number TEXT;
  v_new_protocol_id UUID;
  v_agenda_item RECORD;
  v_vote RECORD;
  v_apply_result RECORD;
  v_current_year TEXT;
  v_year_sequence INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    ok := false; reason := 'AUTH_REQUIRED'; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
    RETURN NEXT; RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    ok := false; reason := 'MEETING_NOT_FOUND'; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
    RETURN NEXT; RETURN;
  END IF;
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' THEN
    ok := false; reason := 'NOT_GA_MEETING'; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
    RETURN NEXT; RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_meeting.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      ok := false; reason := 'FORBIDDEN'; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
      RETURN NEXT; RETURN;
    END IF;
  END IF;
  
  -- Check if meeting_quorum_status function exists (required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'meeting_quorum_status'
  ) THEN
    ok := false; reason := 'QUORUM_FUNCTION_MISSING'; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
    RETURN NEXT; RETURN;
  END IF;
  
  -- Check if apply_vote_outcome function exists (required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'apply_vote_outcome'
  ) THEN
    ok := false; reason := 'APPLY_VOTE_OUTCOME_FUNCTION_MISSING'; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
    RETURN NEXT; RETURN;
  END IF;
  
  -- Validate: all GA votes for resolution items must be CLOSED
  -- AND apply outcome BEFORE building snapshot
  FOR v_agenda_item IN
    SELECT * FROM public.meeting_agenda_items
    WHERE meeting_id = p_meeting_id
    AND resolution_id IS NOT NULL
  LOOP
    -- Find GA vote by (meeting_id, resolution_id, kind='GA')
    SELECT * INTO v_vote
    FROM public.votes
    WHERE kind = 'GA'
    AND meeting_id = p_meeting_id
    AND resolution_id = v_agenda_item.resolution_id
    LIMIT 1;
    
    IF NOT FOUND THEN
      ok := false; reason := 'VOTE_NOT_FOUND: item_no=' || v_agenda_item.item_no; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
      RETURN NEXT; RETURN;
    END IF;
    
    -- Require vote.status='CLOSED'
    IF v_vote.status != 'CLOSED' THEN
      ok := false; reason := 'VOTE_NOT_CLOSED: item_no=' || v_agenda_item.item_no; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
      RETURN NEXT; RETURN;
    END IF;
    
    -- MUST call apply_vote_outcome BEFORE building snapshot
    SELECT * INTO v_apply_result
    FROM public.apply_vote_outcome(v_vote.id);
  END LOOP;
  
  -- Build snapshot AFTER applying all vote outcomes
  v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
  
  -- Check if snapshot build failed
  IF v_snapshot ? 'error' THEN
    ok := false; reason := v_snapshot->>'error'; protocol_id := NULL; protocol_version := NULL; protocol_number := NULL; snapshot_hash := NULL;
    RETURN NEXT; RETURN;
  END IF;
  
  -- Calculate hash using md5 (built-in PostgreSQL function)
  v_hash := md5(v_snapshot::TEXT);
  
  -- Get next version FOR THIS MEETING (for versioning same meeting protocols)
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.meeting_protocols
  WHERE meeting_id = p_meeting_id;
  
  -- =====================================================
  -- FIX: Protocol number should be sequential per ORG per YEAR
  -- Count all protocols for this org in current year
  -- =====================================================
  v_current_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN protocol_number LIKE v_current_year || '-%' 
      THEN CAST(SUBSTRING(protocol_number FROM 6) AS INT)
      ELSE 0 
    END
  ), 0) + 1 INTO v_year_sequence
  FROM public.meeting_protocols
  WHERE org_id = v_meeting.org_id
    AND protocol_number LIKE v_current_year || '-%';
  
  -- Generate protocol number: YYYY-XXXX (sequential per org per year)
  v_protocol_number := v_current_year || '-' || LPAD(v_year_sequence::TEXT, 4, '0');
  
  -- Create protocol
  INSERT INTO public.meeting_protocols (
    org_id,
    meeting_id,
    protocol_number,
    version,
    status,
    snapshot,
    snapshot_hash,
    created_by,
    finalized_by,
    finalized_at
  )
  VALUES (
    v_meeting.org_id,
    p_meeting_id,
    v_protocol_number,
    v_version,
    'FINAL',
    v_snapshot,
    v_hash,
    v_user_id,
    v_user_id,
    NOW()
  )
  RETURNING id INTO v_new_protocol_id;
  
  -- Set meeting status to COMPLETED
  UPDATE public.meetings
  SET status = 'COMPLETED'
  WHERE id = p_meeting_id;
  
  ok := true;
  reason := 'OK';
  protocol_id := v_new_protocol_id;
  protocol_version := v_version;
  protocol_number := v_protocol_number;
  snapshot_hash := v_hash;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.finalize_meeting_protocol IS 'Finalizuoti protokolą (naudoja sequential numeraciją per org per metus - FIX v18.8.8)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.finalize_meeting_protocol TO authenticated;

