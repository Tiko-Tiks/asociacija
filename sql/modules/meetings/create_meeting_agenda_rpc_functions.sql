-- ==================================================
-- GA SUSIRINKIMO MODULIO RPC FUNKCIJOS
-- ==================================================
-- Visos DB-centrinė logika
-- ==================================================

-- ==================================================
-- A) get_governance_int
-- ==================================================

CREATE OR REPLACE FUNCTION public.get_governance_int(
  p_org_id UUID,
  p_key TEXT,
  p_default_int INT
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_value TEXT;
  v_int_value INT;
BEGIN
  -- Get value from governance_configs.answers
  SELECT gc.answers->>p_key INTO v_value
  FROM public.governance_configs gc
  WHERE gc.org_id = p_org_id
  LIMIT 1;
  
  -- If not found or null, return default
  IF v_value IS NULL THEN
    RETURN p_default_int;
  END IF;
  
  -- Try to cast to int
  BEGIN
    v_int_value := v_value::INT;
    RETURN v_int_value;
  EXCEPTION
    WHEN OTHERS THEN
      -- If cast fails, return default
      RETURN p_default_int;
  END;
END;
$$;

COMMENT ON FUNCTION public.get_governance_int IS 'Gauna int reikšmę iš governance_configs.answers pagal key, jei nėra - grąžina default';

-- ==================================================
-- B) can_schedule_meeting
-- ==================================================

CREATE OR REPLACE FUNCTION public.can_schedule_meeting(
  p_org_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  earliest_allowed TIMESTAMPTZ,
  notice_days INT,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_notice_days INT;
  v_earliest_allowed TIMESTAMPTZ;
BEGIN
  -- Get notice_days from governance config
  v_notice_days := public.get_governance_int(p_org_id, 'meeting_notice_days', 14);
  
  -- Calculate earliest allowed date
  v_earliest_allowed := NOW() + make_interval(days => v_notice_days);
  
  -- Check if scheduled_at is allowed
  IF p_scheduled_at >= v_earliest_allowed THEN
    RETURN QUERY SELECT 
      true,
      'OK'::TEXT,
      v_earliest_allowed,
      v_notice_days,
      jsonb_build_object(
        'scheduled_at', p_scheduled_at,
        'notice_days', v_notice_days,
        'earliest_allowed', v_earliest_allowed
      );
  ELSE
    RETURN QUERY SELECT 
      false,
      'NOTICE_TOO_SHORT'::TEXT,
      v_earliest_allowed,
      v_notice_days,
      jsonb_build_object(
        'scheduled_at', p_scheduled_at,
        'notice_days', v_notice_days,
        'earliest_allowed', v_earliest_allowed,
        'days_short', EXTRACT(DAY FROM (v_earliest_allowed - p_scheduled_at))::INT
      );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.can_schedule_meeting IS 'Tikrina ar susirinkimas gali būti suplanuotas pagal notice_days taisyklę';

-- ==================================================
-- C) create_meeting_ga
-- ==================================================

CREATE OR REPLACE FUNCTION public.create_meeting_ga(
  p_org_id UUID,
  p_title TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_location TEXT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  meeting_id UUID,
  earliest_allowed TIMESTAMPTZ,
  notice_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_schedule_check RECORD;
  v_new_meeting_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID, NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or has BOARD position
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = p_org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  -- If not OWNER, check BOARD position
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions p2
      INNER JOIN public.orgs o2 ON o2.id = p2.org_id
      WHERE p2.org_id = p_org_id
        AND p2.user_id = v_user_id
        AND p2.is_active = true
        AND p2.title ILIKE '%BOARD%'
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID, NULL::TIMESTAMPTZ, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(p_org_id, p_scheduled_at);
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false, 
      v_schedule_check.reason,
      NULL::UUID,
      v_schedule_check.earliest_allowed,
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Create meeting
  INSERT INTO public.meetings (
    org_id,
    title,
    scheduled_at,
    location,
    meeting_type,
    status,
    created_by
  )
  VALUES (
    p_org_id,
    p_title,
    p_scheduled_at,
    p_location,
    'GA',
    'DRAFT',
    v_user_id
  )
  RETURNING id INTO v_new_meeting_id;
  
  RETURN QUERY SELECT 
    true,
    'MEETING_CREATED',
    v_new_meeting_id,
    v_schedule_check.earliest_allowed,
    v_schedule_check.notice_days;
END;
$$;

COMMENT ON FUNCTION public.create_meeting_ga IS 'Sukuria GA susirinkimą su scheduling validacija';

-- ==================================================
-- D) update_meeting_schedule
-- ==================================================

