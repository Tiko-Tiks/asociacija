-- ==================================================
-- GA PROTOKOLŲ MODULIO RPC FUNKCIJOS
-- ==================================================
-- Visos DB-centrinė logika
-- ==================================================

-- ==================================================
-- A) build_meeting_protocol_snapshot
-- ==================================================

CREATE OR REPLACE FUNCTION public.build_meeting_protocol_snapshot(
  p_meeting_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_meeting RECORD;
  v_attendance_summary JSONB;
  v_quorum JSONB;
  v_agenda JSONB;
  v_snapshot JSONB;
  v_quorum_function_exists BOOLEAN;
BEGIN
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'MEETING_NOT_FOUND');
  END IF;
  
  -- 1) Meeting meta
  -- Already have v_meeting
  
  -- 2) Attendance summary (using unique participants - no double counting)
  -- Remote participants from vote_ballots (WRITTEN/REMOTE), Live from meeting_attendance (IN_PERSON)
  SELECT jsonb_build_object(
    'present_in_person', COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    ), 0),
    'present_written', COALESCE((
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'WRITTEN'
    ), 0),
    'present_remote', COALESCE((
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'REMOTE'
    ), 0),
    'present_total', (
      SELECT 
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
        ), 0)
    ),
    'total_active_members', (
      SELECT COUNT(*) FROM public.memberships
      WHERE org_id = v_meeting.org_id
      AND member_status = 'ACTIVE'
    )
  ) INTO v_attendance_summary;
  
  -- 3) Quorum
  -- REQUIRE meeting_quorum_status function (source of truth)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'meeting_quorum_status'
  ) INTO v_quorum_function_exists;
  
  IF NOT v_quorum_function_exists THEN
    -- Quorum function is required - return error
    RETURN jsonb_build_object('error', 'QUORUM_FUNCTION_MISSING');
  END IF;
  
  -- Use meeting_quorum_status (source of truth)
  SELECT to_jsonb(q.*) INTO v_quorum
  FROM public.meeting_quorum_status(p_meeting_id) q;
  
  -- 4) Agenda with votes
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_no', ai.item_no,
      'title', ai.title,
      'summary', ai.summary,
      'details', ai.details,
      'resolution_id', ai.resolution_id,
      'resolution', CASE 
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', r.id,
            'title', r.title,
            'status', r.status,
            'adopted_at', r.adopted_at,
            'adopted_by', r.adopted_by,
            'recommended_at', r.recommended_at,
            'recommended_by', r.recommended_by
          )
          FROM public.resolutions r
          WHERE r.id = ai.resolution_id
        )
        ELSE NULL
      END,
      'vote', CASE 
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', v.id,
            'kind', v.kind,
            'status', v.status,
            'opens_at', v.opens_at,
            'closes_at', v.closes_at,
            'closed_at', v.closed_at,
            'tallies', (
              SELECT jsonb_build_object(
                'votes_for', vt.votes_for,
                'votes_against', vt.votes_against,
                'votes_abstain', vt.votes_abstain,
                'votes_total', vt.votes_total
              )
              FROM public.vote_tallies vt
              WHERE vt.vote_id = v.id
            )
          )
          FROM public.votes v
          WHERE v.kind = 'GA'
          AND v.meeting_id = p_meeting_id
          AND v.resolution_id = ai.resolution_id
          LIMIT 1
        )
        ELSE NULL
      END,
      'attachments', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', aa.id,
            'file_name', aa.file_name,
            'storage_path', aa.storage_path,
            'mime_type', aa.mime_type,
            'size_bytes', aa.size_bytes
          )
        )
        FROM public.meeting_agenda_attachments aa
        WHERE aa.agenda_item_id = ai.id
      )
    )
    ORDER BY ai.item_no
  ) INTO v_agenda
  FROM public.meeting_agenda_items ai
  WHERE ai.meeting_id = p_meeting_id;
  
  -- Build final snapshot
  SELECT jsonb_build_object(
    'meeting', jsonb_build_object(
      'id', v_meeting.id,
      'org_id', v_meeting.org_id,
      'title', v_meeting.title,
      'scheduled_at', v_meeting.scheduled_at,
      'location', v_meeting.location,
      'meeting_type', v_meeting.meeting_type,
      'status', v_meeting.status,
      'published_at', v_meeting.published_at,
      'notice_days', v_meeting.notice_days
    ),
    'attendance', v_attendance_summary,
    'quorum', v_quorum,
    'agenda', COALESCE(v_agenda, '[]'::jsonb),
    'generated_at', NOW()
  ) INTO v_snapshot;
  
  RETURN v_snapshot;
END;
$$;

COMMENT ON FUNCTION public.build_meeting_protocol_snapshot IS 'Surenka visą protokolo turinį iš gyvų DB duomenų';

