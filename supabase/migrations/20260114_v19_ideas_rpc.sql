-- ============================================================================
-- v19.0 COMPLIANT PRE-GOVERNANCE RPC FUNCTIONS
-- ============================================================================
--
-- ARCHITECTURAL TRUTH:
--   ❌ No new tables
--   ❌ No new columns
--   ✅ Only metadata.fact.* for PRE-GOVERNANCE
--   ✅ Only existing ideas table columns
--
-- METADATA NAMESPACE:
--   fact.phase: draft | discussion | refined | ready_for_vote | abandoned
--   fact.is_snapshot: boolean
--   fact.parent_id: uuid string
--   fact.comments[]: array of comment objects
--
-- STATUS MAPPING (ideas.status column):
--   DRAFT → idea is alive
--   OPEN → discussion active
--   FAILED → abandoned
--   PASSED → ❌ NOT USED in PRE-GOVERNANCE
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_create_idea
-- ----------------------------------------------------------------------------
-- Create a new idea (uses existing ideas table, PRE-GOVERNANCE via metadata)
-- Returns: idea ID
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_create_idea(
    p_org_id uuid,
    p_title text,
    p_summary text,
    p_details text DEFAULT NULL
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
    v_metadata jsonb;
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

    IF p_summary IS NULL OR trim(p_summary) = '' THEN
        RAISE EXCEPTION 'Summary is required';
    END IF;

    -- Verify membership: caller must be ACTIVE or OWNER
    SELECT m.member_status::text INTO v_membership_status
    FROM memberships m
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = p_org_id
        AND m.member_status::text IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Build PRE-GOVERNANCE metadata
    v_metadata := jsonb_build_object(
        'fact', jsonb_build_object(
            'phase', 'draft',
            'is_snapshot', false,
            'comments', '[]'::jsonb
        )
    );

    -- Insert idea using v19 schema columns
    INSERT INTO ideas (
        org_id,
        title,
        summary,
        details,
        status,
        public_visible,
        created_by,
        metadata
    )
    VALUES (
        p_org_id,
        trim(p_title),
        trim(p_summary),
        trim(COALESCE(p_details, '')),
        'DRAFT',  -- v19 status column
        true,
        v_user_id,
        v_metadata
    )
    RETURNING id INTO v_idea_id;

    RETURN v_idea_id;
END;
$$;

COMMENT ON FUNCTION rpc_create_idea IS 
'v19.0 COMPLIANT: Create new idea. PRE-GOVERNANCE phase stored in metadata.fact.phase. No governance power.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_update_idea_phase
-- ----------------------------------------------------------------------------
-- Update idea phase (stored in metadata.fact.phase)
-- Also updates ideas.status for compatibility
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
    v_current_phase text;
    v_allowed_transitions text[];
    v_new_status text;
    v_new_metadata jsonb;
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
    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Check if snapshot (cannot modify)
    IF (v_idea.metadata->'fact'->>'is_snapshot')::boolean = true THEN
        RAISE EXCEPTION 'Cannot modify snapshot ideas';
    END IF;

    -- Get current phase from metadata
    v_current_phase := COALESCE(v_idea.metadata->'fact'->>'phase', 'draft');

    -- Cannot transition from abandoned
    IF v_current_phase = 'abandoned' THEN
        RAISE EXCEPTION 'Cannot change phase of abandoned ideas';
    END IF;

    -- Verify membership
    SELECT m.member_status::text INTO v_membership_status
    FROM memberships m
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status::text IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Define allowed transitions
    v_allowed_transitions := CASE v_current_phase
        WHEN 'draft' THEN ARRAY['discussion', 'abandoned']
        WHEN 'discussion' THEN ARRAY['refined', 'draft', 'abandoned']
        WHEN 'refined' THEN ARRAY['discussion', 'ready_for_vote', 'draft', 'abandoned']
        WHEN 'ready_for_vote' THEN ARRAY['refined', 'discussion', 'abandoned']
        ELSE ARRAY[]::text[]
    END;

    IF NOT (p_new_phase = ANY(v_allowed_transitions)) THEN
        RAISE EXCEPTION 'Invalid phase transition from % to %', v_current_phase, p_new_phase;
    END IF;

    -- Map phase to v19 status column
    v_new_status := CASE p_new_phase
        WHEN 'draft' THEN 'DRAFT'
        WHEN 'discussion' THEN 'OPEN'
        WHEN 'refined' THEN 'OPEN'
        WHEN 'ready_for_vote' THEN 'OPEN'
        WHEN 'abandoned' THEN 'FAILED'
        ELSE 'DRAFT'
    END;

    -- Update metadata with new phase
    v_new_metadata := jsonb_set(
        COALESCE(v_idea.metadata, '{}'::jsonb),
        '{fact,phase}',
        to_jsonb(p_new_phase)
    );

    -- Update idea
    UPDATE ideas
    SET 
        status = v_new_status,
        metadata = v_new_metadata
    WHERE id = p_idea_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION rpc_update_idea_phase IS 
'v19.0 COMPLIANT: Update idea phase via metadata.fact.phase. Phases are labels only, no governance power.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_add_idea_comment
-- ----------------------------------------------------------------------------
-- Add comment to idea (append-only to metadata.fact.comments[])
-- Comments are NEVER edited, only added
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_add_idea_comment(
    p_idea_id uuid,
    p_content text,
    p_is_objection boolean DEFAULT false,
    p_objection_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_user_name text;
    v_idea RECORD;
    v_membership_status text;
    v_comment_id uuid;
    v_new_comment jsonb;
    v_comments jsonb;
    v_new_metadata jsonb;
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

    -- Validate objection reason if objection
    IF p_is_objection = true AND (p_objection_reason IS NULL OR trim(p_objection_reason) = '') THEN
        RAISE EXCEPTION 'Objection reason is required when is_objection=true';
    END IF;

    -- Get idea
    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Verify membership
    SELECT m.member_status::text INTO v_membership_status
    FROM memberships m
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status::text IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Get user name
    SELECT full_name INTO v_user_name FROM profiles WHERE id = v_user_id;

    -- Generate comment ID
    v_comment_id := gen_random_uuid();

    -- Build comment object
    v_new_comment := jsonb_build_object(
        'id', v_comment_id::text,
        'author_id', v_user_id::text,
        'author_name', v_user_name,
        'created_at', now()::text,
        'content', trim(p_content),
        'is_objection', p_is_objection,
        'reason', CASE WHEN p_is_objection THEN trim(p_objection_reason) ELSE NULL END
    );

    -- Get existing comments or empty array
    v_comments := COALESCE(v_idea.metadata->'fact'->'comments', '[]'::jsonb);

    -- Append new comment (append-only, never edit)
    v_comments := v_comments || v_new_comment;

    -- Update metadata
    v_new_metadata := COALESCE(v_idea.metadata, '{}'::jsonb);
    v_new_metadata := jsonb_set(
        jsonb_set(v_new_metadata, '{fact}', COALESCE(v_new_metadata->'fact', '{}'::jsonb)),
        '{fact,comments}',
        v_comments
    );

    -- Update idea
    UPDATE ideas
    SET metadata = v_new_metadata
    WHERE id = p_idea_id;

    RETURN v_comment_id;
END;
$$;

COMMENT ON FUNCTION rpc_add_idea_comment IS 
'v19.0 COMPLIANT: Add comment to metadata.fact.comments[]. Append-only, never edited. Comments have no governance power.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_promote_idea_to_resolution_draft
-- ----------------------------------------------------------------------------
-- Promote idea to DRAFT resolution
-- Only allowed from metadata.fact.phase = 'ready_for_vote'
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION rpc_promote_idea_to_resolution_draft(
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
    v_current_phase text;
    v_resolution_id uuid;
    v_resolution_metadata jsonb;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Get idea
    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    -- Check if snapshot (cannot promote snapshots)
    IF (v_idea.metadata->'fact'->>'is_snapshot')::boolean = true THEN
        RAISE EXCEPTION 'Cannot promote snapshot ideas';
    END IF;

    -- Get current phase
    v_current_phase := COALESCE(v_idea.metadata->'fact'->>'phase', 'draft');

    -- Verify phase is ready_for_vote
    IF v_current_phase != 'ready_for_vote' THEN
        RAISE EXCEPTION 'Idea must be in ready_for_vote phase. Current phase: %', v_current_phase;
    END IF;

    -- Verify membership
    SELECT m.member_status::text INTO v_membership_status
    FROM memberships m
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status::text IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member of organization';
    END IF;

    -- Build resolution metadata (v19 compliant: fact.* and template.*)
    v_resolution_metadata := jsonb_build_object(
        'template', jsonb_build_object(
            'type', 'from_idea'
        ),
        'fact', jsonb_build_object(
            'source_idea_id', p_idea_id::text
        )
    );

    -- Create DRAFT resolution
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
        COALESCE(v_idea.details, v_idea.summary),
        'DRAFT',
        NULL,  -- No meeting for pre-governance resolutions
        v_resolution_metadata
    )
    RETURNING id INTO v_resolution_id;

    RETURN v_resolution_id;
END;
$$;

COMMENT ON FUNCTION rpc_promote_idea_to_resolution_draft IS 
'v19.0 COMPLIANT: Promote idea to DRAFT resolution. Uses template.type=from_idea and fact.source_idea_id. Resolution has NO governance power until APPROVED.';

-- ----------------------------------------------------------------------------
-- FUNCTION: rpc_get_idea_indicators
-- ----------------------------------------------------------------------------
-- Get analytics indicators for idea (READ-ONLY)
-- These are NOT votes, NOT support signals, just analytics
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
    v_idea RECORD;
    v_comments jsonb;
    v_comment_count int;
    v_objection_count int;
    v_participant_ids text[];
    v_participant_count int;
    v_last_activity timestamptz;
BEGIN
    -- Get idea
    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'comment_count', 0,
            'objection_count', 0,
            'participant_count', 0,
            'last_activity', null,
            '_disclaimer', 'Analytics only. No procedural meaning.'
        );
    END IF;

    -- Get comments from metadata
    v_comments := COALESCE(v_idea.metadata->'fact'->'comments', '[]'::jsonb);

    -- Count comments
    v_comment_count := jsonb_array_length(v_comments);

    -- Count objections
    SELECT COUNT(*) INTO v_objection_count
    FROM jsonb_array_elements(v_comments) AS c
    WHERE (c->>'is_objection')::boolean = true;

    -- Get unique participants
    SELECT array_agg(DISTINCT c->>'author_id') INTO v_participant_ids
    FROM jsonb_array_elements(v_comments) AS c
    WHERE c->>'author_id' IS NOT NULL;

    v_participant_count := COALESCE(array_length(v_participant_ids, 1), 0);

    -- Get last activity
    SELECT MAX((c->>'created_at')::timestamptz) INTO v_last_activity
    FROM jsonb_array_elements(v_comments) AS c;

    RETURN jsonb_build_object(
        'comment_count', v_comment_count,
        'objection_count', v_objection_count,
        'participant_count', v_participant_count,
        'last_activity', v_last_activity,
        '_disclaimer', 'Analytics only. No procedural meaning.'
    );
END;
$$;

COMMENT ON FUNCTION rpc_get_idea_indicators IS 
'v19.0 COMPLIANT: Get analytics indicators from metadata.fact.comments[]. These have NO voting or governance semantics.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION rpc_create_idea TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_idea_phase TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_add_idea_comment TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_promote_idea_to_resolution_draft TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_idea_indicators TO authenticated;

-- ============================================================================
-- RLS POLICIES (v19 compliant)
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Drop any PRE-GOVERNANCE specific policies
DROP POLICY IF EXISTS ideas_select_policy ON ideas;
DROP POLICY IF EXISTS ideas_insert_policy ON ideas;
DROP POLICY IF EXISTS ideas_update_policy ON ideas;

-- SELECT: All members can read ideas from their org
CREATE POLICY ideas_select_policy ON ideas
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            JOIN orgs o ON o.id = m.org_id
            WHERE m.user_id = auth.uid()
                AND m.org_id = ideas.org_id
                AND m.member_status::text IN ('PENDING', 'ACTIVE', 'OWNER')
                AND o.status = 'ACTIVE'
        )
    );

-- INSERT/UPDATE/DELETE blocked - must use RPC functions
-- (implicit deny)