CREATE OR REPLACE FUNCTION public.update_meeting_schedule(
  p_meeting_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_location TEXT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  earliest_allowed TIMESTAMPTZ,
  notice_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_schedule_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT (can only update DRAFT)
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions p2
      INNER JOIN public.orgs o2 ON o2.id = p2.org_id
      WHERE p2.org_id = v_meeting.org_id
        AND p2.user_id = v_user_id
        AND p2.is_active = true
        AND p2.title ILIKE '%BOARD%'
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::TIMESTAMPTZ, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(v_meeting.org_id, p_scheduled_at);
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false, 
      v_schedule_check.reason,
      v_schedule_check.earliest_allowed,
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Update meeting
  UPDATE public.meetings
  SET 
    scheduled_at = p_scheduled_at,
    location = COALESCE(p_location, location)
  WHERE id = p_meeting_id;
  
  RETURN QUERY SELECT 
    true,
    'MEETING_UPDATED',
    v_schedule_check.earliest_allowed,
    v_schedule_check.notice_days;
END;
$$;

COMMENT ON FUNCTION public.update_meeting_schedule IS 'Atnaujina susirinkimo datą ir vietą (tik DRAFT status)';

-- ==================================================
-- E) add_agenda_item
-- ==================================================

CREATE OR REPLACE FUNCTION public.add_agenda_item(
  p_meeting_id UUID,
  p_item_no INT,
  p_title TEXT,
  p_summary TEXT DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_resolution_id UUID DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  agenda_item_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions p2
      INNER JOIN public.orgs o2 ON o2.id = p2.org_id
      WHERE p2.org_id = v_meeting.org_id
        AND p2.user_id = v_user_id
        AND p2.is_active = true
        AND p2.title ILIKE '%BOARD%'
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Insert agenda item
  INSERT INTO public.meeting_agenda_items (
    meeting_id,
    item_no,
    title,
    summary,
    details,
    resolution_id,
    created_by
  )
  VALUES (
    p_meeting_id,
    p_item_no,
    p_title,
    p_summary,
    p_details,
    p_resolution_id,
    v_user_id
  )
  RETURNING id INTO agenda_item_id;
  
  RETURN QUERY SELECT true, 'AGENDA_ITEM_ADDED', agenda_item_id;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'ITEM_NO_EXISTS', NULL::UUID;
END;
$$;

COMMENT ON FUNCTION public.add_agenda_item IS 'Prideda darbotvarkės klausimą (tik DRAFT meeting)';

-- ==================================================
-- F) update_agenda_item
-- ==================================================

CREATE OR REPLACE FUNCTION public.update_agenda_item(
  p_agenda_item_id UUID,
  p_item_no INT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_resolution_id UUID DEFAULT NULL
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
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'AGENDA_ITEM_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT';
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions p2
      INNER JOIN public.orgs o2 ON o2.id = p2.org_id
      WHERE p2.org_id = v_meeting.org_id
        AND p2.user_id = v_user_id
        AND p2.is_active = true
        AND p2.title ILIKE '%BOARD%'
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED';
      RETURN;
    END IF;
  END IF;
  
  -- Update agenda item (only non-null fields)
  UPDATE public.meeting_agenda_items
  SET 
    item_no = COALESCE(p_item_no, item_no),
    title = COALESCE(p_title, title),
    summary = COALESCE(p_summary, summary),
    details = COALESCE(p_details, details),
    resolution_id = COALESCE(p_resolution_id, resolution_id),
    updated_at = NOW()
  WHERE id = p_agenda_item_id;
  
  RETURN QUERY SELECT true, 'AGENDA_ITEM_UPDATED';
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'ITEM_NO_EXISTS';
END;
$$;

COMMENT ON FUNCTION public.update_agenda_item IS 'Atnaujina darbotvarkės klausimą (tik DRAFT meeting)';

-- ==================================================
-- G) delete_agenda_item
-- ==================================================

