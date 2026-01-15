-- ============================================================================
-- IDEAS / PLANNING MODULE - RPC FUNCTIONS
-- ============================================================================
-- 
-- PURPOSE: SECURITY DEFINER functions for PRE-GOVERNANCE operations
-- CONSTRAINTS:
--   - No governance state changes
--   - All writes go through RPC (RLS blocks direct writes)
--   - Metadata validation via triggers
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_create_idea
-- ----------------------------------------------------------------------------
-- Create a new idea or plan (draft phase by default)
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

    -- Verify membership: caller must be ACTIVE or OWNER
    -- Enforce ACTIVE org status and exclude PRE_ORG
    SELECT m.member_status INTO v_membership_status
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = p_org_id
        AND m.member_status IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE'
        AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Insert idea (phase defaults to 'draft', metadata validated by trigger)
    INSERT INTO ideas (
        org_id,
        title,
        content,
        phase,
        created_by,
        metadata
    )
    VALUES (
        p_org_id,
        p_title,
        p_content,
        'draft',
        v_user_id,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_idea_id;

    RETURN v_idea_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_add_comment
-- ----------------------------------------------------------------------------
-- Add a discussion comment or objection
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_add_comment(
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

    -- Get idea and verify it exists
    SELECT org_id INTO v_idea_org_id
    FROM ideas
    WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Verify membership: caller must be ACTIVE or OWNER in same org
    -- Enforce ACTIVE org status and exclude PRE_ORG
    SELECT m.member_status INTO v_membership_status
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea_org_id
        AND m.member_status IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE'
        AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- If objection, validate fact.objection.reason exists and is non-empty
    IF p_is_objection = true THEN
        v_objection_reason := p_metadata->>'fact.objection.reason';
        
        IF v_objection_reason IS NULL OR trim(v_objection_reason) = '' THEN
            RAISE EXCEPTION 'Objections must include non-empty fact.objection.reason in metadata';
        END IF;
    END IF;

    -- Insert comment (metadata validated by trigger)
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
        p_content,
        p_is_objection,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_comment_id;

    RETURN v_comment_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_promote_to_resolution_draft
-- ----------------------------------------------------------------------------
-- Promote an idea marked ready_for_vote into a DRAFT resolution
-- Creates snapshot if not exists, then creates DRAFT resolution
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

    -- Get idea and verify it exists
    SELECT * INTO v_idea
    FROM ideas
    WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Reject snapshot input - only original ideas can be promoted
    IF v_idea.is_snapshot = true THEN
        RAISE EXCEPTION 'Cannot promote snapshot ideas - only original ideas can be promoted to resolutions';
    END IF;

    -- Verify phase is 'ready_for_vote'
    IF v_idea.phase != 'ready_for_vote' THEN
        RAISE EXCEPTION 'Idea must be in ready_for_vote phase to promote to resolution';
    END IF;

    -- Verify membership: caller must be ACTIVE or OWNER in same org
    -- Enforce ACTIVE org status and exclude PRE_ORG
    SELECT m.member_status INTO v_membership_status
    FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE'
        AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Create snapshot if not exists (technical artifact only)
    -- Check if snapshot already exists for this idea
    SELECT id INTO v_snapshot_id
    FROM ideas
    WHERE parent_id = p_idea_id
        AND is_snapshot = true
    LIMIT 1;

    IF NOT FOUND THEN
        -- Create snapshot
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
    -- Note: meeting_id is NULL for pre-governance resolutions
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
        NULL,
        jsonb_build_object(
            'declared.reference_idea_id', p_idea_id::text
        )
    )
    RETURNING id INTO v_resolution_id;

    RETURN v_resolution_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- NOTES:
-- ----------------------------------------------------------------------------
-- 1. All functions use SECURITY DEFINER to bypass RLS for controlled writes.
--
-- 2. Membership checks ensure only ACTIVE/OWNER can create/modify content.
--
-- 3. rpc_add_comment validates fact.objection.reason when is_objection=true.
--
-- 4. rpc_promote_to_resolution_draft rejects snapshot inputs and creates
--    snapshot internally as technical artifact only.
--
-- 5. Resolution metadata uses declared.reference_idea_id (not project.*) to
--    maintain traceability without storing snapshot_id.
-- ----------------------------------------------------------------------------