-- ==================================================
-- B) preview_meeting_protocol
-- ==================================================

CREATE OR REPLACE FUNCTION public.preview_meeting_protocol(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  snapshot JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_snapshot JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' THEN
    RETURN QUERY SELECT false, 'NOT_GA_MEETING', NULL::JSONB;
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
      RETURN QUERY SELECT false, 'FORBIDDEN', NULL::JSONB;
      RETURN;
    END IF;
  END IF;
  
  -- Build snapshot
  v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
  
  -- Check if snapshot build failed (e.g. QUORUM_FUNCTION_MISSING)
  IF v_snapshot ? 'error' THEN
    RETURN QUERY SELECT false, (v_snapshot->>'error')::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'OK_PREVIEW', v_snapshot;
END;
$$;

COMMENT ON FUNCTION public.preview_meeting_protocol IS 'Peržiūrėti protokolą (tik OWNER/BOARD, nekuria įrašo)';

-- ==================================================
-- C) finalize_meeting_protocol
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
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' THEN
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
    -- This ensures resolution status is updated (APPROVED/RECOMMENDED) and adopted_at/by are set
    SELECT * INTO v_apply_result
    FROM public.apply_vote_outcome(v_vote.id);
    
    -- Note: apply_vote_outcome may return ok=false if outcome already applied
    -- That's fine - we continue to build snapshot which will reflect current resolution status
  END LOOP;
  
  -- Build snapshot AFTER applying all vote outcomes
  -- Snapshot will reflect updated resolution status (APPROVED) and adopted_at/by
  v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
  
  -- Check if snapshot build failed (e.g. QUORUM_FUNCTION_MISSING)
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
  
  -- Get next version
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.meeting_protocols
  WHERE meeting_id = p_meeting_id;
  
  -- Generate protocol number (simple: org_id prefix + version)
  -- You can customize this logic
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
  
  -- Optional: set meeting status to COMPLETED
  UPDATE public.meetings
  SET status = 'COMPLETED'
  WHERE id = p_meeting_id
  AND status IN ('PUBLISHED', 'DRAFT');
  
  RETURN QUERY SELECT 
    true,
    'PROTOCOL_FINALIZED',
    v_new_protocol_id,
    v_version,
    v_protocol_number,
    v_hash;
END;
$$;

COMMENT ON FUNCTION public.finalize_meeting_protocol IS 'Finalizuoti protokolą (tik OWNER/BOARD, reikalauja visų GA votes CLOSED)';

-- ==================================================
-- D) get_meeting_protocol
-- ==================================================

CREATE OR REPLACE FUNCTION public.get_meeting_protocol(
  p_protocol_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_protocol RECORD;
  v_user_id UUID;
  v_membership RECORD;
BEGIN
  -- Get current user (optional, for RLS check)
  v_user_id := auth.uid();
  
  -- Get protocol
  SELECT * INTO v_protocol
  FROM public.meeting_protocols
  WHERE id = p_protocol_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROTOCOL_NOT_FOUND');
  END IF;
  
  -- RLS check: Members can only see FINAL, OWNER/BOARD can see DRAFT/FINAL
  IF v_protocol.status = 'DRAFT' THEN
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('error', 'AUTH_REQUIRED');
    END IF;
    
    -- Check if user is OWNER or BOARD
    SELECT * INTO v_membership
    FROM public.memberships
    WHERE org_id = v_protocol.org_id
      AND user_id = v_user_id
      AND member_status = 'ACTIVE'
      AND role = 'OWNER'
    LIMIT 1;
    
    IF NOT FOUND THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.positions
        WHERE org_id = v_protocol.org_id
          AND user_id = v_user_id
          AND is_active = true
          AND title ILIKE '%BOARD%'
      ) THEN
        RETURN jsonb_build_object('error', 'FORBIDDEN');
      END IF;
    END IF;
  END IF;
  
  -- Return protocol with meta
  RETURN jsonb_build_object(
    'id', v_protocol.id,
    'org_id', v_protocol.org_id,
    'meeting_id', v_protocol.meeting_id,
    'protocol_number', v_protocol.protocol_number,
    'version', v_protocol.version,
    'status', v_protocol.status,
    'snapshot', v_protocol.snapshot,
    'snapshot_hash', v_protocol.snapshot_hash,
    'pdf_bucket', v_protocol.pdf_bucket,
    'pdf_path', v_protocol.pdf_path,
    'created_at', v_protocol.created_at,
    'finalized_at', v_protocol.finalized_at
  );
END;
$$;

COMMENT ON FUNCTION public.get_meeting_protocol IS 'Gauna protokolą (nariams tik FINAL, adminams DRAFT/FINAL)';