CREATE OR REPLACE FUNCTION public.delete_agenda_item(
  p_agenda_item_id UUID
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
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'AGENDA_ITEM_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT';
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions p2
      INNER JOIN public.orgs o2 ON o2.id = p2.org_id
      WHERE p2.org_id = v_meeting.org_id
        AND p2.user_id = v_user_id
        AND p2.is_active = true
        AND p2.title ILIKE '%BOARD%'
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED';
      RETURN;
    END IF;
  END IF;
  
  -- Delete agenda item (cascade will delete attachments)
  DELETE FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  RETURN QUERY SELECT true, 'AGENDA_ITEM_DELETED';
END;
$$;

COMMENT ON FUNCTION public.delete_agenda_item IS 'Ištrina darbotvarkės klausimą (tik DRAFT meeting)';

-- ==================================================
-- H) attach_agenda_file_metadata
-- ==================================================

CREATE OR REPLACE FUNCTION public.attach_agenda_file_metadata(
  p_agenda_item_id UUID,
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
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'AGENDA_ITEM_NOT_FOUND', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions p2
      INNER JOIN public.orgs o2 ON o2.id = p2.org_id
      WHERE p2.org_id = v_meeting.org_id
        AND p2.user_id = v_user_id
        AND p2.is_active = true
        AND p2.title ILIKE '%BOARD%'
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Insert attachment metadata
  INSERT INTO public.meeting_agenda_attachments (
    agenda_item_id,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    uploaded_by
  )
  VALUES (
    p_agenda_item_id,
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

COMMENT ON FUNCTION public.attach_agenda_file_metadata IS 'Prideda priedo metaduomenis (tik DRAFT meeting, failas jau uploadintas į Storage)';

-- ==================================================
-- I) publish_meeting
-- ==================================================

CREATE OR REPLACE FUNCTION public.publish_meeting(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  published_at TIMESTAMPTZ,
  notice_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_schedule_check RECORD;
  v_notice_days INT;
  v_agenda_count INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions p2
      INNER JOIN public.orgs o2 ON o2.id = p2.org_id
      WHERE p2.org_id = v_meeting.org_id
        AND p2.user_id = v_user_id
        AND p2.is_active = true
        AND p2.title ILIKE '%BOARD%'
        AND o2.status = 'ACTIVE'
        AND NOT (o2.status = 'ONBOARDING' AND o2.metadata->'fact'->>'pre_org' = 'true')
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::TIMESTAMPTZ, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Check if has at least 1 agenda item
  SELECT COUNT(*) INTO v_agenda_count
  FROM public.meeting_agenda_items
  WHERE meeting_id = p_meeting_id;
  
  IF v_agenda_count = 0 THEN
    RETURN QUERY SELECT false, 'NO_AGENDA_ITEMS', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(v_meeting.org_id, v_meeting.scheduled_at);
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false, 
      v_schedule_check.reason,
      NULL::TIMESTAMPTZ,
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Get notice_days
  v_notice_days := public.get_governance_int(v_meeting.org_id, 'meeting_notice_days', 14);
  
  -- Publish meeting
  UPDATE public.meetings
  SET 
    status = 'PUBLISHED',
    published_at = NOW(),
    notice_days = v_notice_days,
    agenda_version = agenda_version + 1
  WHERE id = p_meeting_id;
  
  RETURN QUERY SELECT 
    true,
    'MEETING_PUBLISHED',
    NOW(),
    v_notice_days;
END;
$$;

COMMENT ON FUNCTION public.publish_meeting IS 'Publikuoja susirinkimą (reikalauja bent 1 agenda item ir valid scheduling)';

