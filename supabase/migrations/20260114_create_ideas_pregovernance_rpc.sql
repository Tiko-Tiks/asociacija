-- ============================================================================
-- PRE-GOVERNANCE IDEAS MODULE - RPC FUNCTIONS
-- ============================================================================
-- 
-- ARCHITECTURAL TRUTH:
--   1. Ideas module has ZERO legal/procedural power
--   2. Phases are LABELS, not states
--   3. Only allowed transition: IDEA → DRAFT resolution
--   4. No voting in this module
--
-- RPC FUNCTIONS:
--   - rpc_create_idea: Create new idea (draft phase)
--   - rpc_update_idea_phase: Change phase label
--   - rpc_add_idea_comment: Add comment/objection
--   - rpc_promote_to_resolution_draft: Create DRAFT resolution
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_create_idea
-- ----------------------------------------------------------------------------
-- Create a new idea (draft phase by default)
-- Returns: idea ID
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_create_idea(
    p_org_id uuid,
    p_title text,
    p_content text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_membership_status text;
    v_idea_id uuid;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate input
    IF p_title IS NULL OR trim(p_title) = '' THEN
        RAISE EXCEPTION 'Title is required';
    END IF;

    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Content is required';
    END IF;

    -- Verify membership: caller must be ACTIVE or OWNER
    SELECT m.member_status INTO v_membership_status
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = p_org_id
        AND m.member_status IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Insert idea (phase defaults to 'draft')
    INSERT INTO ideas (
        org_id,
        title,
        content,
        phase,
        is_snapshot,
        created_by,
        metadata
    )
    VALUES (
        p_org_id,
        trim(p_title),
        trim(p_content),
        'draft',
        false,
        v_user_id,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_idea_id;

    RETURN v_idea_id;
END;
$$;

COMMENT ON FUNCTION rpc_create_idea IS 
'PRE-GOVERNANCE: Create new idea in draft phase. Ideas have no legal/procedural power.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_update_idea_phase
-- ----------------------------------------------------------------------------
-- Change idea phase (label only, no procedural meaning)
-- Allowed transitions defined in function
-- Returns: boolean success
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_update_idea_phase(
    p_idea_id uuid,
    p_new_phase text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_idea RECORD;
    v_membership_status text;
    v_allowed_transitions text[];
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate new phase
    IF p_new_phase NOT IN ('draft', 'discussion', 'refined', 'ready_for_vote', 'abandoned') THEN
        RAISE EXCEPTION 'Invalid phase. Allowed: draft, discussion, refined, ready_for_vote, abandoned';
    END IF;

    -- Get idea
    SELECT * INTO v_idea
    FROM ideas
    WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Cannot modify snapshots
    IF v_idea.is_snapshot = true THEN
        RAISE EXCEPTION 'Cannot modify snapshot ideas';
    END IF;

    -- Cannot transition from abandoned (terminal state)
    IF v_idea.phase = 'abandoned' THEN
        RAISE EXCEPTION 'Cannot change phase of abandoned ideas';
    END IF;

    -- Verify membership
    SELECT m.member_status INTO v_membership_status
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Define allowed transitions
    -- draft → discussion, abandoned
    -- discussion → refined, draft, abandoned
    -- refined → discussion, ready_for_vote, draft, abandoned
    -- ready_for_vote → refined, discussion, abandoned
    -- abandoned → (no transitions - terminal)
    
    v_allowed_transitions := CASE v_idea.phase
        WHEN 'draft' THEN ARRAY['discussion', 'abandoned']
        WHEN 'discussion' THEN ARRAY['refined', 'draft', 'abandoned']
        WHEN 'refined' THEN ARRAY['discussion', 'ready_for_vote', 'draft', 'abandoned']
        WHEN 'ready_for_vote' THEN ARRAY['refined', 'discussion', 'abandoned']
        ELSE ARRAY[]::text[]
    END;

    IF NOT (p_new_phase = ANY(v_allowed_transitions)) THEN
        RAISE EXCEPTION 'Invalid phase transition from % to %', v_idea.phase, p_new_phase;
    END IF;

    -- Update phase
    UPDATE ideas
    SET phase = p_new_phase
    WHERE id = p_idea_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION rpc_update_idea_phase IS 
'PRE-GOVERNANCE: Change idea phase label. Phases have no procedural meaning - they are labels only.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_add_idea_comment
-- ----------------------------------------------------------------------------
-- Add discussion comment or objection marker
-- Objections require fact.objection.reason in metadata
-- Returns: comment ID
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_add_idea_comment(
    p_idea_id uuid,
    p_content text,
    p_is_objection boolean DEFAULT false,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_idea_org_id uuid;
    v_membership_status text;
    v_comment_id uuid;
    v_objection_reason text;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Validate content
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Content is required';
    END IF;

    -- Get idea
    SELECT org_id INTO v_idea_org_id
    FROM ideas
    WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Verify membership
    SELECT m.member_status INTO v_membership_status
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea_org_id
        AND m.member_status IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Validate objection reason if is_objection
    IF p_is_objection = true THEN
        v_objection_reason := p_metadata->'fact'->'objection'->>'reason';
        
        IF v_objection_reason IS NULL OR trim(v_objection_reason) = '' THEN
            RAISE EXCEPTION 'Objections must include fact.objection.reason in metadata';
        END IF;
    END IF;

    -- Insert comment
    INSERT INTO idea_comments (
        idea_id,
        user_id,
        content,
        is_objection,
        metadata
    )
    VALUES (
        p_idea_id,
        v_user_id,
        trim(p_content),
        p_is_objection,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_comment_id;

    RETURN v_comment_id;
END;
$$;

COMMENT ON FUNCTION rpc_add_idea_comment IS 
'PRE-GOVERNANCE: Add discussion comment. Objections are semantic markers only, no procedural power.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_promote_to_resolution_draft
-- ----------------------------------------------------------------------------
-- Promote idea to DRAFT resolution (only from ready_for_vote phase)
-- Creates snapshot, then creates DRAFT resolution
-- Returns: resolution ID
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_promote_to_resolution_draft(
    p_idea_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_idea RECORD;
    v_membership_status text;
    v_snapshot_id uuid;
    v_resolution_id uuid;
    v_snapshot_label text;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get idea
    SELECT * INTO v_idea
    FROM ideas
    WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Reject snapshot input
    IF v_idea.is_snapshot = true THEN
        RAISE EXCEPTION 'Cannot promote snapshot ideas - only original ideas can be promoted';
    END IF;

    -- Verify phase is ready_for_vote
    IF v_idea.phase != 'ready_for_vote' THEN
        RAISE EXCEPTION 'Idea must be in ready_for_vote phase to create draft resolution';
    END IF;

    -- Verify membership
    SELECT m.member_status INTO v_membership_status
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Check if snapshot already exists
    SELECT id INTO v_snapshot_id
    FROM ideas
    WHERE parent_id = p_idea_id
        AND is_snapshot = true
    LIMIT 1;

    -- Create snapshot if not exists
    IF NOT FOUND THEN
        v_snapshot_label := 'Snapshot before resolution draft: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
        
        INSERT INTO ideas (
            org_id,
            parent_id,
            is_snapshot,
            snapshot_label,
            title,
            content,
            phase,
            created_by,
            metadata
        )
        VALUES (
            v_idea.org_id,
            p_idea_id,
            true,
            v_snapshot_label,
            v_idea.title,
            v_idea.content,
            v_idea.phase,
            v_idea.created_by,
            v_idea.metadata
        )
        RETURNING id INTO v_snapshot_id;
    END IF;

    -- Create DRAFT resolution
    -- IMPORTANT: Status is DRAFT only - no approval occurs
    INSERT INTO resolutions (
        org_id,
        title,
        content,
        status,
        meeting_id,
        metadata
    )
    VALUES (
        v_idea.org_id,
        v_idea.title,
        v_idea.content,
        'DRAFT',
        NULL,  -- No meeting for pre-governance resolutions
        jsonb_build_object(
            'declared', jsonb_build_object(
                'reference_idea_id', p_idea_id::text,
                'reference_snapshot_id', v_snapshot_id::text
            )
        )
    )
    RETURNING id INTO v_resolution_id;

    RETURN v_resolution_id;
END;
$$;

COMMENT ON FUNCTION rpc_promote_to_resolution_draft IS 
'PRE-GOVERNANCE: Create DRAFT resolution from idea. The resolution has NO legal/procedural power until approved through Governance process.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_get_idea_indicators (READ-ONLY)
-- ----------------------------------------------------------------------------
-- Get runtime indicators for an idea (analytics only)
-- These are NOT votes, NOT support signals, just analytics
-- Returns: JSON with indicator values
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_get_idea_indicators(
    p_idea_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_indicators jsonb;
    v_comment_count int;
    v_objection_count int;
    v_participant_count int;
    v_last_activity timestamptz;
BEGIN
    -- Get comment count
    SELECT COUNT(*) INTO v_comment_count
    FROM idea_comments
    WHERE idea_id = p_idea_id;

    -- Get objection count
    SELECT COUNT(*) INTO v_objection_count
    FROM idea_comments
    WHERE idea_id = p_idea_id AND is_objection = true;

    -- Get unique participant count
    SELECT COUNT(DISTINCT user_id) INTO v_participant_count
    FROM idea_comments
    WHERE idea_id = p_idea_id;

    -- Get last activity
    SELECT MAX(created_at) INTO v_last_activity
    FROM idea_comments
    WHERE idea_id = p_idea_id;

    -- Build indicators object
    v_indicators := jsonb_build_object(
        'comment_count', v_comment_count,
        'objection_count', v_objection_count,
        'participant_count', v_participant_count,
        'last_activity', v_last_activity,
        '_disclaimer', 'These are analytics only. They are NOT votes, NOT support signals, and have NO procedural meaning.'
    );

    RETURN v_indicators;
END;
$$;

COMMENT ON FUNCTION rpc_get_idea_indicators IS 
'PRE-GOVERNANCE: Get runtime indicators (analytics only). These have NO voting or support semantics.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION rpc_create_idea TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_idea_phase TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_add_idea_comment TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_promote_to_resolution_draft TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_idea_indicators TO authenticated;

