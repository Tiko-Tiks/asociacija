-- ==================================================
-- FULL DATABASE SCHEMA EXPORT
-- Generated: 2026-01-06 17:45:55.551035+00
-- ==================================================

-- ENUM TYPES
-- ==================================================

"CREATE TYPE app_role AS ENUM (
  'OWNER'
  'ADMIN'
  'CHAIR'
  'MEMBER'
);"
"CREATE TYPE event_type AS ENUM (
  'ORG_CREATED'
  'MEMBER_JOINED'
  'ROLE_CHANGED'
  'PROJECT_CREATED'
  'PROJECT_STATUS_CHANGED'
  'INVOICE_GENERATED'
  'MEETING_CREATED'
  'QUORUM_REACHED'
  'CROSS_ORG_VIOLATION'
);"
"CREATE TYPE invoice_status AS ENUM (
  'DRAFT'
  'SENT'
  'PAID'
  'OVERDUE'
  'CANCELLED'
);"
"CREATE TYPE media_category AS ENUM (
  'BEFORE'
  'AFTER'
  'DOCUMENT'
);"
"CREATE TYPE member_status AS ENUM (
  'ACTIVE'
  'SUSPENDED'
  'LEFT'
);"
"CREATE TYPE project_status AS ENUM (
  'IDEA'
  'APPROVED'
  'ACTIVE'
  'CLOSED'
  'ARCHIVED'
);"
"CREATE TYPE vote_channel AS ENUM (
  'IN_PERSON'
  'WRITTEN'
  'REMOTE'
);"
"CREATE TYPE vote_choice AS ENUM (
  'FOR'
  'AGAINST'
  'ABSTAIN'
);"
"CREATE TYPE vote_kind AS ENUM (
  'GA'
  'OPINION'
);"

-- TABLES
-- ==================================================

"CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid
  user_id uuid
  action text NOT NULL
  target_table text
  target_id uuid
  old_value jsonb
  new_value jsonb
  ip_address text
  created_at timestamp with time zone DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS business_events (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid
  event_type event_type NOT NULL
  actor_id uuid
  payload jsonb DEFAULT '{}'::jsonb
  created_at timestamp with time zone DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS community_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  community_name text NOT NULL
  contact_person text
  email text NOT NULL
  description text
  status text NOT NULL DEFAULT 'PENDING'::text
  created_at timestamp with time zone NOT NULL DEFAULT now()
  updated_at timestamp with time zone
  reviewed_by uuid
  reviewed_at timestamp with time zone
  admin_notes text
  token text
  token_expires_at timestamp with time zone
  registration_number text
  address text
  usage_purpose text
);"
"CREATE TABLE IF NOT EXISTS governance_compliance_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  schema_version_no integer(32
  issue_code text NOT NULL
  severity text NOT NULL
  question_key text
  message text NOT NULL
  details jsonb
  created_at timestamp with time zone NOT NULL DEFAULT now()
  resolved_at timestamp with time zone
);"
"CREATE TABLE IF NOT EXISTS governance_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  active_config jsonb
  proposed_config jsonb
  proposed_at timestamp with time zone
  proposed_by uuid
  status text NOT NULL DEFAULT 'ACTIVE'::text
  updated_at timestamp with time zone DEFAULT now()
  answers jsonb NOT NULL DEFAULT '{}'::jsonb
  schema_version_no integer(32
  last_validated_at timestamp with time zone
  compliance_status text NOT NULL DEFAULT 'UNKNOWN'::text
);"
"CREATE TABLE IF NOT EXISTS governance_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  question_key text NOT NULL
  question_text text NOT NULL
  question_type text NOT NULL
  section text NOT NULL
  section_order integer(32
  is_required boolean NOT NULL DEFAULT true
  options jsonb
  depends_on text
  depends_value text
  validation_rules jsonb
  created_at timestamp with time zone NOT NULL DEFAULT now()
  updated_at timestamp with time zone
  is_active boolean NOT NULL DEFAULT true
);"
"CREATE TABLE IF NOT EXISTS governance_schema_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  version_no integer(32
  change_summary text
  created_by uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
  is_active boolean NOT NULL DEFAULT true
);"
"CREATE TABLE IF NOT EXISTS idea_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  idea_id uuid NOT NULL
  bucket text NOT NULL DEFAULT 'idea-documents'::text
  path text NOT NULL
  file_name text NOT NULL
  mime_type text
  size_bytes bigint(64
  uploaded_by uuid
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS idea_ballots (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  idea_vote_id uuid NOT NULL
  membership_id uuid NOT NULL
  choice text NOT NULL
  cast_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS idea_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  idea_id uuid NOT NULL
  org_id uuid NOT NULL
  status text NOT NULL DEFAULT 'OPEN'::text
  opens_at timestamp with time zone NOT NULL DEFAULT now()
  closes_at timestamp with time zone NOT NULL
  duration_days integer(32
  closed_at timestamp with time zone
  created_by uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  title text NOT NULL
  summary text
  details text
  status text NOT NULL DEFAULT 'DRAFT'::text
  public_visible boolean NOT NULL DEFAULT true
  created_by uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
  opened_at timestamp with time zone
  closed_at timestamp with time zone
  passed_at timestamp with time zone
);"
"CREATE TABLE IF NOT EXISTS invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  membership_id uuid
  amount numeric(10
  description text NOT NULL
  due_date date NOT NULL
  status invoice_status NOT NULL DEFAULT 'SENT'::invoice_status
  created_at timestamp with time zone DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS media_items (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  object_id uuid NOT NULL
  object_type text NOT NULL
  storage_path text NOT NULL
  category media_category DEFAULT 'DOCUMENT'::media_category
  uploaded_by uuid
  created_at timestamp with time zone DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS meeting_agenda_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  agenda_item_id uuid NOT NULL
  storage_bucket text NOT NULL DEFAULT 'meeting-documents'::text
  storage_path text NOT NULL
  file_name text NOT NULL
  mime_type text
  size_bytes bigint(64
  uploaded_by uuid
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS meeting_agenda_items (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  meeting_id uuid NOT NULL
  item_no integer(32
  title text NOT NULL
  summary text
  details text
  resolution_id uuid
  created_by uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
  updated_at timestamp with time zone
);"
"CREATE TABLE IF NOT EXISTS meeting_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  meeting_id uuid NOT NULL
  membership_id uuid NOT NULL
  present boolean DEFAULT false
  joined_at timestamp with time zone DEFAULT now()
  mode vote_channel DEFAULT 'IN_PERSON'::vote_channel
);"
"CREATE TABLE IF NOT EXISTS meeting_protocol_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  protocol_id uuid NOT NULL
  role text NOT NULL
  signed_by uuid
  signed_at timestamp with time zone
  signature_type text
  signature_data jsonb
);"
"CREATE TABLE IF NOT EXISTS meeting_protocols (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  meeting_id uuid NOT NULL
  protocol_number text NOT NULL
  version integer(32
  status text NOT NULL DEFAULT 'DRAFT'::text
  snapshot jsonb NOT NULL
  snapshot_hash text NOT NULL
  pdf_bucket text DEFAULT 'meeting-documents'::text
  pdf_path text
  created_by uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
  finalized_by uuid
  finalized_at timestamp with time zone
);"
"CREATE TABLE IF NOT EXISTS meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  title text NOT NULL
  scheduled_at timestamp with time zone NOT NULL
  quorum_met boolean DEFAULT false
  created_by uuid
  created_at timestamp with time zone DEFAULT now()
  meeting_type text NOT NULL DEFAULT 'GA'::text
  status text NOT NULL DEFAULT 'DRAFT'::text
  location text
  published_at timestamp with time zone
  notice_days integer(32
  notice_sent_at timestamp with time zone
  agenda_version integer(32
);"
"CREATE TABLE IF NOT EXISTS member_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  user_id uuid NOT NULL
  consent_type text NOT NULL
  version text NOT NULL DEFAULT '1.0'::text
  agreed_at timestamp with time zone NOT NULL DEFAULT now()
  created_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS member_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  email text NOT NULL
  token text NOT NULL
  status text NOT NULL DEFAULT 'SENT'::text
  invited_at timestamp with time zone DEFAULT now()
  invited_by uuid
  accepted_at timestamp with time zone
);"
"CREATE TABLE IF NOT EXISTS memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  org_id uuid NOT NULL
  role app_role NOT NULL DEFAULT 'MEMBER'::app_role
  status member_status NOT NULL DEFAULT 'ACTIVE'::member_status
  joined_at timestamp with time zone DEFAULT now()
  member_status text DEFAULT 'ACTIVE'::text
  status_reason text
  left_at timestamp with time zone
);"
"CREATE TABLE IF NOT EXISTS notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  org_id uuid NOT NULL
  title text NOT NULL
  message text
  link text
  read_at timestamp with time zone
  created_at timestamp with time zone DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS org_review_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  requested_by uuid NOT NULL
  status text NOT NULL DEFAULT 'OPEN'::text
  note text
  admin_note text
  created_at timestamp with time zone NOT NULL DEFAULT now()
  decided_at timestamp with time zone
  decided_by uuid
);"
"CREATE TABLE IF NOT EXISTS org_rulesets (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  answers jsonb NOT NULL
  generated_text text NOT NULL
  version_id text NOT NULL DEFAULT 'v1.0'::text
  status text NOT NULL DEFAULT 'DRAFT'::text
  created_at timestamp with time zone DEFAULT now()
  created_by uuid
  approved_at timestamp with time zone
  approved_by uuid
  content text NOT NULL DEFAULT ''::text
);"
"CREATE TABLE IF NOT EXISTS orgs (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  name text NOT NULL
  slug text NOT NULL
  created_at timestamp with time zone DEFAULT now()
  status text DEFAULT 'PENDING'::text
  activated_at timestamp with time zone
  activated_by uuid
  logo_url text
  registration_number text
  address text
  usage_purpose text
);"
"CREATE TABLE IF NOT EXISTS platform_roles (
  user_id uuid NOT NULL
  role text NOT NULL
  created_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS positions (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  user_id uuid NOT NULL
  title text NOT NULL
  start_date date NOT NULL
  end_date date
  is_active boolean NOT NULL DEFAULT true
  created_at timestamp with time zone DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS profiles (
  id uuid NOT NULL
  full_name text
  email text
  phone text
  avatar_url text
  created_at timestamp with time zone DEFAULT now()
  updated_at timestamp with time zone DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS project_contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  project_id uuid NOT NULL
  org_id uuid NOT NULL
  membership_id uuid NOT NULL
  kind text NOT NULL
  status text NOT NULL DEFAULT 'PLEDGED'::text
  money_amount_eur numeric(12
  in_kind_items jsonb
  work_offer jsonb
  note text
  created_at timestamp with time zone NOT NULL DEFAULT now()
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS projects (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  title text NOT NULL
  description text
  status project_status NOT NULL DEFAULT 'IDEA'::project_status
  budget numeric(10
  created_by uuid
  created_at timestamp with time zone DEFAULT now()
  updated_at timestamp with time zone DEFAULT now()
  idea_id uuid
  budget_eur numeric(12
  funding_opened_at timestamp with time zone NOT NULL DEFAULT now()
  completed_at timestamp with time zone
);"
"CREATE TABLE IF NOT EXISTS resolutions (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  resolution_number text
  title text NOT NULL
  content text NOT NULL
  status text DEFAULT 'DRAFT'::text
  visibility text DEFAULT 'MEMBERS'::text
  adopted_at timestamp with time zone
  adopted_by uuid
  created_at timestamp with time zone DEFAULT now()
  created_by uuid
  meeting_id uuid
  recommended_at timestamp with time zone
  recommended_by uuid
);"
"CREATE TABLE IF NOT EXISTS ruleset_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  version integer(32
  config_json jsonb NOT NULL DEFAULT '{""annual_fee"": 0
  active_from timestamp with time zone DEFAULT now()
  created_at timestamp with time zone DEFAULT now()
  quorum_percentage integer(32
  notice_period_days integer(32
  annual_fee numeric(12
  status text
);"
"CREATE TABLE IF NOT EXISTS simple_vote_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  vote_id uuid NOT NULL
  storage_bucket text NOT NULL DEFAULT 'vote-documents'::text
  storage_path text NOT NULL
  file_name text NOT NULL
  mime_type text
  size_bytes bigint(64
  uploaded_by uuid
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS simple_vote_ballots (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  vote_id uuid NOT NULL
  membership_id uuid NOT NULL
  choice vote_choice NOT NULL
  cast_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS simple_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  title text NOT NULL
  summary text
  details text
  status text NOT NULL DEFAULT 'OPEN'::text
  opens_at timestamp with time zone NOT NULL DEFAULT now()
  closes_at timestamp with time zone
  closed_at timestamp with time zone
  created_by uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS system_config (
  key text NOT NULL
  value jsonb NOT NULL
  updated_at timestamp with time zone DEFAULT now()
  updated_by uuid
);"
"CREATE TABLE IF NOT EXISTS vote_ballots (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  vote_id uuid NOT NULL
  membership_id uuid NOT NULL
  choice vote_choice NOT NULL
  channel vote_channel NOT NULL DEFAULT 'IN_PERSON'::vote_channel
  cast_at timestamp with time zone NOT NULL DEFAULT now()
);"
"CREATE TABLE IF NOT EXISTS votes (
  id uuid NOT NULL DEFAULT gen_random_uuid()
  org_id uuid NOT NULL
  resolution_id uuid NOT NULL
  kind vote_kind NOT NULL
  meeting_id uuid
  opens_at timestamp with time zone NOT NULL DEFAULT now()
  closes_at timestamp with time zone
  status text NOT NULL DEFAULT 'OPEN'::text
  created_by uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
  closed_at timestamp with time zone
);"

-- FUNCTIONS (RPC)
-- ==================================================

"-- Function: activate_ruleset_admin
CREATE OR REPLACE FUNCTION public.activate_ruleset_admin(p_ruleset_id uuid
 RETURNS TABLE(success boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status TEXT;
  v_org_id UUID;
BEGIN
  -- Get current ruleset status
  SELECT status
  FROM public.org_rulesets
  WHERE id = p_ruleset_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE
    RETURN;
  END IF;
  
  IF v_current_status != 'PROPOSED' THEN
    RETURN QUERY SELECT FALSE
      format('Ruleset status is %s
      p_ruleset_id
      v_current_status;
    RETURN;
  END IF;
  
  -- Update ruleset to ACTIVE
  UPDATE public.org_rulesets
  SET 
    status = 'ACTIVE'
    approved_at = NOW()
    approved_by = COALESCE(p_approved_by
  WHERE id = p_ruleset_id;
  
  -- Return success
  RETURN QUERY SELECT TRUE
END;
$function$
"
"-- Function: add_agenda_item
CREATE OR REPLACE FUNCTION public.add_agenda_item(p_meeting_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Insert agenda item
  INSERT INTO public.meeting_agenda_items (
    meeting_id
    item_no
    title
    summary
    details
    resolution_id
    created_by
  )
  VALUES (
    p_meeting_id
    p_item_no
    p_title
    p_summary
    p_details
    p_resolution_id
    v_user_id
  )
  RETURNING id INTO agenda_item_id;
  
  RETURN QUERY SELECT true
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false
END;
$function$
"
"-- Function: admin_remove_member
CREATE OR REPLACE FUNCTION public.admin_remove_member(p_user_id uuid
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    update memberships
    set
        member_status = 'LEFT'
        left_at = now()
    where user_id = p_user_id
      and org_id  = p_org_id;
end;
$function$
"
"-- Function: apply_vote_outcome
CREATE OR REPLACE FUNCTION public.apply_vote_outcome(p_vote_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      false
      NULL::UUID
      NULL::INT
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false
      NULL::UUID
      NULL::INT
    RETURN;
  END IF;
  
  -- Check if vote is closed
  IF v_vote.status != 'CLOSED' THEN
    RETURN QUERY SELECT 
      false
      NULL::UUID
      NULL::INT
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
        false
        NULL::UUID
        NULL::INT
      RETURN;
    END IF;
  END IF;
  
  -- Get tallies
  SELECT * INTO v_tally
  FROM public.vote_tallies
  WHERE vote_id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false
      NULL::UUID
      NULL::INT
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
    status = v_outcome
    adopted_at = CASE WHEN v_outcome = 'APPROVED' THEN NOW() ELSE NULL END
    adopted_by = CASE WHEN v_outcome = 'APPROVED' THEN v_user_id ELSE NULL END
  WHERE id = v_vote.resolution_id
    AND status = 'PROPOSED'; -- Only update if still PROPOSED
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    true
    'OUTCOME_APPLIED'::TEXT
    p_vote_id
    v_vote.resolution_id
    v_outcome
    v_tally.votes_for
    v_tally.votes_against
    v_tally.votes_abstain
    v_updated_count;
END;
$function$
"
"-- Function: approve_org
CREATE OR REPLACE FUNCTION public.approve_org(p_request_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status = 'OPEN';
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'APPROVED'
      decided_at = now()
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status and activation
  UPDATE public.orgs
  SET status = 'ACTIVE'
      activated_at = now()
      activated_by = v_user_id
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id
      type
      title
      message
      metadata
      created_at
    )
    SELECT 
      m.user_id
      'ORG_APPROVED'
      'BendruomenÄ— patvirtinta'
      'JÅ«sÅ³ bendruomenÄ— buvo patvirtinta ir dabar yra aktyvi'
      jsonb_build_object(
        'org_id'
        'request_id'
      )
      now()
    FROM public.memberships m
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: approve_resolution
CREATE OR REPLACE FUNCTION public.approve_resolution(p_resolution_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
AS $function$
declare
  v_check record;
  v_uid uuid;
begin
  select * into v_check
  from public.can_approve_resolution(p_resolution_id);

  if v_check.allowed is distinct from true then
    ok := false;
    reason := v_check.reason;
    resolution_id := p_resolution_id;
    updated_status := null;
    return next; return;
  end if;

  v_uid := auth.uid();

  update public.resolutions
  set
    status = 'APPROVED'
    adopted_at = now()
    adopted_by = coalesce(v_uid
  where id = p_resolution_id;

  ok := true;
  reason := 'APPROVED';
  resolution_id := p_resolution_id;
  updated_status := 'APPROVED';
  return next; return;
end;
$function$
"
"-- Function: approve_resolution_if_passed
CREATE OR REPLACE FUNCTION public.approve_resolution_if_passed(p_vote_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
AS $function$
declare
  v_status text;
  v_kind public.vote_kind;
  v_meeting_id uuid;
  v_resolution_id uuid;

  t record;
  q record;

  denom int;
  passes boolean;
  uid uuid;

  appr record;
begin
  out_vote_id := p_vote_id;

  select v.status
    into v_status
  from public.votes v
  where v.id = p_vote_id;

  if v_status is null then
    ok := false; reason := 'VOTE_NOT_FOUND';
    resolution_id := null; approved := false;
    votes_for := 0; votes_against := 0; votes_abstain := 0;
    return next; return;
  end if;

  select * into t
  from public.vote_tallies vt
  where vt.vote_id = p_vote_id;

  votes_for := coalesce(t.votes_for
  votes_against := coalesce(t.votes_against
  votes_abstain := coalesce(t.votes_abstain

  resolution_id := v_resolution_id;

  if v_status <> 'CLOSED' then
    ok := false; reason := 'VOTE_NOT_CLOSED';
    approved := false;
    return next; return;
  end if;

  denom := votes_for + votes_against;

  if denom = 0 then
    ok := false; reason := 'NO_DECISIVE_VOTES';
    approved := false;
    return next; return;
  end if;

  -- 2/3 rule: 3*FOR >= 2*(FOR+AGAINST)
  passes := (votes_for * 3) >= (2 * denom);

  if not passes then
    ok := true; reason := 'FAILED_2_3';
    approved := false;
    return next; return;
  end if;

  -- GA requires quorum
  if v_kind = 'GA' then
    if v_meeting_id is null then
      ok := false; reason := 'GA_REQUIRES_MEETING';
      approved := false;
      return next; return;
    end if;

    select * into q
    from public.meeting_quorum_status(v_meeting_id);

    if q.has_quorum is distinct from true then
      ok := false; reason := 'QUORUM_NOT_MET';
      approved := false;
      return next; return;
    end if;
  end if;

  -- approval requires authenticated user because of trigger
  uid := auth.uid();
  if uid is null then
    ok := false; reason := 'AUTH_REQUIRED_FOR_APPROVAL';
    approved := false;
    return next; return;
  end if;

  select * into appr
  from public.approve_resolution(v_resolution_id);

  if appr.ok is distinct from true then
    ok := false; reason := 'APPROVE_FAILED_' || coalesce(appr.reason
    approved := false;
    return next; return;
  end if;

  ok := true; reason := 'APPROVED';
  approved := true;
  return next; return;
end;
$function$
"
"-- Function: attach_agenda_file_metadata
CREATE OR REPLACE FUNCTION public.attach_agenda_file_metadata(p_agenda_item_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Insert attachment metadata
  INSERT INTO public.meeting_agenda_attachments (
    agenda_item_id
    storage_path
    file_name
    mime_type
    size_bytes
    uploaded_by
  )
  VALUES (
    p_agenda_item_id
    p_storage_path
    p_file_name
    p_mime_type
    p_size_bytes
    v_user_id
  )
  RETURNING id INTO attachment_id;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: attach_simple_vote_file_metadata
CREATE OR REPLACE FUNCTION public.attach_simple_vote_file_metadata(p_vote_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
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
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Insert attachment metadata
  INSERT INTO public.simple_vote_attachments (
    vote_id
    storage_path
    file_name
    mime_type
    size_bytes
    uploaded_by
  )
  VALUES (
    p_vote_id
    p_storage_path
    p_file_name
    p_mime_type
    p_size_bytes
    v_user_id
  )
  RETURNING id INTO attachment_id;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: audit_resolution_changes
CREATE OR REPLACE FUNCTION public.audit_resolution_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      org_id
      user_id
      action
      target_table
      target_id
      old_value
      new_value
    ) VALUES (
      NEW.org_id
      auth.uid()
      'RESOLUTION_CREATED'
      'resolutions'
      NEW.id
      NULL
      jsonb_build_object(
        'id'
        'title'
        'status'
        'visibility'
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (
      org_id
      user_id
      action
      target_table
      target_id
      old_value
      new_value
    ) VALUES (
      NEW.org_id
      auth.uid()
      'RESOLUTION_STATUS_CHANGED'
      'resolutions'
      NEW.id
      jsonb_build_object(
        'status'
        'adopted_at'
        'adopted_by'
      )
      jsonb_build_object(
        'status'
        'adopted_at'
        'adopted_by'
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Soft-fail: do not block main operation
  RAISE NOTICE 'AUDIT_LOG_FAILED: %'
  RETURN NEW;
END;
$function$
"
"-- Function: build_meeting_protocol_snapshot
CREATE OR REPLACE FUNCTION public.build_meeting_protocol_snapshot(p_meeting_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
    RETURN jsonb_build_object('error'
  END IF;
  
  -- 1) Meeting meta
  -- Already have v_meeting
  
  -- 2) Attendance summary (using unique participants - no double counting)
  -- Remote participants from vote_ballots (WRITTEN/REMOTE)
  SELECT jsonb_build_object(
    'present_in_person'
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    )
    'present_written'
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'WRITTEN'
    )
    'present_remote'
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'REMOTE'
    )
    'present_total'
      SELECT 
        COALESCE((
          SELECT COUNT(DISTINCT membership_id)
          FROM public.meeting_remote_voters
          WHERE meeting_id = p_meeting_id
        )
          SELECT COUNT(*)
          FROM public.meeting_attendance
          WHERE meeting_id = p_meeting_id
            AND present = true
            AND mode = 'IN_PERSON'
        )
    )
    'total_active_members'
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
    RETURN jsonb_build_object('error'
  END IF;
  
  -- Use meeting_quorum_status (source of truth)
  SELECT to_jsonb(q.*) INTO v_quorum
  FROM public.meeting_quorum_status(p_meeting_id) q;
  
  -- 4) Agenda with votes
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_no'
      'title'
      'summary'
      'details'
      'resolution_id'
      'resolution'
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id'
            'title'
            'status'
            'adopted_at'
            'adopted_by'
            'recommended_at'
            'recommended_by'
          )
          FROM public.resolutions r
          WHERE r.id = ai.resolution_id
        )
        ELSE NULL
      END
      'vote'
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id'
            'kind'
            'status'
            'opens_at'
            'closes_at'
            'closed_at'
            'tallies'
              SELECT jsonb_build_object(
                'votes_for'
                'votes_against'
                'votes_abstain'
                'votes_total'
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
      END
      'attachments'
        SELECT jsonb_agg(
          jsonb_build_object(
            'id'
            'file_name'
            'storage_path'
            'mime_type'
            'size_bytes'
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
    'meeting'
      'id'
      'org_id'
      'title'
      'scheduled_at'
      'location'
      'meeting_type'
      'status'
      'published_at'
      'notice_days'
    )
    'attendance'
    'quorum'
    'agenda'
    'generated_at'
  ) INTO v_snapshot;
  
  RETURN v_snapshot;
END;
$function$
"
"-- Function: can_approve_resolution
CREATE OR REPLACE FUNCTION public.can_approve_resolution(p_resolution_id uuid)
 RETURNS TABLE(allowed boolean
 LANGUAGE plpgsql
AS $function$
declare
  v_org_id uuid;
  v_status text;
  v_meeting_id uuid;
  v_has_config_errors boolean;
  v_quorum record;
begin
  select r.org_id
    into v_org_id
  from public.resolutions r
  where r.id = p_resolution_id;

  if v_org_id is null then
    allowed := false;
    reason := 'RESOLUTION_NOT_FOUND';
    details := jsonb_build_object('resolution_id'
    return next; return;
  end if;

  if v_status = 'APPROVED' then
    allowed := false;
    reason := 'ALREADY_APPROVED';
    details := jsonb_build_object('resolution_id'
    return next; return;
  end if;

  if v_meeting_id is null then
    allowed := false;
    reason := 'NO_MEETING_LINK';
    details := jsonb_build_object('resolution_id'
    return next; return;
  end if;

  select exists (
    select 1
    from public.governance_config_validation v
    where v.org_id = v_org_id and v.severity = 'error'
  ) into v_has_config_errors;

  if v_has_config_errors then
    allowed := false;
    reason := 'GOVERNANCE_CONFIG_INVALID';
    details := jsonb_build_object('org_id'
    return next; return;
  end if;

  select * into v_quorum
  from public.meeting_quorum_status(v_meeting_id);

  if v_quorum.has_quorum is distinct from true then
    allowed := false;
    reason := 'QUORUM_NOT_MET';
    details := jsonb_build_object(
      'meeting_id'
      'total_active_members'
      'present_count'
      'quorum_required'
      'quorum_reason'
    );
    return next; return;
  end if;

  allowed := true;
  reason := 'OK';
  details := jsonb_build_object(
    'org_id'
    'meeting_id'
    'resolution_status'
    'total_active_members'
    'present_count'
    'quorum_required'
  );
  return next; return;
end;
$function$
"
"-- Function: can_cast_idea_vote
CREATE OR REPLACE FUNCTION public.can_cast_idea_vote(p_vote_id uuid
 RETURNS TABLE(allowed boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_vote RECORD;
  v_membership RECORD;
  v_ballot_exists boolean;
  v_can_vote_result RECORD;
  v_can_vote_exists boolean;
  v_is_owner boolean := false;
BEGIN
  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check if vote is open
  IF v_vote.status != 'OPEN' OR now() >= v_vote.closes_at THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get membership (FIXED: member_status not status)
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = p_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check if OWNER - OWNER always can vote
  IF v_membership.role = 'OWNER' THEN
    v_is_owner := true;
  END IF;

  -- Check governance rules (BUT SKIP FOR OWNER)
  IF NOT v_is_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'can_vote'
    ) INTO v_can_vote_exists;

    IF v_can_vote_exists THEN
      SELECT * INTO v_can_vote_result
      FROM public.can_vote(v_vote.org_id

      IF NOT v_can_vote_result.allowed THEN
        RETURN QUERY SELECT false
          jsonb_build_object(
            'can_vote_reason'
            'can_vote_details'
          );
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Check if already voted
  SELECT EXISTS (
    SELECT 1 FROM public.idea_ballots
    WHERE idea_vote_id = p_vote_id
      AND membership_id = v_membership.id
  ) INTO v_ballot_exists;

  IF v_ballot_exists THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT 
    true
    'OK'::text
    jsonb_build_object(
      'vote_id'
      'membership_id'
      'is_owner'
    );
END;
$function$
"
"-- Function: can_cast_simple_vote
CREATE OR REPLACE FUNCTION public.can_cast_simple_vote(p_vote_id uuid
 RETURNS TABLE(allowed boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT 
      false
      'VOTE_NOT_OPEN'
      jsonb_build_object('vote_id'
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
      false
      'NOT_A_MEMBER'
      jsonb_build_object('org_id'
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
    FROM public.can_vote(v_vote.org_id
    
    IF NOT v_can_vote_result.allowed THEN
      RETURN QUERY SELECT 
        false
        'CAN_VOTE_BLOCKED'
        jsonb_build_object(
          'org_id'
          'user_id'
          'can_vote_reason'
          'can_vote_details'
        );
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true
    'OK'
    jsonb_build_object('vote_id'
END;
$function$
"
"-- Function: can_cast_vote
CREATE OR REPLACE FUNCTION public.can_cast_vote(p_vote_id uuid
 RETURNS TABLE(allowed boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
      false
      'VOTE_NOT_FOUND'::TEXT
      jsonb_build_object('vote_id'
    RETURN;
  END IF;
  
  -- Check if vote is OPEN
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT 
      false
      'VOTE_CLOSED'::TEXT
      jsonb_build_object('vote_id'
    RETURN;
  END IF;
  
  -- Check if vote has closed (closes_at)
  IF v_vote.closes_at IS NOT NULL AND now() >= v_vote.closes_at THEN
    RETURN QUERY SELECT 
      false
      'VOTE_CLOSED'::TEXT
      jsonb_build_object('vote_id'
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
      false
      'NOT_A_MEMBER'::TEXT
      jsonb_build_object(
        'org_id'
        'user_id'
        'message'
      );
    RETURN;
  END IF;
  
  -- Check if user is OWNER - OWNER visada gali balsuoti
  IF v_membership.role = 'OWNER' THEN
    v_is_owner := true;
  END IF;
  
  -- Check if can_vote function exists and call it (governance rules)
  -- BET: OWNER praleidÅ¾iame can_vote patikrÄ…
  IF NOT v_is_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'can_vote'
    ) INTO v_can_vote_exists;
    
    IF v_can_vote_exists THEN
      -- Call can_vote function (if it exists) - checks governance rules
      SELECT * INTO v_can_vote_result
      FROM public.can_vote(v_vote.org_id
      
      IF NOT v_can_vote_result.allowed THEN
        RETURN QUERY SELECT 
          false
          'CAN_VOTE_BLOCKED'::TEXT
          jsonb_build_object(
            'org_id'
            'user_id'
            'can_vote_reason'
            'can_vote_details'
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
      false
      'ALREADY_VOTED'::TEXT
      jsonb_build_object('membership_id'
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true
    'OK'::TEXT
    jsonb_build_object(
      'vote_id'
      'membership_id'
      'org_id'
      'is_owner'
    );
END;
$function$
"
"-- Function: can_register_in_person
CREATE OR REPLACE FUNCTION public.can_register_in_person(p_meeting_id uuid
 RETURNS TABLE(allowed boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_membership_id uuid;
  v_meeting_org_id uuid;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Verify p_user_id matches auth.uid() (users can only check themselves)
  IF p_user_id != auth.uid() THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Find active membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE user_id = p_user_id
    AND org_id = v_meeting_org_id
    AND status = 'ACTIVE';

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false
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
      false
      'REMOTE_ALREADY_VOTED'::text
      jsonb_build_object(
        'message'
        'membership_id'
      ) AS details;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT 
    true
    'OK'::text
    jsonb_build_object('membership_id'
END;
$function$
"
"-- Function: can_schedule_meeting
CREATE OR REPLACE FUNCTION public.can_schedule_meeting(p_org_id uuid
 RETURNS TABLE(allowed boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_notice_days INT;
  v_earliest_allowed TIMESTAMPTZ;
BEGIN
  -- Get notice_days from governance config
  v_notice_days := public.get_governance_int(p_org_id
  
  -- Calculate earliest allowed date
  v_earliest_allowed := NOW() + make_interval(days => v_notice_days);
  
  -- Check if scheduled_at is allowed
  IF p_scheduled_at >= v_earliest_allowed THEN
    RETURN QUERY SELECT 
      true
      'OK'::TEXT
      v_earliest_allowed
      v_notice_days
      jsonb_build_object(
        'scheduled_at'
        'notice_days'
        'earliest_allowed'
      );
  ELSE
    RETURN QUERY SELECT 
      false
      'NOTICE_TOO_SHORT'::TEXT
      v_earliest_allowed
      v_notice_days
      jsonb_build_object(
        'scheduled_at'
        'notice_days'
        'earliest_allowed'
        'days_short'
      );
  END IF;
END;
$function$
"
"-- Function: can_vote
CREATE OR REPLACE FUNCTION public.can_vote(p_org_id uuid
 RETURNS TABLE(allowed boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_member_status text;
  v_answers jsonb;
  v_track_fees boolean;
  v_restrict_debtors text;
  v_has_config_errors boolean;
begin
  -- 0) Membership check
  select m.member_status
    into v_member_status
  from public.memberships m
  where m.org_id = p_org_id
    and m.user_id = p_user_id
  limit 1;

  if v_member_status is null then
    allowed := false;
    reason := 'NOT_A_MEMBER';
    details := jsonb_build_object('org_id'
    return next;
    return;
  end if;

  if v_member_status <> 'ACTIVE' then
    allowed := false;
    reason := 'MEMBERSHIP_NOT_ACTIVE';
    details := jsonb_build_object('member_status'
    return next;
    return;
  end if;

  -- 1) Config validity gate: block if org has validation errors
  select exists (
    select 1
    from public.governance_config_validation v
    where v.org_id = p_org_id
      and v.severity = 'error'
  ) into v_has_config_errors;

  if v_has_config_errors then
    allowed := false;
    reason := 'GOVERNANCE_CONFIG_INVALID';
    details := jsonb_build_object('org_id'
    return next;
    return;
  end if;

  -- 2) Load governance answers for org
  select gc.answers
    into v_answers
  from public.governance_configs gc
  where gc.org_id = p_org_id
    and gc.status = 'ACTIVE'
  limit 1;

  if v_answers is null then
    allowed := false;
    reason := 'NO_ACTIVE_GOVERNANCE_CONFIG';
    details := jsonb_build_object('org_id'
    return next;
    return;
  end if;

  -- 3) Fee restriction logic (cannot be enforced without fee tables)
  -- FIX: Handle both ""yes""/""no"" strings AND true/false booleans
  v_track_fees := coalesce(
    (v_answers->>'track_fees') = 'yes'
    (v_answers->>'track_fees')::boolean
    false
  );
  v_restrict_debtors := lower(coalesce(v_answers->>'restrict_debtors'

  -- If community wants to restrict debtors
  -- User can set track_fees=""no"" or restrict_debtors=""not_applicable"" to proceed with voting tests.
  if v_track_fees = true and v_restrict_debtors in ('block_vote'
    allowed := false;
    reason := 'FEE_DATA_SOURCE_MISSING';
    details := jsonb_build_object(
      'track_fees'
      'restrict_debtors'
    );
    return next;
    return;
  end if;

  -- 4) Default allow (all checks passed)
  allowed := true;
  reason := 'OK';
  details := jsonb_build_object(
    'member_status'
    'track_fees'
    'restrict_debtors'
  );
  return next;
  return;
end;
$function$
"
"-- Function: cast_idea_vote
CREATE OR REPLACE FUNCTION public.cast_idea_vote(p_vote_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_vote RECORD;
  v_membership_id uuid;
  v_can_vote_check RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Validate choice
  IF p_choice NOT IN ('FOR'
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Preflight check
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_idea_vote(p_vote_id

  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  -- Get membership_id from can_vote_check details
  v_membership_id := (v_can_vote_check.details->>'membership_id')::uuid;

  -- Upsert ballot
  INSERT INTO public.idea_ballots (idea_vote_id
  VALUES (p_vote_id
  ON CONFLICT (idea_vote_id
    SET choice = p_choice::text
        cast_at = now();

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: cast_simple_vote
CREATE OR REPLACE FUNCTION public.cast_simple_vote(p_vote_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_can_vote_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Preflight check
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_simple_vote(p_vote_id
  
  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get membership_id from can_vote_check details
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  -- Upsert ballot (INSERT ... ON CONFLICT UPDATE)
  INSERT INTO public.simple_vote_ballots (
    vote_id
    membership_id
    choice
  )
  VALUES (
    p_vote_id
    v_membership.id
    p_choice
  )
  ON CONFLICT (vote_id
  DO UPDATE SET
    choice = EXCLUDED.choice
    cast_at = NOW();
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: cast_vote
CREATE OR REPLACE FUNCTION public.cast_vote(p_vote_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_can_vote_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Preflight check using can_cast_vote
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_vote(p_vote_id
  
  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false
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
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Insert ballot (upsert - allow changing vote)
  INSERT INTO public.vote_ballots (
    vote_id
    membership_id
    choice
    channel
  )
  VALUES (
    p_vote_id
    v_membership.id
    p_choice
    p_channel
  )
  ON CONFLICT (vote_id
  DO UPDATE SET
    choice = EXCLUDED.choice
    channel = EXCLUDED.channel
    cast_at = NOW();
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: check_org_has_bylaws
CREATE OR REPLACE FUNCTION public.check_org_has_bylaws(p_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_has_bylaws BOOLEAN := false;
BEGIN
  -- Check if org_documents table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'org_documents'
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.org_documents od
      WHERE od.org_id = p_org_id
        AND (
          (od.document_type = 'BYLAWS' AND od.status = 'UPLOADED')
          OR (od.document_type IS NULL AND od.status = 'UPLOADED')
        )
    ) INTO v_has_bylaws;
  -- Check if orgs has bylaws_path column
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'bylaws_path'
  ) THEN
    SELECT COALESCE(bylaws_path
    INTO v_has_bylaws
    FROM public.orgs
    WHERE id = p_org_id;
  ELSE
    -- If no bylaws mechanism exists
    v_has_bylaws := true;
  END IF;
  
  RETURN v_has_bylaws;
END;
$function$
"
"-- Function: close_idea_vote
CREATE OR REPLACE FUNCTION public.close_idea_vote(p_vote_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_vote RECORD;
  v_membership RECORD;
  v_tally RECORD;
  v_min_participation_percent int;
  v_participation_required int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get tally
  SELECT * INTO v_tally
  FROM public.idea_vote_tally
  WHERE vote_id = p_vote_id;

  -- Get min participation percent
  v_min_participation_percent := public.get_governance_int(v_vote.org_id
  
  -- Calculate participation required
  v_participation_required := CEIL(v_tally.total_active_members::numeric * v_min_participation_percent::numeric / 100.0);
  
  -- Close vote
  UPDATE public.idea_votes
  SET status = 'CLOSED'
      closed_at = now()
  WHERE id = p_vote_id;

  RETURN QUERY SELECT 
    true
    'CLOSED'::text
    v_tally.votes_for
    v_tally.votes_against
    v_tally.votes_total
    v_tally.total_active_members
    v_participation_required;
END;
$function$
"
"-- Function: close_simple_vote
CREATE OR REPLACE FUNCTION public.close_simple_vote(p_vote_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_tally RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if already closed
  IF v_vote.status = 'CLOSED' THEN
    RETURN QUERY SELECT false
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
      RETURN QUERY SELECT false
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
    status = 'CLOSED'
    closed_at = NOW()
  WHERE id = p_vote_id;
  
  RETURN QUERY SELECT 
    true
    'VOTE_CLOSED'
    COALESCE(v_tally.votes_for
    COALESCE(v_tally.votes_against
    COALESCE(v_tally.votes_abstain
END;
$function$
"
"-- Function: close_vote
CREATE OR REPLACE FUNCTION public.close_vote(p_vote_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_tally RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if already closed
  IF v_vote.status = 'CLOSED' THEN
    RETURN QUERY SELECT false
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
      RETURN QUERY SELECT false
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
    status = 'CLOSED'
    closed_at = NOW()
  WHERE id = p_vote_id;
  
  RETURN QUERY SELECT 
    true
    'VOTE_CLOSED'::TEXT
    COALESCE(v_tally.votes_for
    COALESCE(v_tally.votes_against
    COALESCE(v_tally.votes_abstain
END;
$function$
"
"-- Function: create_idea
CREATE OR REPLACE FUNCTION public.create_idea(p_org_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_membership_id uuid;
  v_idea_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check ACTIVE membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = p_org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Insert idea
  INSERT INTO public.ideas (org_id
  VALUES (p_org_id
  RETURNING id INTO v_idea_id;

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: create_meeting_ga
CREATE OR REPLACE FUNCTION public.create_meeting_ga(p_org_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_schedule_check RECORD;
  v_new_meeting_id UUID;
  v_is_owner BOOLEAN := FALSE;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = p_org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF FOUND THEN
    v_is_owner := TRUE;
  END IF;
  
  -- If not OWNER
  IF NOT v_is_owner THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = p_org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Check scheduling rules (UNLESS force_override by OWNER)
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(p_org_id
  
  IF NOT v_schedule_check.allowed AND NOT (p_force_override AND v_is_owner) THEN
    RETURN QUERY SELECT 
      false
      v_schedule_check.reason
      NULL::UUID
      v_schedule_check.earliest_allowed
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Create meeting
  INSERT INTO public.meetings (
    org_id
    title
    scheduled_at
    location
    meeting_type
    status
    created_by
  )
  VALUES (
    p_org_id
    p_title
    p_scheduled_at
    p_location
    'GA'
    'DRAFT'
    v_user_id
  )
  RETURNING id INTO v_new_meeting_id;
  
  RETURN QUERY SELECT 
    true
    'MEETING_CREATED'::TEXT
    v_new_meeting_id
    v_schedule_check.earliest_allowed
    v_schedule_check.notice_days;
END;
$function$
"
"-- Function: create_meeting_ga
CREATE OR REPLACE FUNCTION public.create_meeting_ga(p_org_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_schedule_check RECORD;
  v_new_meeting_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER or has BOARD position
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = p_org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  -- If not OWNER
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = p_org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- STRICT CHECK: Must follow notice_days rule (NO OVERRIDE)
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(p_org_id
  
  IF NOT v_schedule_check.allowed THEN
    -- BLOCK creation - governance rules are mandatory
    RETURN QUERY SELECT 
      false
      v_schedule_check.reason
      NULL::UUID
      v_schedule_check.earliest_allowed
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Create meeting (only if schedule check passed)
  INSERT INTO public.meetings (
    org_id
    title
    scheduled_at
    location
    meeting_type
    status
    created_by
  )
  VALUES (
    p_org_id
    p_title
    p_scheduled_at
    p_location
    'GA'
    'DRAFT'
    v_user_id
  )
  RETURNING id INTO v_new_meeting_id;
  
  RETURN QUERY SELECT 
    true
    'MEETING_CREATED'::TEXT
    v_new_meeting_id
    v_schedule_check.earliest_allowed
    v_schedule_check.notice_days;
END;
$function$
"
"-- Function: create_schema_version
CREATE OR REPLACE FUNCTION public.create_schema_version(p_change_summary text DEFAULT NULL::text
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_new_version INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_created_by
  
  -- Get current max version
  SELECT COALESCE(MAX(gsv.version_no)
  FROM public.governance_schema_versions gsv;
  
  -- Deactivate old versions
  UPDATE public.governance_schema_versions
  SET is_active = false
  WHERE is_active = true;
  
  -- Create new version
  INSERT INTO public.governance_schema_versions (
    version_no
    change_summary
    created_by
    is_active
  ) VALUES (
    v_new_version
    p_change_summary
    v_user_id
    true
  );
  
  -- Mark all orgs as NEEDS_UPDATE (except those already INVALID)
  -- INVALID orgs stay INVALID
  UPDATE public.governance_configs
  SET compliance_status = 'NEEDS_UPDATE'
  WHERE compliance_status IN ('OK'
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: create_simple_vote
CREATE OR REPLACE FUNCTION public.create_simple_vote(p_org_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_new_vote_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
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
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Create vote
  INSERT INTO public.simple_votes (
    org_id
    title
    summary
    details
    closes_at
    created_by
  )
  VALUES (
    p_org_id
    p_title
    p_summary
    p_details
    p_closes_at
    v_user_id
  )
  RETURNING id INTO v_new_vote_id;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: delete_agenda_item
CREATE OR REPLACE FUNCTION public.delete_agenda_item(p_agenda_item_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Delete agenda item (cascade will delete attachments)
  DELETE FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: enforce_resolution_rules
CREATE OR REPLACE FUNCTION public.enforce_resolution_rules()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_activation RECORD;
BEGIN
  -- Governance gate: org must be ACTIVE and have active ruleset
  SELECT *
  INTO v_activation
  FROM public.org_activation_state
  WHERE org_id = NEW.org_id
  LIMIT 1;

  IF NOT FOUND
     OR v_activation.org_status IS DISTINCT FROM 'ACTIVE'
     OR v_activation.has_active_ruleset IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'ORG_NOT_ACTIVE_OR_NO_RULESET';
  END IF;

  -- Visibility constraint (defense in depth)
  IF NEW.visibility NOT IN ('PUBLIC'
    RAISE EXCEPTION 'INVALID_VISIBILITY';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- APPROVED requires adoption fields
    IF NEW.status = 'APPROVED' THEN
      IF NEW.adopted_at IS NULL OR NEW.adopted_by IS NULL THEN
        RAISE EXCEPTION 'APPROVED_REQUIRES_ADOPTION_FIELDS';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: enforce strict status flow
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'DRAFT' AND NEW.status = 'PROPOSED' THEN
      -- allowed
    ELSIF OLD.status = 'PROPOSED' AND NEW.status IN ('APPROVED'
      -- allowed
      IF NEW.status = 'APPROVED' THEN
        NEW.adopted_at := now();
        NEW.adopted_by := auth.uid();
      END IF;
    ELSE
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
    END IF;
  END IF;

  -- Adoption guarantee (reject missing fields)
  IF NEW.status = 'APPROVED' THEN
    IF NEW.adopted_at IS NULL OR NEW.adopted_by IS NULL THEN
      RAISE EXCEPTION 'APPROVED_REQUIRES_ADOPTION_FIELDS';
    END IF;
  END IF;

  -- Immutability: block updates on APPROVED rows
  IF OLD.status = 'APPROVED' THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.visibility IS DISTINCT FROM OLD.visibility
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.adopted_at IS DISTINCT FROM OLD.adopted_at
       OR NEW.adopted_by IS DISTINCT FROM OLD.adopted_by THEN
      RAISE EXCEPTION 'APPROVED_RESOLUTION_IMMUTABLE';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
"
"-- Function: ensure_approved_resolution_adoption
CREATE OR REPLACE FUNCTION public.ensure_approved_resolution_adoption()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status = 'APPROVED' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'APPROVED resolution requires authenticated user';
    END IF;

    NEW.adopted_at := now();
    NEW.adopted_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$function$
"
"-- Function: evaluate_idea_vote_and_transition
CREATE OR REPLACE FUNCTION public.evaluate_idea_vote_and_transition(p_vote_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_vote RECORD;
  v_idea RECORD;
  v_membership RECORD;
  v_tally RECORD;
  v_min_participation_percent int;
  v_participation_required int;
  v_participation_ok boolean;
  v_majority_ok boolean;
  v_outcome text;
  v_project_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get idea
  SELECT * INTO v_idea
  FROM public.ideas
  WHERE id = v_vote.idea_id;

  -- Auto-close if not closed and time passed
  IF v_vote.status = 'OPEN' AND now() >= v_vote.closes_at THEN
    PERFORM * FROM public.close_idea_vote(p_vote_id);
    SELECT * INTO v_vote FROM public.idea_votes WHERE id = p_vote_id;
  END IF;

  IF v_vote.status != 'CLOSED' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get tally
  SELECT * INTO v_tally
  FROM public.idea_vote_tally
  WHERE vote_id = p_vote_id;

  -- Get min participation percent
  v_min_participation_percent := public.get_governance_int(v_vote.org_id
  v_participation_required := CEIL(v_tally.total_active_members::numeric * v_min_participation_percent::numeric / 100.0);
  v_participation_ok := v_tally.votes_total >= v_participation_required;
  v_majority_ok := v_tally.votes_for > v_tally.votes_against;

  -- Determine outcome
  IF NOT v_participation_ok THEN
    v_outcome := 'NOT_COMPLETED';
    UPDATE public.ideas
    SET status = 'NOT_COMPLETED'
        closed_at = now()
    WHERE id = v_idea.id;
    
    RETURN QUERY SELECT true
    RETURN;
  END IF;

  IF v_majority_ok THEN
    v_outcome := 'PASSED';
    UPDATE public.ideas
    SET status = 'PASSED'
        closed_at = now()
        passed_at = now()
    WHERE id = v_idea.id;

    -- Create project if requested
    IF p_create_project AND p_budget_eur > 0 THEN
      INSERT INTO public.projects (org_id
      VALUES (v_idea.org_id
      RETURNING id INTO v_project_id;
    END IF;

    RETURN QUERY SELECT true
    RETURN;
  ELSE
    v_outcome := 'FAILED';
    UPDATE public.ideas
    SET status = 'FAILED'
        closed_at = now()
    WHERE id = v_idea.id;

    RETURN QUERY SELECT true
    RETURN;
  END IF;
END;
$function$
"
"-- Function: finalize_meeting_protocol
CREATE OR REPLACE FUNCTION public.finalize_meeting_protocol(p_meeting_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' THEN
    RETURN QUERY SELECT false
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
      RETURN QUERY SELECT false
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
      false
      'QUORUM_FUNCTION_MISSING'::TEXT
      NULL::UUID
      NULL::INT
      NULL::TEXT
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
      false
      'APPLY_VOTE_OUTCOME_FUNCTION_MISSING'::TEXT
      NULL::UUID
      NULL::INT
      NULL::TEXT
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
    -- Find GA vote by (meeting_id
    SELECT * INTO v_vote
    FROM public.votes
    WHERE kind = 'GA'
    AND meeting_id = p_meeting_id
    AND resolution_id = v_agenda_item.resolution_id
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT 
        false
        ('VOTE_NOT_FOUND: item_no=' || v_agenda_item.item_no || '
        NULL::UUID
        NULL::INT
        NULL::TEXT
        NULL::TEXT;
      RETURN;
    END IF;
    
    -- Require vote.status='CLOSED'
    IF v_vote.status != 'CLOSED' THEN
      RETURN QUERY SELECT 
        false
        ('VOTE_NOT_CLOSED: item_no=' || v_agenda_item.item_no || '
        NULL::UUID
        NULL::INT
        NULL::TEXT
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
      false
      (v_snapshot->>'error')::TEXT
      NULL::UUID
      NULL::INT
      NULL::TEXT
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Calculate hash
  v_hash := encode(digest(v_snapshot::TEXT
  
  -- Get next version
  SELECT COALESCE(MAX(version)
  FROM public.meeting_protocols
  WHERE meeting_id = p_meeting_id;
  
  -- Generate protocol number (simple: org_id prefix + version)
  -- You can customize this logic
  v_protocol_number := TO_CHAR(NOW()
  
  -- Create protocol
  INSERT INTO public.meeting_protocols (
    org_id
    meeting_id
    protocol_number
    version
    status
    snapshot
    snapshot_hash
    created_by
    finalized_by
    finalized_at
  )
  VALUES (
    v_meeting.org_id
    p_meeting_id
    v_protocol_number
    v_version
    'FINAL'
    v_snapshot
    v_hash
    v_user_id
    v_user_id
    NOW()
  )
  RETURNING id INTO v_new_protocol_id;
  
  -- Optional: set meeting status to COMPLETED
  UPDATE public.meetings
  SET status = 'COMPLETED'
  WHERE id = p_meeting_id
  AND status IN ('PUBLISHED'
  
  RETURN QUERY SELECT 
    true
    'PROTOCOL_FINALIZED'
    v_new_protocol_id
    v_version
    v_protocol_number
    v_hash;
END;
$function$
"
"-- Function: get_active_schema_version
CREATE OR REPLACE FUNCTION public.get_active_schema_version()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_version INTEGER;
BEGIN
  SELECT version_no INTO v_version
  FROM public.governance_schema_versions
  WHERE is_active = true
  ORDER BY version_no DESC
  LIMIT 1;
  
  RETURN COALESCE(v_version
END;
$function$
"
"-- Function: get_branduolys_org_id
CREATE OR REPLACE FUNCTION public.get_branduolys_org_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  branduolys_id UUID;
BEGIN
  -- Try to find branduolys org by slug
  SELECT id INTO branduolys_id
  FROM orgs
  WHERE slug = 'branduolys'
  LIMIT 1;
  
  -- If not found
  IF branduolys_id IS NULL THEN
    SELECT id INTO branduolys_id
    FROM orgs
    WHERE slug = 'platform'
    LIMIT 1;
  END IF;
  
  -- If still not found
  RETURN branduolys_id;
END;
$function$
"
"-- Function: get_governance_int
CREATE OR REPLACE FUNCTION public.get_governance_int(p_org_id uuid
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_value TEXT;
  v_int_value INT;
BEGIN
  -- Get value from governance_configs.answers
  SELECT gc.answers->>p_key INTO v_value
  FROM public.governance_configs gc
  WHERE gc.org_id = p_org_id
  LIMIT 1;
  
  -- If not found or null
  IF v_value IS NULL THEN
    RETURN p_default_int;
  END IF;
  
  -- Try to cast to int
  BEGIN
    v_int_value := v_value::INT;
    RETURN v_int_value;
  EXCEPTION
    WHEN OTHERS THEN
      -- If cast fails
      RETURN p_default_int;
  END;
END;
$function$
"
"-- Function: get_meeting_protocol
CREATE OR REPLACE FUNCTION public.get_meeting_protocol(p_protocol_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_protocol RECORD;
  v_user_id UUID;
  v_membership RECORD;
BEGIN
  -- Get current user (optional
  v_user_id := auth.uid();
  
  -- Get protocol
  SELECT * INTO v_protocol
  FROM public.meeting_protocols
  WHERE id = p_protocol_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error'
  END IF;
  
  -- RLS check: Members can only see FINAL
  IF v_protocol.status = 'DRAFT' THEN
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('error'
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
        RETURN jsonb_build_object('error'
      END IF;
    END IF;
  END IF;
  
  -- Return protocol with meta
  RETURN jsonb_build_object(
    'id'
    'org_id'
    'meeting_id'
    'protocol_number'
    'version'
    'status'
    'snapshot'
    'snapshot_hash'
    'pdf_bucket'
    'pdf_path'
    'created_at'
    'finalized_at'
  );
END;
$function$
"
"-- Function: get_meeting_unique_participants
CREATE OR REPLACE FUNCTION public.get_meeting_unique_participants(p_meeting_id uuid)
 RETURNS TABLE(remote_participants integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT 
    COALESCE((
      SELECT COUNT(DISTINCT membership_id)
      FROM public.meeting_remote_voters
      WHERE meeting_id = p_meeting_id
    )
    COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    )
    COALESCE((
      SELECT COUNT(DISTINCT membership_id)
      FROM public.meeting_remote_voters
      WHERE meeting_id = p_meeting_id
    )
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    )
$function$
"
"-- Function: get_membership_id
CREATE OR REPLACE FUNCTION public.get_membership_id(p_org_id uuid
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select m.id
  from public.memberships m
  where m.org_id = p_org_id
    and m.user_id = p_user_id
    and (m.member_status = 'ACTIVE' or (m.status is not null and m.status::text = 'ACTIVE'))
  limit 1
$function$
"
"-- Function: get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(target_org_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE
AS $function$
    select m.role
    from memberships m
    where m.user_id = auth.uid()
      and m.org_id = target_org_id
      and m.member_status = 'ACTIVE'
    limit 1;
$function$
"
"-- Function: get_user_role_as
CREATE OR REPLACE FUNCTION public.get_user_role_as(p_user_id uuid
 RETURNS app_role
 LANGUAGE sql
 STABLE
AS $function$
  select m.role
  from memberships m
  where m.user_id = p_user_id
    and m.org_id = p_org_id
    and m.member_status = 'ACTIVE'
  limit 1;
$function$
"
"-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id
  values (new.id
  return new;
end;
$function$
"
"-- Function: is_member_of
CREATE OR REPLACE FUNCTION public.is_member_of(target_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from memberships
    where user_id = auth.uid()
    and org_id = target_org_id
    and status = 'ACTIVE'
  );
$function$
"
"-- Function: is_org_owner
CREATE OR REPLACE FUNCTION public.is_org_owner(p_user_id uuid
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_user_id
      AND m.org_id = p_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
  );
END;
$function$
"
"-- Function: is_platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if platform_admins table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'platform_admins'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = p_user_id
        AND is_active = true
    );
  END IF;
  
  -- Check if users table has is_platform_admin column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' 
      AND table_name = 'users' 
      AND column_name = 'is_platform_admin'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_user_id
        AND is_platform_admin = true
    );
  END IF;
  
  -- If no mechanism exists
  RETURN false;
END;
$function$
"
"-- Function: meeting_quorum_status
CREATE OR REPLACE FUNCTION public.meeting_quorum_status(p_meeting_id uuid)
 RETURNS TABLE(meeting_id uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_org_id uuid;
  v_total int;
  v_present int;
  v_required int;
begin
  meeting_id := p_meeting_id;

  select m.org_id
    into v_org_id
  from public.meetings m
  where m.id = p_meeting_id;

  org_id := v_org_id;

  if v_org_id is null then
    total_active_members := 0;
    present_count := 0;
    quorum_required := 0;
    has_quorum := false;
    reason := 'MEETING_NOT_FOUND';
    return next;
    return;
  end if;

  select count(*)::int
    into v_total
  from public.memberships m
  where m.org_id = v_org_id
    and (m.member_status = 'ACTIVE' or (m.status is not null and m.status::text = 'ACTIVE'));

  select count(*)::int
    into v_present
  from public.meeting_attendance ma
  join public.memberships m on m.id = ma.membership_id
  where ma.meeting_id = p_meeting_id
    and coalesce(ma.present
    and m.org_id = v_org_id
    and (m.member_status = 'ACTIVE' or (m.status is not null and m.status::text = 'ACTIVE'));

  v_required := (v_total / 2) + 1;

  total_active_members := v_total;
  present_count := v_present;
  quorum_required := v_required;

  if v_total = 0 then
    has_quorum := false;
    reason := 'NO_ACTIVE_MEMBERS';
  elsif v_present >= v_required then
    has_quorum := true;
    reason := 'OK';
  else
    has_quorum := false;
    reason := 'QUORUM_NOT_MET';
  end if;

  return next;
end;
$function$
"
"-- Function: open_idea_for_voting
CREATE OR REPLACE FUNCTION public.open_idea_for_voting(p_idea_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_idea RECORD;
  v_membership RECORD;
  v_duration_days int;
  v_closes_at timestamptz;
  v_vote_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get idea
  SELECT * INTO v_idea
  FROM public.ideas
  WHERE id = p_idea_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_idea.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check idea status
  IF v_idea.status != 'DRAFT' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get duration from governance (default 7)
  -- Note: Using existing function signature with p_default_int parameter name
  v_duration_days := public.get_governance_int(v_idea.org_id
  v_closes_at := now() + (v_duration_days || ' days')::interval;

  -- Create vote
  INSERT INTO public.idea_votes (idea_id
  VALUES (p_idea_id
  ON CONFLICT (idea_id) DO UPDATE
    SET status = 'OPEN'
        closes_at = v_closes_at
        duration_days = v_duration_days
        opens_at = now()
  RETURNING id INTO v_vote_id;

  -- Update idea status
  UPDATE public.ideas
  SET status = 'OPEN'
      opened_at = now()
  WHERE id = p_idea_id;

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: pledge_in_kind
CREATE OR REPLACE FUNCTION public.pledge_in_kind(p_project_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = v_project.org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id
  )
  VALUES (p_project_id
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: pledge_money
CREATE OR REPLACE FUNCTION public.pledge_money(p_project_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  IF p_amount_eur <= 0 THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = v_project.org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id
  )
  VALUES (p_project_id
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: pledge_work
CREATE OR REPLACE FUNCTION public.pledge_work(p_project_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  IF p_work IS NULL OR p_work->>'hours' IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = v_project.org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id
  )
  VALUES (p_project_id
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: positions_sync_is_active
CREATE OR REPLACE FUNCTION public.positions_sync_is_active()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.is_active := (new.end_date is null or new.end_date > current_date);
  return new;
end;
$function$
"
"-- Function: prevent_approved_resolution_update
CREATE OR REPLACE FUNCTION public.prevent_approved_resolution_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If the resolution is APPROVED
  IF OLD.status = 'APPROVED' THEN
    -- Allow only updated_at to change (for audit purposes)
    IF NEW.status != OLD.status OR
       NEW.title != OLD.title OR
       NEW.content != OLD.content OR
       NEW.visibility != OLD.visibility OR
       NEW.adopted_at != OLD.adopted_at OR
       NEW.adopted_by != OLD.adopted_by OR
       NEW.org_id != OLD.org_id THEN
      RAISE EXCEPTION 'Cannot modify APPROVED resolution. Status: %
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
"
"-- Function: prevent_orphan_org
CREATE OR REPLACE FUNCTION public.prevent_orphan_org()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if old.role = 'OWNER'
       and old.member_status = 'ACTIVE' then

        if not exists (
            select 1
            from memberships m
            where m.org_id = old.org_id
              and m.role = 'OWNER'
              and m.member_status = 'ACTIVE'
              and m.id <> old.id
        ) then
            raise exception
              'Org % must have at least one ACTIVE OWNER'
              old.org_id;
        end if;
    end if;

    return old;
end;
$function$
"
"-- Function: preview_meeting_protocol
CREATE OR REPLACE FUNCTION public.preview_meeting_protocol(p_meeting_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_snapshot JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' THEN
    RETURN QUERY SELECT false
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
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Build snapshot
  v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
  
  -- Check if snapshot build failed (e.g. QUORUM_FUNCTION_MISSING)
  IF v_snapshot ? 'error' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: publish_meeting
CREATE OR REPLACE FUNCTION public.publish_meeting(p_meeting_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Check if has at least 1 agenda item
  SELECT COUNT(*) INTO v_agenda_count
  FROM public.meeting_agenda_items
  WHERE meeting_id = p_meeting_id;
  
  IF v_agenda_count = 0 THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(v_meeting.org_id
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false
      v_schedule_check.reason
      NULL::TIMESTAMPTZ
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Get notice_days
  v_notice_days := public.get_governance_int(v_meeting.org_id
  
  -- Publish meeting
  UPDATE public.meetings
  SET 
    status = 'PUBLISHED'
    published_at = NOW()
    notice_days = v_notice_days
    agenda_version = agenda_version + 1
  WHERE id = p_meeting_id;
  
  RETURN QUERY SELECT 
    true
    'MEETING_PUBLISHED'
    NOW()
    v_notice_days;
END;
$function$
"
"-- Function: register_in_person_attendance
CREATE OR REPLACE FUNCTION public.register_in_person_attendance(p_meeting_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Verify membership belongs to meeting org and is ACTIVE
  SELECT org_id
  FROM public.memberships
  WHERE id = p_membership_id;

  IF v_membership_org_id IS NULL OR v_membership_org_id != v_meeting_org_id THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  IF v_membership_status != 'ACTIVE' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check if user is OWNER or BOARD
  SELECT 
    EXISTS(SELECT 1 FROM public.memberships WHERE user_id = v_user_id AND org_id = v_meeting_org_id AND role = 'OWNER')
    EXISTS(
      SELECT 1 FROM public.positions p
      WHERE p.user_id = v_user_id
        AND p.org_id = v_meeting_org_id
        AND p.title = 'BOARD'
        AND p.is_active = true
    )
  INTO v_is_owner

  IF NOT (v_is_owner OR v_is_board) THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check if member already voted remotely
  IF EXISTS (
    SELECT 1
    FROM public.meeting_remote_voters mrv
    WHERE mrv.meeting_id = p_meeting_id
      AND mrv.membership_id = p_membership_id
  ) THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Upsert attendance record
  INSERT INTO public.meeting_attendance (
    meeting_id
    membership_id
    present
    mode
    joined_at
  ) VALUES (
    p_meeting_id
    p_membership_id
    true
    'IN_PERSON'
    NOW()
  )
  ON CONFLICT (meeting_id
  DO UPDATE SET
    present = true
    mode = 'IN_PERSON'
    joined_at = COALESCE(meeting_attendance.joined_at
    updated_at = NOW();

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: reject_org
CREATE OR REPLACE FUNCTION public.reject_org(p_request_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status IN ('OPEN'
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'REJECTED'
      admin_note = p_admin_note
      decided_at = now()
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'REJECTED'
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id
      type
      title
      message
      metadata
      created_at
    )
    SELECT 
      m.user_id
      'ORG_REJECTED'
      'BendruomenÄ— atmesta'
      'JÅ«sÅ³ bendruomenÄ—s registracija buvo atmesta'
      jsonb_build_object(
        'org_id'
        'request_id'
        'admin_note'
      )
      now()
    FROM public.memberships m
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: request_org_changes
CREATE OR REPLACE FUNCTION public.request_org_changes(p_request_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status = 'OPEN';
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'NEEDS_CHANGES'
      admin_note = p_admin_note
      decided_at = now()
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'NEEDS_CHANGES'
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id
      type
      title
      message
      metadata
      created_at
    )
    SELECT 
      m.user_id
      'ORG_REVIEW_FEEDBACK'
      'Reikia pataisymÅ³ registracijoje'
      'Branduolio admin praÅo pataisyti registracijos duomenis'
      jsonb_build_object(
        'org_id'
        'request_id'
        'admin_note'
      )
      now()
    FROM public.memberships m
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: set_governance_schema_version_for_org
CREATE OR REPLACE FUNCTION public.set_governance_schema_version_for_org(p_org_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Update config
  UPDATE public.governance_configs
  SET 
    schema_version_no = p_schema_version_no
    last_validated_at = now()
    compliance_status = 'OK'
  WHERE org_id = p_org_id;
  
  -- Resolve compliance issues for this version
  UPDATE public.governance_compliance_issues
  SET resolved_at = now()
  WHERE org_id = p_org_id
    AND schema_version_no = p_schema_version_no
    AND resolved_at IS NULL;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: set_vote_live_totals
CREATE OR REPLACE FUNCTION public.set_vote_live_totals(p_vote_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_meeting_id uuid;
  v_computed_live_present_count int;
  v_computed_live_for_count int;
  v_vote_exists boolean;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get vote and meeting_id
  SELECT meeting_id INTO v_meeting_id
  FROM public.votes
  WHERE id = p_vote_id
    AND kind = 'GA';

  IF v_meeting_id IS NULL THEN
    RETURN QUERY SELECT false
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
      false
      'INVALID_TOTALS'::text
      v_computed_live_present_count
      v_computed_live_for_count;
    RETURN;
  END IF;

  -- Check if vote_live_totals table exists and insert/update
  -- Note: This assumes the table structure exists
  -- If table doesn't exist
  
  -- Try to insert/update (assuming table exists)
  INSERT INTO public.vote_live_totals (
    vote_id
    live_present_count
    live_for_count
    live_against_count
    live_abstain_count
    updated_at
  ) VALUES (
    p_vote_id
    v_computed_live_present_count
    v_computed_live_for_count
    p_live_against_count
    p_live_abstain_count
    NOW()
  )
  ON CONFLICT (vote_id)
  DO UPDATE SET
    live_present_count = v_computed_live_present_count
    live_for_count = v_computed_live_for_count
    live_against_count = p_live_against_count
    live_abstain_count = p_live_abstain_count
    updated_at = NOW();

  RETURN QUERY SELECT 
    true
    'OK'::text
    v_computed_live_present_count
    v_computed_live_for_count;
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist - return error
    RETURN QUERY SELECT false
  WHEN OTHERS THEN
    RETURN QUERY SELECT false
END;
$function$
"
"-- Function: submit_org_for_review
CREATE OR REPLACE FUNCTION public.submit_org_for_review(p_org_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_readiness RECORD;
  v_request_id UUID;
  v_existing_request UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER
  SELECT public.is_org_owner(v_user_id
  
  IF NOT v_is_owner THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if there's already an OPEN request
  SELECT id INTO v_existing_request
  FROM public.org_review_requests
  WHERE org_id = p_org_id
    AND status = 'OPEN';
  
  IF v_existing_request IS NOT NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check readiness
  SELECT * INTO v_readiness
  FROM public.org_onboarding_readiness
  WHERE org_id = p_org_id;
  
  IF NOT v_readiness.ready_to_submit THEN
    RETURN QUERY SELECT 
      false
      'NOT_READY'::TEXT
      NULL::UUID
      jsonb_build_object(
        'has_required_org_fields'
        'has_bylaws'
        'has_governance_required'
      );
    RETURN;
  END IF;
  
  -- Create request
  INSERT INTO public.org_review_requests (
    org_id
    requested_by
    status
    note
  ) VALUES (
    p_org_id
    v_user_id
    'OPEN'
    p_note
  )
  RETURNING id INTO v_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'SUBMITTED_FOR_REVIEW'
  WHERE id = p_org_id;
  
  -- Create notification for platform admin (if notifications table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    -- Insert notification for all platform admins
    INSERT INTO public.notifications (
      user_id
      type
      title
      message
      metadata
      created_at
    )
    SELECT 
      u.id
      'ORG_REVIEW_REQUEST'
      'Nauja bendruomenÄ— laukia patvirtinimo'
      'BendruomenÄ— ' || o.name || ' pateikta tvirtinimui'
      jsonb_build_object(
        'org_id'
        'org_name'
        'request_id'
      )
      now()
    FROM auth.users u
    CROSS JOIN public.orgs o
    WHERE o.id = p_org_id
      AND public.is_platform_admin(u.id);
  END IF;
  
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: unregister_in_person_attendance
CREATE OR REPLACE FUNCTION public.unregister_in_person_attendance(p_meeting_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Verify membership belongs to meeting org
  SELECT org_id INTO v_membership_org_id
  FROM public.memberships
  WHERE id = p_membership_id;

  IF v_membership_org_id IS NULL OR v_membership_org_id != v_meeting_org_id THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check if user is OWNER or BOARD
  SELECT 
    EXISTS(SELECT 1 FROM public.memberships WHERE user_id = v_user_id AND org_id = v_meeting_org_id AND role = 'OWNER')
    EXISTS(
      SELECT 1 FROM public.positions p
      WHERE p.user_id = v_user_id
        AND p.org_id = v_meeting_org_id
        AND p.title = 'BOARD'
        AND p.is_active = true
    )
  INTO v_is_owner

  IF NOT (v_is_owner OR v_is_board) THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Update attendance to present=false (or delete - we'll update for audit trail)
  UPDATE public.meeting_attendance
  SET present = false
      updated_at = NOW()
  WHERE meeting_id = p_meeting_id
    AND membership_id = p_membership_id;

  -- If no row was updated
  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: update_agenda_item
CREATE OR REPLACE FUNCTION public.update_agenda_item(p_agenda_item_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Update agenda item (only non-null fields)
  UPDATE public.meeting_agenda_items
  SET 
    item_no = COALESCE(p_item_no
    title = COALESCE(p_title
    summary = COALESCE(p_summary
    details = COALESCE(p_details
    resolution_id = COALESCE(p_resolution_id
    updated_at = NOW()
  WHERE id = p_agenda_item_id;
  
  RETURN QUERY SELECT true
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false
END;
$function$
"
"-- Function: update_contribution_status
CREATE OR REPLACE FUNCTION public.update_contribution_status(p_contribution_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_contribution RECORD;
  v_membership RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  IF p_status NOT IN ('PLEDGED'
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Get contribution
  SELECT * INTO v_contribution
  FROM public.project_contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_contribution.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;

  -- Update status
  UPDATE public.project_contributions
  SET status = p_status::text
      updated_at = now()
  WHERE id = p_contribution_id;

  RETURN QUERY SELECT true
END;
$function$
"
"-- Function: update_meeting_schedule
CREATE OR REPLACE FUNCTION public.update_meeting_schedule(p_meeting_id uuid
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_schedule_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT (can only update DRAFT)
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false
      RETURN;
    END IF;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(v_meeting.org_id
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false
      v_schedule_check.reason
      v_schedule_check.earliest_allowed
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Update meeting
  UPDATE public.meetings
  SET 
    scheduled_at = p_scheduled_at
    location = COALESCE(p_location
  WHERE id = p_meeting_id;
  
  RETURN QUERY SELECT 
    true
    'MEETING_UPDATED'
    v_schedule_check.earliest_allowed
    v_schedule_check.notice_days;
END;
$function$
"
"-- Function: update_member_role
CREATE OR REPLACE FUNCTION public.update_member_role(target_membership_id uuid
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_actor_role app_role;
begin
  select org_id into v_org_id from memberships where id = target_membership_id;
  v_actor_role := get_user_role(v_org_id);

  if v_actor_role not in ('OWNER'
    raise exception 'Access Denied';
  end if;

  update memberships set role = new_role where id = target_membership_id;

  insert into business_events (org_id
  values (v_org_id
end;
$function$
"
"-- Function: upsert_compliance_issues
CREATE OR REPLACE FUNCTION public.upsert_compliance_issues(p_org_id uuid
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_issue_code TEXT;
  v_severity TEXT;
  v_message TEXT;
  v_question_key TEXT;
  v_invalid_item JSONB;
BEGIN
  -- Resolve all existing issues for this org and version
  UPDATE public.governance_compliance_issues
  SET resolved_at = now()
  WHERE org_id = p_org_id
    AND schema_version_no = p_schema_version_no
    AND resolved_at IS NULL;
  
  -- Insert missing required issues
  IF array_length(p_missing_required
    FOREACH v_question_key IN ARRAY p_missing_required
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id
        schema_version_no
        issue_code
        severity
        question_key
        message
      ) VALUES (
        p_org_id
        p_schema_version_no
        'MISSING_REQUIRED'
        'error'
        v_question_key
        'TrÅ«ksta privalomo atsakymo: ' || v_question_key
      );
    END LOOP;
  END IF;
  
  -- Insert invalid type issues
  IF jsonb_array_length(p_invalid_types) > 0 THEN
    FOR v_invalid_item IN SELECT * FROM jsonb_array_elements(p_invalid_types)
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id
        schema_version_no
        issue_code
        severity
        question_key
        message
        details
      ) VALUES (
        p_org_id
        p_schema_version_no
        'INVALID_TYPE'
        'error'
        v_invalid_item->>'question_key'
        'Netinkamas tipas: ' || (v_invalid_item->>'question_key') || 
        ' (tikÄ—tasi: ' || (v_invalid_item->>'expected') || 
        '
        v_invalid_item
      );
    END LOOP;
  END IF;
  
  -- Insert inactive answered issues (warnings)
  IF array_length(p_inactive_answered
    FOREACH v_question_key IN ARRAY p_inactive_answered
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id
        schema_version_no
        issue_code
        severity
        question_key
        message
      ) VALUES (
        p_org_id
        p_schema_version_no
        'INACTIVE_ANSWERED'
        'warning'
        v_question_key
        'Atsakyta ÄÆ neaktyvÅ³ klausimÄ…: ' || v_question_key
      );
    END LOOP;
  END IF;
END;
$function$
"
"-- Function: user_has_active_membership_in_org
CREATE OR REPLACE FUNCTION public.user_has_active_membership_in_org(target_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  -- Direct query without RLS (SECURITY DEFINER)
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE org_id = target_org_id
    AND user_id = auth.uid()
    AND member_status = 'ACTIVE'
  );
END;
$function$
"
"-- Function: validate_governance_for_org
CREATE OR REPLACE FUNCTION public.validate_governance_for_org(p_org_id uuid)
 RETURNS TABLE(ok boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_schema_version INTEGER;
  v_org_version INTEGER;
  v_answers JSONB;
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_invalid JSONB := '[]'::JSONB;
  v_inactive TEXT[] := ARRAY[]::TEXT[];
  v_status TEXT := 'OK';
  v_question RECORD;
  v_answer_value TEXT;
  v_answer_json JSONB;
  v_option_values TEXT[];
  v_details JSONB;
BEGIN
  -- Get active schema version
  v_schema_version := public.get_active_schema_version();
  
  -- Get org's config
  SELECT 
    gc.schema_version_no
    gc.answers
  INTO 
    v_org_version
    v_answers
  FROM public.governance_configs gc
  WHERE gc.org_id = p_org_id;
  
  -- If no config exists
  IF v_answers IS NULL THEN
    SELECT array_agg(question_key) INTO v_missing
    FROM public.governance_questions
    WHERE is_required = true 
      AND is_active = true;
    
    RETURN QUERY SELECT 
      false AS ok
      'INVALID'::TEXT AS status
      v_schema_version::INTEGER AS schema_version_no
      v_missing AS missing_required
      '[]'::JSONB AS invalid_types
      ARRAY[]::TEXT[] AS inactive_answered
      jsonb_build_object('reason'
    RETURN;
  END IF;
  
  -- Check each active required question
  FOR v_question IN 
    SELECT * FROM public.governance_questions
    WHERE is_active = true
    ORDER BY question_key
  LOOP
    -- Check if answer exists
    IF NOT (v_answers ? v_question.question_key) THEN
      IF v_question.is_required THEN
        v_missing := array_append(v_missing
      END IF;
      CONTINUE;
    END IF;
    
    -- Get answer value
    v_answer_value := v_answers->>v_question.question_key;
    
    -- For required questions
    IF v_question.is_required THEN
      IF v_answer_value IS NULL OR v_answer_value = '' OR trim(v_answer_value) = '' THEN
        v_missing := array_append(v_missing
        CONTINUE;
      END IF;
    ELSE
      -- Skip null/empty values for non-required
      IF (v_answer_value IS NULL OR v_answer_value = '' OR trim(v_answer_value) = '') THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Validate type
    BEGIN
      v_answer_json := v_answers->v_question.question_key;
    EXCEPTION
      WHEN OTHERS THEN
        v_answer_json := to_jsonb(v_answer_value);
    END;
    
    -- Type validation based on question_type
    CASE v_question.question_type
      WHEN 'checkbox' THEN
        -- Must be boolean
        IF jsonb_typeof(v_answer_json) != 'boolean' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key'
            'expected'
            'actual_type'
            'value'
          );
        END IF;
        
      WHEN 'number' THEN
        -- Must be number (or string that can be converted to number)
        IF jsonb_typeof(v_answer_json) = 'number' THEN
          -- Valid number type
          NULL;
        ELSIF jsonb_typeof(v_answer_json) = 'string' THEN
          -- Try to parse as number
          BEGIN
            -- Check if string is a valid number
            IF v_answer_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
              -- Valid number string - this is acceptable
              NULL;
            ELSE
              -- Invalid number string
              v_invalid := v_invalid || jsonb_build_object(
                'question_key'
                'expected'
                'actual_type'
                'value'
              );
            END IF;
          EXCEPTION
            WHEN OTHERS THEN
              v_invalid := v_invalid || jsonb_build_object(
                'question_key'
                'expected'
                'actual_type'
                'value'
              );
          END;
        ELSE
          -- Invalid type
          v_invalid := v_invalid || jsonb_build_object(
            'question_key'
            'expected'
            'actual_type'
            'value'
          );
        END IF;
        
      WHEN 'radio' THEN
        -- Must be string and value must be in options
        IF jsonb_typeof(v_answer_json) != 'string' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key'
            'expected'
            'actual_type'
            'value'
          );
        ELSE
          -- Check if value is in options
          IF v_question.options IS NOT NULL THEN
            SELECT array_agg((option->>'value')) INTO v_option_values
            FROM jsonb_array_elements(v_question.options) AS option;
            
            IF NOT (v_answer_value = ANY(v_option_values)) THEN
              v_invalid := v_invalid || jsonb_build_object(
                'question_key'
                'expected'
                'actual_type'
                'value'
              );
            END IF;
          END IF;
        END IF;
        
      WHEN 'text' THEN
        -- Must be string
        IF jsonb_typeof(v_answer_json) != 'string' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key'
            'expected'
            'actual_type'
            'value'
          );
        END IF;
        
      ELSE
        -- Unknown type - warning
        NULL;
    END CASE;
  END LOOP;
  
  -- Check for inactive questions that are answered
  SELECT array_agg(question_key) INTO v_inactive
  FROM (
    SELECT key AS question_key
    FROM jsonb_each_text(v_answers)
  ) AS answered_keys
  WHERE NOT EXISTS (
    SELECT 1 FROM public.governance_questions q
    WHERE q.question_key = answered_keys.question_key
      AND q.is_active = true
  );
  
  -- Determine status
  -- Priority: INVALID > NEEDS_UPDATE > OK
  IF array_length(v_missing
    v_status := 'INVALID';
  ELSIF array_length(v_inactive
    -- Inactive answered questions are warnings
    -- If no missing/invalid
    v_status := 'OK';
  ELSIF v_org_version IS NULL OR v_org_version < v_schema_version THEN
    -- Version mismatch - but if all required are answered and valid
    -- Version mismatch alone is not a blocker if data is complete
    v_status := 'OK';
  ELSE
    v_status := 'OK';
  END IF;
  
  -- Build details
  v_details := jsonb_build_object(
    'org_version'
    'schema_version'
    'version_mismatch'
  );
  
  RETURN QUERY SELECT 
    (v_status = 'OK') AS ok
    v_status::TEXT AS status
    v_schema_version::INTEGER AS schema_version_no
    COALESCE(v_missing
    COALESCE(v_invalid
    COALESCE(v_inactive
    v_details::JSONB AS details;
END;
$function$
"

-- VIEWS
-- ==================================================

"CREATE OR REPLACE VIEW governance_config_validation AS 
 WITH q AS (
         SELECT governance_questions.question_key
            governance_questions.question_type
            COALESCE(governance_questions.is_required
            COALESCE(governance_questions.is_active
            COALESCE(governance_questions.options
           FROM governance_questions
        )
         SELECT governance_configs.org_id
            governance_configs.answers
           FROM governance_configs
        )
         SELECT o.org_id
            k.key AS answer_key
            (o.answers -> k.key) AS answer_value
            jsonb_typeof((o.answers -> k.key)) AS answer_json_type
            (o.answers ->> k.key) AS answer_text
           FROM (orgs o
             CROSS JOIN LATERAL jsonb_object_keys(o.answers) k(key))
        )
         SELECT a.org_id
            'UNKNOWN_ANSWER_KEY'::text AS issue_code
            a.answer_key AS question_key
            'error'::text AS severity
            'Atsakymo raktas neegzistuoja governance_questions'::text AS message
            jsonb_build_object('answer_key'
           FROM (a
             LEFT JOIN q ON ((q.question_key = a.answer_key)))
          WHERE (q.question_key IS NULL)
        )
         SELECT a.org_id
            'INACTIVE_QUESTION_ANSWERED'::text AS issue_code
            a.answer_key AS question_key
            'warning'::text AS severity
            'Atsakyta ÄÆ neaktyvÅ³ klausimÄ…'::text AS message
            jsonb_build_object('answer_key'
           FROM (a
             JOIN q ON ((q.question_key = a.answer_key)))
          WHERE (q.is_active = false)
        )
         SELECT o.org_id
            'MISSING_REQUIRED'::text AS issue_code
            q.question_key
            'error'::text AS severity
            'TrÅ«ksta privalomo atsakymo'::text AS message
            jsonb_build_object('question_key'
           FROM ((orgs o
             JOIN q ON (((q.is_active = true) AND (q.is_required = true))))
             LEFT JOIN a ON (((a.org_id = o.org_id) AND (a.answer_key = q.question_key))))
          WHERE (a.answer_key IS NULL)
        )
         SELECT a.org_id
            'INVALID_TYPE'::text AS issue_code
            a.answer_key AS question_key
            'error'::text AS severity
            'Neteisingas atsakymo tipas pagal question_type'::text AS message
            jsonb_build_object('value'
           FROM (a
             JOIN q ON ((q.question_key = a.answer_key)))
          WHERE ((q.is_active = true) AND (((q.question_type = 'radio'::text) AND (a.answer_json_type IS DISTINCT FROM 'string'::text)) OR ((q.question_type = 'number'::text) AND (a.answer_json_type IS DISTINCT FROM 'number'::text)) OR ((q.question_type = 'checkbox'::text) AND (a.answer_json_type IS DISTINCT FROM 'boolean'::text)) OR ((q.question_type = 'boolean'::text) AND (a.answer_json_type IS DISTINCT FROM 'boolean'::text))))
        )
         SELECT a.org_id
            'INVALID_OPTION'::text AS issue_code
            a.answer_key AS question_key
            'error'::text AS severity
            'Atsakymas neatitinka leistinÅ³ pasirinkimÅ³ (options[].value)'::text AS message
            jsonb_build_object('value'
           FROM (a
             JOIN q ON ((q.question_key = a.answer_key)))
          WHERE ((q.is_active = true) AND (q.question_type = 'radio'::text) AND (jsonb_typeof(q.options) = 'array'::text) AND (NOT (EXISTS ( SELECT 1
                   FROM jsonb_array_elements(q.options) opt(value)
                  WHERE ((opt.value ->> 'value'::text) = a.answer_text)))))
        )
 SELECT missing_required.org_id
    missing_required.issue_code
    missing_required.question_key
    missing_required.severity
    missing_required.message
    missing_required.details
   FROM missing_required
UNION ALL
 SELECT unknown_answer_key.org_id
    unknown_answer_key.issue_code
    unknown_answer_key.question_key
    unknown_answer_key.severity
    unknown_answer_key.message
    unknown_answer_key.details
   FROM unknown_answer_key
UNION ALL
 SELECT inactive_question_answered.org_id
    inactive_question_answered.issue_code
    inactive_question_answered.question_key
    inactive_question_answered.severity
    inactive_question_answered.message
    inactive_question_answered.details
   FROM inactive_question_answered
UNION ALL
 SELECT invalid_type.org_id
    invalid_type.issue_code
    invalid_type.question_key
    invalid_type.severity
    invalid_type.message
    invalid_type.details
   FROM invalid_type
UNION ALL
 SELECT invalid_option_radio.org_id
    invalid_option_radio.issue_code
    invalid_option_radio.question_key
    invalid_option_radio.severity
    invalid_option_radio.message
    invalid_option_radio.details
   FROM invalid_option_radio;;"
"CREATE OR REPLACE VIEW idea_vote_tally AS 
 SELECT iv.idea_id
    iv.id AS vote_id
    iv.org_id
    iv.status AS vote_status
    iv.closes_at
    (count(
        CASE
            WHEN (ib.choice = 'FOR'::text) THEN 1
            ELSE NULL::integer
        END))::integer AS votes_for
    (count(
        CASE
            WHEN (ib.choice = 'AGAINST'::text) THEN 1
            ELSE NULL::integer
        END))::integer AS votes_against
    (count(ib.id))::integer AS votes_total
    ( SELECT (count(*))::integer AS count
           FROM memberships
          WHERE ((memberships.org_id = iv.org_id) AND (memberships.status = 'ACTIVE'::member_status))) AS total_active_members
        CASE
            WHEN ((iv.status = 'OPEN'::text) AND (now() < iv.closes_at)) THEN 'OPEN'::text
            WHEN ((iv.status = 'CLOSED'::text) OR (now() >= iv.closes_at)) THEN 'CLOSED'::text
            ELSE 'OPEN'::text
        END AS effective_status
   FROM (idea_votes iv
     LEFT JOIN idea_ballots ib ON ((iv.id = ib.idea_vote_id)))
  GROUP BY iv.id
"CREATE OR REPLACE VIEW meeting_agenda_public AS 
 SELECT m.id AS meeting_id
    m.org_id
    m.title AS meeting_title
    m.scheduled_at
    m.location
    m.status AS meeting_status
    m.published_at
    ai.id AS agenda_item_id
    ai.item_no
    ai.title AS item_title
    ai.summary
    ai.details
    ai.resolution_id
    aa.id AS attachment_id
    aa.storage_path
    aa.file_name
    aa.mime_type
    aa.size_bytes
   FROM ((meetings m
     LEFT JOIN meeting_agenda_items ai ON ((ai.meeting_id = m.id)))
     LEFT JOIN meeting_agenda_attachments aa ON ((aa.agenda_item_id = ai.id)))
  WHERE (m.status = 'PUBLISHED'::text)
  ORDER BY m.scheduled_at DESC
"CREATE OR REPLACE VIEW meeting_remote_voters AS 
 SELECT DISTINCT v.meeting_id
    vb.membership_id
   FROM (votes v
     JOIN vote_ballots vb ON ((vb.vote_id = v.id)))
  WHERE ((v.kind = 'GA'::vote_kind) AND (v.meeting_id IS NOT NULL) AND (vb.channel = ANY (ARRAY['WRITTEN'::vote_channel
"CREATE OR REPLACE VIEW member_debts AS 
 SELECT m.id AS membership_id
    m.org_id
    m.user_id
    m.member_status
    p.full_name
    p.email
    count(i.id) FILTER (WHERE (i.status = 'OVERDUE'::invoice_status)) AS overdue_count
    count(i.id) FILTER (WHERE (i.status = 'SENT'::invoice_status)) AS pending_count
    COALESCE(sum(i.amount) FILTER (WHERE (i.status = ANY (ARRAY['OVERDUE'::invoice_status
    max(i.due_date) FILTER (WHERE (i.status = 'OVERDUE'::invoice_status)) AS oldest_overdue_date
        CASE
            WHEN (count(i.id) FILTER (WHERE (i.status = 'OVERDUE'::invoice_status)) > 0) THEN 'DEBTOR'::text
            WHEN (count(i.id) FILTER (WHERE (i.status = 'SENT'::invoice_status)) > 0) THEN 'PENDING'::text
            ELSE 'PAID_UP'::text
        END AS debt_status
   FROM ((memberships m
     LEFT JOIN profiles p ON ((p.id = m.user_id)))
     LEFT JOIN invoices i ON ((i.membership_id = m.id)))
  WHERE (m.member_status = 'ACTIVE'::text)
  GROUP BY m.id
"CREATE OR REPLACE VIEW org_activation_state AS 
 SELECT id AS org_id
    status AS org_status
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM org_rulesets r
              WHERE ((r.org_id = o.id) AND (r.status = 'ACTIVE'::text)))) THEN true
            ELSE false
        END AS has_active_ruleset
   FROM orgs o;;"
"CREATE OR REPLACE VIEW org_onboarding_readiness AS 
 SELECT id AS org_id
    ((name IS NOT NULL) AND (name <> ''::text) AND (slug IS NOT NULL) AND (slug <> ''::text) AND (EXISTS ( SELECT 1
           FROM memberships m
          WHERE ((m.org_id = o.id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text) AND (EXISTS ( SELECT 1
                   FROM auth.users u
                  WHERE ((u.id = m.user_id) AND (u.email IS NOT NULL)))))))) AS has_required_org_fields
    check_org_has_bylaws(id) AS has_bylaws
    (NOT (EXISTS ( SELECT 1
           FROM governance_questions q
          WHERE ((q.is_required = true) AND (q.is_active = true) AND (NOT (EXISTS ( SELECT 1
                   FROM governance_configs gc
                  WHERE ((gc.org_id = o.id) AND (gc.answers ? q.question_key) AND ((gc.answers ->> q.question_key) IS NOT NULL) AND ((gc.answers ->> q.question_key) <> ''::text))))))))) AS has_governance_required
    ((name IS NOT NULL) AND (name <> ''::text) AND (slug IS NOT NULL) AND (slug <> ''::text) AND (EXISTS ( SELECT 1
           FROM memberships m
          WHERE ((m.org_id = o.id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text) AND (EXISTS ( SELECT 1
                   FROM auth.users u
                  WHERE ((u.id = m.user_id) AND (u.email IS NOT NULL))))))) AND check_org_has_bylaws(id) AND (NOT (EXISTS ( SELECT 1
           FROM governance_questions q
          WHERE ((q.is_required = true) AND (q.is_active = true) AND (NOT (EXISTS ( SELECT 1
                   FROM governance_configs gc
                  WHERE ((gc.org_id = o.id) AND (gc.answers ? q.question_key) AND ((gc.answers ->> q.question_key) IS NOT NULL) AND ((gc.answers ->> q.question_key) <> ''::text)))))))))) AS ready_to_submit
   FROM orgs o;;"
"CREATE OR REPLACE VIEW project_funding_totals AS 
 SELECT p.id AS project_id
    p.org_id
    p.budget_eur AS goal_budget_eur
    (COALESCE(sum(
        CASE
            WHEN ((pc.kind = 'MONEY'::text) AND (pc.status = 'PLEDGED'::text)) THEN pc.money_amount_eur
            ELSE (0)::numeric
        END)
    (COALESCE(sum(
        CASE
            WHEN ((pc.kind = 'MONEY'::text) AND (pc.status = 'RECEIVED'::text)) THEN pc.money_amount_eur
            ELSE (0)::numeric
        END)
    (count(
        CASE
            WHEN ((pc.kind = 'IN_KIND'::text) AND (pc.status = 'PLEDGED'::text)) THEN 1
            ELSE NULL::integer
        END))::integer AS pledged_in_kind_count
    (COALESCE(sum(
        CASE
            WHEN ((pc.kind = 'WORK'::text) AND (pc.status = 'PLEDGED'::text) AND ((pc.work_offer ->> 'hours'::text) IS NOT NULL)) THEN ((pc.work_offer ->> 'hours'::text))::numeric
            ELSE (0)::numeric
        END)
        CASE
            WHEN (p.budget_eur > (0)::numeric) THEN (((COALESCE(sum(
            CASE
                WHEN ((pc.kind = 'MONEY'::text) AND (pc.status = 'RECEIVED'::text)) THEN pc.money_amount_eur
                ELSE (0)::numeric
            END)
            ELSE (0)::numeric
        END AS progress_ratio
   FROM (projects p
     LEFT JOIN project_contributions pc ON ((p.id = pc.project_id)))
  GROUP BY p.id
"CREATE OR REPLACE VIEW simple_vote_tallies AS 
 SELECT sv.id AS vote_id
    (count(
        CASE
            WHEN (svb.choice = 'FOR'::vote_choice) THEN 1
            ELSE NULL::integer
        END))::integer AS votes_for
    (count(
        CASE
            WHEN (svb.choice = 'AGAINST'::vote_choice) THEN 1
            ELSE NULL::integer
        END))::integer AS votes_against
    (count(
        CASE
            WHEN (svb.choice = 'ABSTAIN'::vote_choice) THEN 1
            ELSE NULL::integer
        END))::integer AS votes_abstain
    (count(svb.id))::integer AS votes_total
    (count(DISTINCT svb.membership_id))::integer AS unique_voters
   FROM (simple_votes sv
     LEFT JOIN simple_vote_ballots svb ON ((svb.vote_id = sv.id)))
  GROUP BY sv.id;;"
"CREATE OR REPLACE VIEW vote_tallies AS 
 SELECT v.id AS vote_id
    v.org_id
    v.resolution_id
    v.kind
    v.meeting_id
    v.status
    (count(*) FILTER (WHERE ((b.choice)::text = 'FOR'::text)))::integer AS votes_for
    (count(*) FILTER (WHERE ((b.choice)::text = 'AGAINST'::text)))::integer AS votes_against
    (count(*) FILTER (WHERE ((b.choice)::text = 'ABSTAIN'::text)))::integer AS votes_abstain
    (count(*))::integer AS votes_total
    (count(DISTINCT b.membership_id))::integer AS unique_voters
   FROM (votes v
     LEFT JOIN vote_ballots b ON ((b.vote_id = v.id)))
  GROUP BY v.id

-- RLS POLICIES
-- ==================================================

"CREATE POLICY ""Insert audit logs"" ON audit_logs
  FOR INSERT
  TO {public}
  WITH CHECK (true);"
"CREATE POLICY ""Owners view audit"" ON audit_logs
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = audit_logs.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Admins view audit"" ON business_events
  FOR SELECT
  TO {public}
  USING ((get_user_role(org_id) = ANY (ARRAY['ADMIN'::app_role
"CREATE POLICY ""System insert audit"" ON business_events
  FOR INSERT
  TO {public}
  WITH CHECK ((auth.uid() = actor_id));"
"CREATE POLICY ""community_applications_insert_anon"" ON community_applications
  FOR INSERT
  TO {anon
  WITH CHECK (true);"
"CREATE POLICY ""community_applications_select_admin"" ON community_applications
  FOR SELECT
  TO {authenticated}
  USING (((EXISTS ( SELECT 1
   FROM (memberships m
     JOIN orgs o ON ((o.id = m.org_id)))
  WHERE ((m.user_id = auth.uid()) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text) AND (o.slug = ANY (ARRAY['branduolys'::text
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.email)::text = 'admin@pastas.email'::text))))));"
"CREATE POLICY ""community_applications_update_admin"" ON community_applications
  FOR UPDATE
  TO {authenticated}
  USING (((EXISTS ( SELECT 1
   FROM (memberships m
     JOIN orgs o ON ((o.id = m.org_id)))
  WHERE ((m.user_id = auth.uid()) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text) AND (o.slug = ANY (ARRAY['branduolys'::text
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.email)::text = 'admin@pastas.email'::text))))));"
"CREATE POLICY ""OWNER can manage governance configs"" ON governance_configs
  FOR ALL
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = governance_configs.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.role = 'OWNER'::app_role) AND (memberships.member_status = 'ACTIVE'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = governance_configs.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.role = 'OWNER'::app_role) AND (memberships.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Users can read governance configs for their orgs"" ON governance_configs
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = governance_configs.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Users can read active questions"" ON governance_questions
  FOR SELECT
  TO {public}
  USING ((is_active = true));"
"CREATE POLICY ""idea_attachments_insert_owner_board"" ON idea_attachments
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (ideas i
     JOIN memberships m ON ((m.org_id = i.org_id)))
  WHERE ((i.id = idea_attachments.idea_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""idea_attachments_select_member"" ON idea_attachments
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM (ideas i
     JOIN memberships m ON ((m.org_id = i.org_id)))
  WHERE ((i.id = idea_attachments.idea_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""idea_ballots_insert_member"" ON idea_ballots
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (memberships m
     JOIN idea_votes iv ON ((iv.org_id = m.org_id)))
  WHERE ((m.id = idea_ballots.membership_id) AND (iv.id = idea_ballots.idea_vote_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""idea_ballots_select_member"" ON idea_ballots
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM (idea_votes iv
     JOIN memberships m ON ((m.org_id = iv.org_id)))
  WHERE ((iv.id = idea_ballots.idea_vote_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""idea_ballots_update_member"" ON idea_ballots
  FOR UPDATE
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = idea_ballots.membership_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""idea_votes_insert_owner_board"" ON idea_votes
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = idea_votes.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""idea_votes_select_member"" ON idea_votes
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = idea_votes.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""idea_votes_update_owner_board"" ON idea_votes
  FOR UPDATE
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = idea_votes.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""ideas_insert_owner_board"" ON ideas
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = ideas.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""ideas_select_member"" ON ideas
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = ideas.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""ideas_update_owner_board"" ON ideas
  FOR UPDATE
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = ideas.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""Admins view all invoices"" ON invoices
  FOR SELECT
  TO {public}
  USING ((get_user_role(org_id) = ANY (ARRAY['ADMIN'::app_role
"CREATE POLICY ""Users view own invoices"" ON invoices
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = invoices.membership_id) AND (m.user_id = auth.uid())))));"
"CREATE POLICY ""invoice_insert_by_owner"" ON invoices
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = invoices.org_id) AND (m.user_id = auth.uid()) AND (m.role = 'OWNER'::app_role) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""invoice_select_active_members"" ON invoices
  FOR SELECT
  TO {public}
  USING (((status <> 'DRAFT'::invoice_status) AND (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = invoices.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status))))));"
"CREATE POLICY ""invoice_update_by_owner"" ON invoices
  FOR UPDATE
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = invoices.org_id) AND (m.user_id = auth.uid()) AND (m.role = 'OWNER'::app_role) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""Upload media"" ON media_items
  FOR INSERT
  TO {public}
  WITH CHECK (is_member_of(org_id));"
"CREATE POLICY ""View media"" ON media_items
  FOR SELECT
  TO {public}
  USING (true);"
"CREATE POLICY ""Members can read attachments for PUBLISHED meetings"" ON meeting_agenda_attachments
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (meeting_agenda_items ai
     JOIN meetings m ON ((m.id = ai.meeting_id)))
  WHERE ((ai.id = meeting_agenda_attachments.agenda_item_id) AND (m.status = 'PUBLISHED'::text) AND (EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text))))))));"
"CREATE POLICY ""OWNER/BOARD can manage attachments for DRAFT meetings"" ON meeting_agenda_attachments
  FOR ALL
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (meeting_agenda_items ai
     JOIN meetings m ON ((m.id = ai.meeting_id)))
  WHERE ((ai.id = meeting_agenda_attachments.agenda_item_id) AND (m.status = 'DRAFT'::text) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (meeting_agenda_items ai
     JOIN meetings m ON ((m.id = ai.meeting_id)))
  WHERE ((ai.id = meeting_agenda_attachments.agenda_item_id) AND (m.status = 'DRAFT'::text) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""OWNER/BOARD can read attachments for DRAFT/PUBLISHED meetings"" ON meeting_agenda_attachments
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (meeting_agenda_items ai
     JOIN meetings m ON ((m.id = ai.meeting_id)))
  WHERE ((ai.id = meeting_agenda_attachments.agenda_item_id) AND (m.status = ANY (ARRAY['DRAFT'::text
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""Members can read agenda items for PUBLISHED meetings"" ON meeting_agenda_items
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_agenda_items.meeting_id) AND (m.status = 'PUBLISHED'::text) AND (EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text))))))));"
"CREATE POLICY ""OWNER/BOARD can manage agenda items for DRAFT meetings"" ON meeting_agenda_items
  FOR ALL
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_agenda_items.meeting_id) AND (m.status = 'DRAFT'::text) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_agenda_items.meeting_id) AND (m.status = 'DRAFT'::text) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""OWNER/BOARD can read agenda items for DRAFT/PUBLISHED meetings"" ON meeting_agenda_items
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_agenda_items.meeting_id) AND (m.status = ANY (ARRAY['DRAFT'::text
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""Members can view attendance"" ON meeting_attendance
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (memberships m
     JOIN meetings mt ON ((mt.org_id = m.org_id)))
  WHERE ((mt.id = meeting_attendance.meeting_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""OWNER can manage attendance"" ON meeting_attendance
  FOR ALL
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (memberships m
     JOIN meetings mt ON ((mt.org_id = m.org_id)))
  WHERE ((mt.id = meeting_attendance.meeting_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text) AND (m.role = 'OWNER'::app_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (memberships m
     JOIN meetings mt ON ((mt.org_id = m.org_id)))
  WHERE ((mt.id = meeting_attendance.meeting_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text) AND (m.role = 'OWNER'::app_role)))));"
"CREATE POLICY ""Members can read signatures for FINAL protocols in their org"" ON meeting_protocol_signatures
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (meeting_protocols mp
     JOIN meetings m ON ((m.id = mp.meeting_id)))
  WHERE ((mp.id = meeting_protocol_signatures.protocol_id) AND (mp.status = 'FINAL'::text) AND (EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text))))))));"
"CREATE POLICY ""OWNER/BOARD can manage signatures for protocols in their org"" ON meeting_protocol_signatures
  FOR ALL
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (meeting_protocols mp
     JOIN meetings m ON ((m.id = mp.meeting_id)))
  WHERE ((mp.id = meeting_protocol_signatures.protocol_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (meeting_protocols mp
     JOIN meetings m ON ((m.id = mp.meeting_id)))
  WHERE ((mp.id = meeting_protocol_signatures.protocol_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""Members can read FINAL protocols in their org"" ON meeting_protocols
  FOR SELECT
  TO {authenticated}
  USING (((status = 'FINAL'::text) AND (EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_protocols.meeting_id) AND (EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text)))))))));"
"CREATE POLICY ""OWNER/BOARD can create protocols in their org"" ON meeting_protocols
  FOR INSERT
  TO {authenticated}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_protocols.meeting_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""OWNER/BOARD can read DRAFT/FINAL protocols in their org"" ON meeting_protocols
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_protocols.meeting_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""OWNER/BOARD can update DRAFT protocols"" ON meeting_protocols
  FOR UPDATE
  TO {authenticated}
  USING (((status = 'DRAFT'::text) AND (EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_protocols.meeting_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text))))))))))
  WITH CHECK (((status = 'DRAFT'::text) AND (EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_protocols.meeting_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = m.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = m.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text))))))))));"
"CREATE POLICY ""Prevent UPDATE of FINAL protocols"" ON meeting_protocols
  FOR UPDATE
  TO {authenticated}
  USING ((status <> 'FINAL'::text))
  WITH CHECK ((status <> 'FINAL'::text));"
"CREATE POLICY ""Admins manage meetings"" ON meetings
  FOR ALL
  TO {public}
  USING ((get_user_role(org_id) = ANY (ARRAY['ADMIN'::app_role
"CREATE POLICY ""Members can read PUBLISHED meetings"" ON meetings
  FOR SELECT
  TO {authenticated}
  USING (((status = 'PUBLISHED'::text) AND (EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = meetings.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text))))));"
"CREATE POLICY ""Members view meetings"" ON meetings
  FOR SELECT
  TO {public}
  USING (is_member_of(org_id));"
"CREATE POLICY ""OWNER/BOARD can create meetings"" ON meetings
  FOR INSERT
  TO {authenticated}
  WITH CHECK (((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = meetings.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
   FROM positions
  WHERE ((positions.org_id = meetings.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text))))));"
"CREATE POLICY ""OWNER/BOARD can read DRAFT/PUBLISHED meetings"" ON meetings
  FOR SELECT
  TO {authenticated}
  USING (((status = ANY (ARRAY['DRAFT'::text
   FROM memberships
  WHERE ((memberships.org_id = meetings.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
   FROM positions
  WHERE ((positions.org_id = meetings.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))));"
"CREATE POLICY ""OWNER/BOARD can update DRAFT meetings"" ON meetings
  FOR UPDATE
  TO {authenticated}
  USING (((status = 'DRAFT'::text) AND ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = meetings.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
   FROM positions
  WHERE ((positions.org_id = meetings.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))
  WITH CHECK (((status = 'DRAFT'::text) AND ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = meetings.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
   FROM positions
  WHERE ((positions.org_id = meetings.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))));"
"CREATE POLICY ""Users can insert their own consents"" ON member_consents
  FOR INSERT
  TO {public}
  WITH CHECK ((auth.uid() = user_id));"
"CREATE POLICY ""Users can read their own consents"" ON member_consents
  FOR SELECT
  TO {public}
  USING ((auth.uid() = user_id));"
"CREATE POLICY ""Users can update their own consents"" ON member_consents
  FOR UPDATE
  TO {public}
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));"
"CREATE POLICY ""deny public read invites"" ON member_invites
  FOR SELECT
  TO {public}
  USING (false);"
"CREATE POLICY ""members create invites"" ON member_invites
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = member_invites.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.status = 'ACTIVE'::member_status) AND (memberships.role = 'OWNER'::app_role)))));"
"CREATE POLICY ""Members view colleagues"" ON memberships
  FOR SELECT
  TO {public}
  USING (is_member_of(org_id));"
"CREATE POLICY ""org_review_requests_insert_owner"" ON org_review_requests
  FOR INSERT
  TO {public}
  WITH CHECK (((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = org_review_requests.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))) AND (requested_by = auth.uid()) AND (status = 'OPEN'::text)));"
"CREATE POLICY ""org_review_requests_select_admin"" ON org_review_requests
  FOR SELECT
  TO {public}
  USING (is_platform_admin(auth.uid()));"
"CREATE POLICY ""org_review_requests_select_owner"" ON org_review_requests
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = org_review_requests.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""org_review_requests_update_admin"" ON org_review_requests
  FOR UPDATE
  TO {public}
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));"
"CREATE POLICY ""OWNER can manage PROPOSED rulesets"" ON org_rulesets
  FOR ALL
  TO {public}
  USING (((status = 'PROPOSED'::text) AND (EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = org_rulesets.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.role = 'OWNER'::app_role) AND (memberships.member_status = 'ACTIVE'::text))))))
  WITH CHECK (((status = 'PROPOSED'::text) AND (EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = org_rulesets.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.role = 'OWNER'::app_role) AND (memberships.member_status = 'ACTIVE'::text))))));"
"CREATE POLICY ""Users can read rulesets for their orgs"" ON org_rulesets
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = org_rulesets.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Members can view org"" ON orgs
  FOR SELECT
  TO {public}
  USING (is_member_of(id));"
"CREATE POLICY ""anon_select_orgs_public"" ON orgs
  FOR SELECT
  TO {anon}
  USING (true);"
"CREATE POLICY ""org_public_read"" ON orgs
  FOR SELECT
  TO {public}
  USING (true);"
"CREATE POLICY ""Members view positions"" ON positions
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = positions.org_id) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Owners manage positions"" ON positions
  FOR ALL
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = positions.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = positions.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""anon_select_active_positions"" ON positions
  FOR SELECT
  TO {anon}
  USING ((is_active = true));"
"CREATE POLICY ""Public read profiles"" ON profiles
  FOR SELECT
  TO {public}
  USING (true);"
"CREATE POLICY ""Users update own profile"" ON profiles
  FOR UPDATE
  TO {public}
  USING ((auth.uid() = id));"
"CREATE POLICY ""anon_select_profiles_public"" ON profiles
  FOR SELECT
  TO {anon}
  USING (true);"
"CREATE POLICY ""project_contributions_insert_member"" ON project_contributions
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = project_contributions.membership_id) AND (m.org_id = project_contributions.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""project_contributions_select_member"" ON project_contributions
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = project_contributions.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""project_contributions_update_member"" ON project_contributions
  FOR UPDATE
  TO {public}
  USING (((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.id = project_contributions.membership_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))) AND (status = 'PLEDGED'::text)));"
"CREATE POLICY ""project_contributions_update_status_owner_board"" ON project_contributions
  FOR UPDATE
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = project_contributions.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""Admins update projects"" ON projects
  FOR UPDATE
  TO {public}
  USING ((get_user_role(org_id) = ANY (ARRAY['ADMIN'::app_role
"CREATE POLICY ""Members create projects"" ON projects
  FOR INSERT
  TO {public}
  WITH CHECK (is_member_of(org_id));"
"CREATE POLICY ""Public view projects"" ON projects
  FOR SELECT
  TO {public}
  USING (true);"
"CREATE POLICY ""projects_insert_owner_board"" ON projects
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = projects.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""projects_select_member"" ON projects
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = projects.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status)))));"
"CREATE POLICY ""projects_update_owner_board"" ON projects
  FOR UPDATE
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.org_id = projects.org_id) AND (m.user_id = auth.uid()) AND (m.status = 'ACTIVE'::member_status) AND ((m.role = 'OWNER'::app_role) OR (EXISTS ( SELECT 1
           FROM positions pos
          WHERE ((pos.user_id = auth.uid()) AND (pos.org_id = m.org_id) AND (pos.title = 'BOARD'::text) AND (pos.is_active = true)))))))));"
"CREATE POLICY ""Owners manage resolutions"" ON resolutions
  FOR ALL
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = resolutions.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = resolutions.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Resolutions visibility access"" ON resolutions
  FOR SELECT
  TO {public}
  USING (((visibility = 'PUBLIC'::text) OR ((visibility = 'MEMBERS'::text) AND (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = resolutions.org_id) AND (m.member_status = 'ACTIVE'::text))))) OR ((visibility = 'BOARD'::text) AND (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.org_id = resolutions.org_id) AND (m.role = 'OWNER'::app_role) AND (m.member_status = 'ACTIVE'::text)))))));"
"CREATE POLICY ""anon_select_public_resolutions"" ON resolutions
  FOR SELECT
  TO {anon}
  USING (((visibility = 'PUBLIC'::text) AND (status = 'APPROVED'::text)));"
"CREATE POLICY ""Members can SELECT attachments for votes in their org"" ON simple_vote_attachments
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (simple_votes sv
     JOIN memberships m ON ((m.org_id = sv.org_id)))
  WHERE ((sv.id = simple_vote_attachments.vote_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""OWNER/BOARD can CRUD attachments for votes in their org"" ON simple_vote_attachments
  FOR ALL
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM simple_votes sv
  WHERE ((sv.id = simple_vote_attachments.vote_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = sv.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = sv.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM simple_votes sv
  WHERE ((sv.id = simple_vote_attachments.vote_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = sv.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = sv.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""Members can INSERT/UPDATE their own ballots for OPEN votes"" ON simple_vote_ballots
  FOR INSERT
  TO {authenticated}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (simple_votes sv
     JOIN memberships m ON ((m.org_id = sv.org_id)))
  WHERE ((sv.id = simple_vote_ballots.vote_id) AND (sv.status = 'OPEN'::text) AND (m.id = simple_vote_ballots.membership_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Members can SELECT ballots in their org"" ON simple_vote_ballots
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (simple_votes sv
     JOIN memberships m ON ((m.org_id = sv.org_id)))
  WHERE ((sv.id = simple_vote_ballots.vote_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""Members can UPDATE their own ballots for OPEN votes"" ON simple_vote_ballots
  FOR UPDATE
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM (simple_votes sv
     JOIN memberships m ON ((m.org_id = sv.org_id)))
  WHERE ((sv.id = simple_vote_ballots.vote_id) AND (sv.status = 'OPEN'::text) AND (m.id = simple_vote_ballots.membership_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (simple_votes sv
     JOIN memberships m ON ((m.org_id = sv.org_id)))
  WHERE ((sv.id = simple_vote_ballots.vote_id) AND (sv.status = 'OPEN'::text) AND (m.id = simple_vote_ballots.membership_id) AND (m.user_id = auth.uid()) AND (m.member_status = 'ACTIVE'::text)))));"
"CREATE POLICY ""OWNER/BOARD can SELECT all ballots in their org"" ON simple_vote_ballots
  FOR SELECT
  TO {authenticated}
  USING ((EXISTS ( SELECT 1
   FROM simple_votes sv
  WHERE ((sv.id = simple_vote_ballots.vote_id) AND ((EXISTS ( SELECT 1
           FROM memberships
          WHERE ((memberships.org_id = sv.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
           FROM positions
          WHERE ((positions.org_id = sv.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text)))))))));"
"CREATE POLICY ""Members can read OPEN/CLOSED votes in their org"" ON simple_votes
  FOR SELECT
  TO {authenticated}
  USING (((status = ANY (ARRAY['OPEN'::text
   FROM memberships
  WHERE ((memberships.org_id = simple_votes.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text))))));"
"CREATE POLICY ""OWNER/BOARD can CRUD votes in their org"" ON simple_votes
  FOR ALL
  TO {authenticated}
  USING (((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = simple_votes.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
   FROM positions
  WHERE ((positions.org_id = simple_votes.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM memberships
  WHERE ((memberships.org_id = simple_votes.org_id) AND (memberships.user_id = auth.uid()) AND (memberships.member_status = 'ACTIVE'::text) AND (memberships.role = 'OWNER'::app_role)))) OR (EXISTS ( SELECT 1
   FROM positions
  WHERE ((positions.org_id = simple_votes.org_id) AND (positions.user_id = auth.uid()) AND (positions.is_active = true) AND (positions.title ~~* '%BOARD%'::text))))));"
"CREATE POLICY ""system_config_read_public"" ON system_config
  FOR SELECT
  TO {authenticated}
  USING (true);"
