-- ==================================================
-- Fix: Prevent Re-finalization of Protocols
-- ==================================================
-- Once a protocol is finalized, it should not be possible to finalize again.
-- ==================================================

CREATE OR REPLACE FUNCTION public.finalize_meeting_protocol(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  protocol_id UUID,
  version INT,
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
  v_existing_final_protocol RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- ============================================================
  -- NEW: Check if meeting already has a FINAL protocol
  -- ============================================================
  SELECT * INTO v_existing_final_protocol
  FROM public.meeting_protocols
  WHERE meeting_id = p_meeting_id
    AND status = 'FINAL'
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'ALREADY_FINALIZED'::TEXT,
      v_existing_final_protocol.id,
      v_existing_final_protocol.version,
      v_existing_final_protocol.protocol_number,
      v_existing_final_protocol.snapshot_hash;
    RETURN;
  END IF;
  
  -- ============================================================
  -- NEW: Check if meeting is already COMPLETED
  -- ============================================================
  IF v_meeting.status = 'COMPLETED' THEN
    RETURN QUERY SELECT 
      false, 
      'MEETING_ALREADY_COMPLETED'::TEXT,
      NULL::UUID, 
      NULL::INT, 
      NULL::TEXT, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' AND v_meeting.meeting_type != 'GA_EXTRAORDINARY' THEN
    RETURN QUERY SELECT false, 'NOT_GA_MEETING', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
    RETURN;
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
      RETURN QUERY SELECT false, 'FORBIDDEN', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check if meeting_quorum_status function exists (required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'meeting_quorum_status'
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'QUORUM_FUNCTION_MISSING'::TEXT,
      NULL::UUID, 
      NULL::INT, 
      NULL::TEXT, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if apply_vote_outcome function exists (required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'apply_vote_outcome'
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'APPLY_VOTE_OUTCOME_FUNCTION_MISSING'::TEXT,
      NULL::UUID, 
      NULL::INT, 
      NULL::TEXT, 
      NULL::TEXT;
    RETURN;
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
      RETURN QUERY SELECT 
        false, 
        ('VOTE_NOT_FOUND: item_no=' || v_agenda_item.item_no || ', resolution_id=' || v_agenda_item.resolution_id)::TEXT,
        NULL::UUID, 
        NULL::INT, 
        NULL::TEXT, 
        NULL::TEXT;
      RETURN;
    END IF;
    
    -- Require vote.status='CLOSED'
    IF v_vote.status != 'CLOSED' THEN
      RETURN QUERY SELECT 
        false, 
        ('VOTE_NOT_CLOSED: item_no=' || v_agenda_item.item_no || ', resolution_id=' || v_agenda_item.resolution_id)::TEXT,
        NULL::UUID, 
        NULL::INT, 
        NULL::TEXT, 
        NULL::TEXT;
      RETURN;
    END IF;
    
    -- MUST call apply_vote_outcome BEFORE building snapshot
    SELECT * INTO v_apply_result
    FROM public.apply_vote_outcome(v_vote.id);
  END LOOP;
  
  -- Build snapshot AFTER applying all vote outcomes
  v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
  
  -- Check if snapshot build failed
  IF v_snapshot ? 'error' THEN
    RETURN QUERY SELECT 
      false, 
      (v_snapshot->>'error')::TEXT,
      NULL::UUID, 
      NULL::INT, 
      NULL::TEXT, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Calculate hash
  v_hash := encode(digest(v_snapshot::TEXT, 'sha256'), 'hex');
  
  -- Version is always 1 (no re-finalization allowed)
  v_version := 1;
  
  -- Generate protocol number
  v_protocol_number := TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_version::TEXT, 4, '0');
  
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
  
  RETURN QUERY SELECT 
    true,
    'PROTOCOL_FINALIZED',
    v_new_protocol_id,
    v_version,
    v_protocol_number,
    v_hash;
END;
$$;

COMMENT ON FUNCTION public.finalize_meeting_protocol IS 'Finalizuoja protokolą (tik kartą per susirinkimą, po to užrakinta)';
