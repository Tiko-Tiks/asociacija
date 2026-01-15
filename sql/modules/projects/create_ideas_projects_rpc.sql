-- ==================================================
-- IDEAS → VOTING → PROJECTS → SUPPORT Module
-- RPC Functions (Core Business Logic)
-- ==================================================

-- Helper: Get governance config integer value
-- Note: This function already exists from meeting_agenda module with signature:
-- get_governance_int(p_org_id uuid, p_key text, p_default_int int)
-- We'll use the existing function, so no need to recreate it here.
-- If you need to update the function signature, drop it first:
-- DROP FUNCTION IF EXISTS public.get_governance_int(uuid, text, integer);
-- Then recreate with new signature.

-- 1. Create Idea
CREATE OR REPLACE FUNCTION public.create_idea(
  p_org_id uuid,
  p_title text,
  p_summary text,
  p_details text,
  p_public_visible boolean DEFAULT true
) RETURNS TABLE(ok boolean, reason text, idea_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_membership_id uuid;
  v_idea_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Check ACTIVE membership
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT m.id INTO v_membership_id
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = p_org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert idea
  INSERT INTO public.ideas (org_id, title, summary, details, public_visible, created_by)
  VALUES (p_org_id, p_title, p_summary, p_details, p_public_visible, v_user_id)
  RETURNING id INTO v_idea_id;

  RETURN QUERY SELECT true, 'OK'::text, v_idea_id;
END;
$$;

-- 2. Open Idea for Voting
CREATE OR REPLACE FUNCTION public.open_idea_for_voting(
  p_idea_id uuid
) RETURNS TABLE(ok boolean, reason text, vote_id uuid, closes_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Get idea
  SELECT * INTO v_idea
  FROM public.ideas
  WHERE id = p_idea_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'IDEA_NOT_FOUND'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_idea.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
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
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Check idea status
  IF v_idea.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'IDEA_NOT_DRAFT'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Get duration from governance (default 7)
  -- Note: Using existing function signature with p_default_int parameter name
  v_duration_days := public.get_governance_int(v_idea.org_id, 'idea_vote_duration_days', 7);
  v_closes_at := now() + (v_duration_days || ' days')::interval;

  -- Create vote
  INSERT INTO public.idea_votes (idea_id, org_id, closes_at, duration_days, created_by)
  VALUES (p_idea_id, v_idea.org_id, v_closes_at, v_duration_days, v_user_id)
  ON CONFLICT (idea_id) DO UPDATE
    SET status = 'OPEN',
        closes_at = v_closes_at,
        duration_days = v_duration_days,
        opens_at = now()
  RETURNING id INTO v_vote_id;

  -- Update idea status
  UPDATE public.ideas
  SET status = 'OPEN',
      opened_at = now()
  WHERE id = p_idea_id;

  RETURN QUERY SELECT true, 'OK'::text, v_vote_id, v_closes_at;
END;
$$;

-- 3. Can Cast Idea Vote
CREATE OR REPLACE FUNCTION public.can_cast_idea_vote(
  p_vote_id uuid,
  p_user_id uuid
) RETURNS TABLE(allowed boolean, reason text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vote RECORD;
  v_membership_id uuid;
  v_ballot_exists boolean;
  v_can_vote_result RECORD;
  v_can_vote_exists boolean;
BEGIN
  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Check if vote is open
  IF v_vote.status != 'OPEN' OR now() >= v_vote.closes_at THEN
    RETURN QUERY SELECT false, 'VOTE_CLOSED'::text, jsonb_build_object('closes_at', v_vote.closes_at);
    RETURN;
  END IF;

  -- Get membership
  -- Enforce ACTIVE org status and exclude PRE_ORG
  SELECT m.id INTO v_membership_id
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = p_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Check if can_vote function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'can_vote'
  ) INTO v_can_vote_exists;

  IF v_can_vote_exists THEN
    SELECT * INTO v_can_vote_result
    FROM public.can_vote(v_vote.org_id, p_user_id);

    IF NOT v_can_vote_result.allowed THEN
      RETURN QUERY SELECT false, 'CAN_VOTE_BLOCKED'::text, 
        jsonb_build_object(
          'can_vote_reason', v_can_vote_result.reason,
          'can_vote_details', v_can_vote_result.details
        );
      RETURN;
    END IF;
  END IF;

  -- Check if already voted
  SELECT EXISTS (
    SELECT 1 FROM public.idea_ballots
    WHERE idea_vote_id = p_vote_id
      AND membership_id = v_membership_id
  ) INTO v_ballot_exists;

  IF v_ballot_exists THEN
    RETURN QUERY SELECT false, 'ALREADY_VOTED'::text, jsonb_build_object('membership_id', v_membership_id);
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::text, jsonb_build_object('membership_id', v_membership_id);
END;
$$;

-- 4. Cast Idea Vote
CREATE OR REPLACE FUNCTION public.cast_idea_vote(
  p_vote_id uuid,
  p_choice text
) RETURNS TABLE(ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_vote RECORD;
  v_membership_id uuid;
  v_can_vote_check RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  -- Validate choice
  IF p_choice NOT IN ('FOR', 'AGAINST') THEN
    RETURN QUERY SELECT false, 'INVALID_CHOICE'::text;
    RETURN;
  END IF;

  -- Preflight check
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_idea_vote(p_vote_id, v_user_id);

  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false, v_can_vote_check.reason;
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  -- Get membership_id from can_vote_check details
  v_membership_id := (v_can_vote_check.details->>'membership_id')::uuid;

  -- Upsert ballot
  INSERT INTO public.idea_ballots (idea_vote_id, membership_id, choice)
  VALUES (p_vote_id, v_membership_id, p_choice::text)
  ON CONFLICT (idea_vote_id, membership_id) DO UPDATE
    SET choice = p_choice::text,
        cast_at = now();

  RETURN QUERY SELECT true, 'CAST'::text;
END;
$$;

-- 5. Close Idea Vote
CREATE OR REPLACE FUNCTION public.close_idea_vote(
  p_vote_id uuid
) RETURNS TABLE(
  ok boolean, 
  reason text, 
  votes_for int, 
  votes_against int, 
  votes_total int,
  total_active_members int,
  participation_required int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
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
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Get tally
  SELECT * INTO v_tally
  FROM public.idea_vote_tally
  WHERE vote_id = p_vote_id;

  -- Get min participation percent
  v_min_participation_percent := public.get_governance_int(v_vote.org_id, 'idea_vote_min_participation_percent', 50);
  
  -- Calculate participation required
  v_participation_required := CEIL(v_tally.total_active_members::numeric * v_min_participation_percent::numeric / 100.0);
  
  -- Close vote
  UPDATE public.idea_votes
  SET status = 'CLOSED',
      closed_at = now()
  WHERE id = p_vote_id;

  RETURN QUERY SELECT 
    true, 
    'CLOSED'::text,
    v_tally.votes_for,
    v_tally.votes_against,
    v_tally.votes_total,
    v_tally.total_active_members,
    v_participation_required;
END;
$$;

-- 6. Evaluate Idea Vote and Transition
CREATE OR REPLACE FUNCTION public.evaluate_idea_vote_and_transition(
  p_vote_id uuid,
  p_create_project boolean DEFAULT false,
  p_budget_eur numeric DEFAULT 0
) RETURNS TABLE(ok boolean, reason text, idea_id uuid, outcome text, project_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
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
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, NULL::uuid, NULL::text, NULL::uuid;
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
    RETURN QUERY SELECT false, 'VOTE_NOT_CLOSED'::text, v_idea.id, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get tally
  SELECT * INTO v_tally
  FROM public.idea_vote_tally
  WHERE vote_id = p_vote_id;

  -- Get min participation percent
  v_min_participation_percent := public.get_governance_int(v_vote.org_id, 'idea_vote_min_participation_percent', 50);
  v_participation_required := CEIL(v_tally.total_active_members::numeric * v_min_participation_percent::numeric / 100.0);
  v_participation_ok := v_tally.votes_total >= v_participation_required;
  v_majority_ok := v_tally.votes_for > v_tally.votes_against;

  -- Determine outcome
  IF NOT v_participation_ok THEN
    v_outcome := 'NOT_COMPLETED';
    UPDATE public.ideas
    SET status = 'NOT_COMPLETED',
        closed_at = now()
    WHERE id = v_idea.id;
    
    RETURN QUERY SELECT true, 'INSUFFICIENT_PARTICIPATION'::text, v_idea.id, v_outcome, NULL::uuid;
    RETURN;
  END IF;

  IF v_majority_ok THEN
    v_outcome := 'PASSED';
    UPDATE public.ideas
    SET status = 'PASSED',
        closed_at = now(),
        passed_at = now()
    WHERE id = v_idea.id;

    -- Create project if requested
    IF p_create_project AND p_budget_eur > 0 THEN
      INSERT INTO public.projects (org_id, idea_id, title, description, budget_eur, created_by)
      VALUES (v_idea.org_id, v_idea.id, v_idea.title, v_idea.summary, p_budget_eur, v_user_id)
      RETURNING id INTO v_project_id;
    END IF;

    RETURN QUERY SELECT true, 'PASSED'::text, v_idea.id, v_outcome, v_project_id;
    RETURN;
  ELSE
    v_outcome := 'FAILED';
    UPDATE public.ideas
    SET status = 'FAILED',
        closed_at = now()
    WHERE id = v_idea.id;

    RETURN QUERY SELECT true, 'NO_MAJORITY'::text, v_idea.id, v_outcome, NULL::uuid;
    RETURN;
  END IF;
END;
$$;

-- 7. Pledge Money
CREATE OR REPLACE FUNCTION public.pledge_money(
  p_project_id uuid,
  p_amount_eur numeric,
  p_note text DEFAULT NULL
) RETURNS TABLE(ok boolean, reason text, contribution_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_amount_eur <= 0 THEN
    RETURN QUERY SELECT false, 'INVALID_AMOUNT'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_project.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id, org_id, membership_id, kind, money_amount_eur, note
  )
  VALUES (p_project_id, v_project.org_id, v_membership_id, 'MONEY', p_amount_eur, p_note)
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true, 'PLEDGED'::text, v_contribution_id;
END;
$$;

-- 8. Pledge In-Kind
CREATE OR REPLACE FUNCTION public.pledge_in_kind(
  p_project_id uuid,
  p_items jsonb,
  p_note text DEFAULT NULL
) RETURNS TABLE(ok boolean, reason text, contribution_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN QUERY SELECT false, 'INVALID_ITEMS'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_project.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id, org_id, membership_id, kind, in_kind_items, note
  )
  VALUES (p_project_id, v_project.org_id, v_membership_id, 'IN_KIND', p_items, p_note)
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true, 'PLEDGED'::text, v_contribution_id;
END;
$$;

-- 9. Pledge Work
CREATE OR REPLACE FUNCTION public.pledge_work(
  p_project_id uuid,
  p_work jsonb,
  p_note text DEFAULT NULL
) RETURNS TABLE(ok boolean, reason text, contribution_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_work IS NULL OR p_work->>'hours' IS NULL THEN
    RETURN QUERY SELECT false, 'INVALID_WORK'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_project.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id, org_id, membership_id, kind, work_offer, note
  )
  VALUES (p_project_id, v_project.org_id, v_membership_id, 'WORK', p_work, p_note)
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true, 'PLEDGED'::text, v_contribution_id;
END;
$$;

-- 10. Update Contribution Status
CREATE OR REPLACE FUNCTION public.update_contribution_status(
  p_contribution_id uuid,
  p_status text
) RETURNS TABLE(ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_contribution RECORD;
  v_membership RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  IF p_status NOT IN ('PLEDGED', 'RECEIVED', 'CANCELLED') THEN
    RETURN QUERY SELECT false, 'INVALID_STATUS'::text;
    RETURN;
  END IF;

  -- Get contribution
  SELECT * INTO v_contribution
  FROM public.project_contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'CONTRIBUTION_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  INNER JOIN public.orgs o ON o.id = m.org_id
  WHERE m.org_id = v_contribution.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND o.status = 'ACTIVE'
    AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
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
    RETURN QUERY SELECT false, 'FORBIDDEN'::text;
    RETURN;
  END IF;

  -- Update status
  UPDATE public.project_contributions
  SET status = p_status::text,
      updated_at = now()
  WHERE id = p_contribution_id;

  RETURN QUERY SELECT true, 'UPDATED'::text;
END;
$$;

