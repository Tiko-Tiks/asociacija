-- ============================================================================
-- PRE-GOVERNANCE: Idea Positions (Support Signals)
-- ============================================================================
-- 
-- v19.0 STRICT COMPLIANCE:
-- - Positions are NOT votes, NOT approval, NOT decisions
-- - They are ADVISORY-ONLY signals with NO procedural power
-- - One position per user per idea (replace/update)
-- - Stored in ideas.metadata.fact.positions[]
-- - No thresholds, no quorum, no pass/fail
--
-- Terminology:
-- - "Palaikymo signalai" / "Pozicijos" (NOT "Balsavimas")
-- - support | concern | objection
--
-- ============================================================================

-- Drop existing function if any
DROP FUNCTION IF EXISTS rpc_set_idea_position(uuid, text, text);

-- ============================================================================
-- FUNCTION: rpc_set_idea_position
-- ============================================================================
-- Set user's position on an idea (one per user, replaces previous)
-- 
-- @param p_idea_id - Idea UUID
-- @param p_type - Position type: 'support' | 'concern' | 'objection'
-- @param p_note - Optional note/reason (especially for objection)
-- @returns JSONB with success status and updated position
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_set_idea_position(
    p_idea_id uuid,
    p_type text,
    p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_idea RECORD;
    v_membership_status text;
    v_positions jsonb;
    v_new_position jsonb;
    v_updated_positions jsonb;
    v_position_exists boolean := false;
    v_idx int;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User must be authenticated'
        );
    END IF;

    -- Validate position type
    IF p_type NOT IN ('support', 'concern', 'objection') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid position type. Must be: support, concern, or objection'
        );
    END IF;

    -- Objection requires note
    IF p_type = 'objection' AND (p_note IS NULL OR trim(p_note) = '') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Objection requires a note explaining the reason'
        );
    END IF;

    -- Get idea
    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Idea not found'
        );
    END IF;

    -- Verify membership (must be ACTIVE or OWNER)
    SELECT m.member_status::text INTO v_membership_status
    FROM memberships m
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status::text IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User must be ACTIVE or OWNER member of organization'
        );
    END IF;

    -- Build new position object
    v_new_position := jsonb_build_object(
        'user_id', v_user_id::text,
        'type', p_type,
        'note', CASE WHEN p_note IS NOT NULL AND trim(p_note) != '' THEN trim(p_note) ELSE NULL END,
        'created_at', now()::text
    );

    -- Get existing positions from metadata
    v_positions := COALESCE(v_idea.metadata->'fact'->'positions', '[]'::jsonb);

    -- Check if user already has a position and update/replace
    v_updated_positions := '[]'::jsonb;
    
    FOR v_idx IN 0..jsonb_array_length(v_positions) - 1 LOOP
        IF (v_positions->v_idx->>'user_id') = v_user_id::text THEN
            -- Replace existing position with new one
            v_updated_positions := v_updated_positions || v_new_position;
            v_position_exists := true;
        ELSE
            -- Keep other users' positions
            v_updated_positions := v_updated_positions || (v_positions->v_idx);
        END IF;
    END LOOP;

    -- If no existing position, append new one
    IF NOT v_position_exists THEN
        v_updated_positions := v_updated_positions || v_new_position;
    END IF;

    -- Update idea metadata with new positions
    UPDATE ideas
    SET metadata = jsonb_set(
        jsonb_set(COALESCE(metadata, '{}'::jsonb), '{fact}', COALESCE(metadata->'fact', '{}'::jsonb)),
        '{fact,positions}',
        v_updated_positions
    )
    WHERE id = p_idea_id;

    RETURN jsonb_build_object(
        'success', true,
        'position', v_new_position,
        'action', CASE WHEN v_position_exists THEN 'updated' ELSE 'created' END
    );
END;
$$;

COMMENT ON FUNCTION rpc_set_idea_position IS 
'PRE-GOVERNANCE: Set user position on idea (support/concern/objection). One per user, replaces previous. ADVISORY-ONLY, no procedural power.';

-- ============================================================================
-- FUNCTION: rpc_remove_idea_position
-- ============================================================================
-- Remove user's position from an idea
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_remove_idea_position(p_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_idea RECORD;
    v_positions jsonb;
    v_updated_positions jsonb;
    v_idx int;
    v_removed boolean := false;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User must be authenticated');
    END IF;

    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Idea not found');
    END IF;

    v_positions := COALESCE(v_idea.metadata->'fact'->'positions', '[]'::jsonb);
    v_updated_positions := '[]'::jsonb;

    FOR v_idx IN 0..jsonb_array_length(v_positions) - 1 LOOP
        IF (v_positions->v_idx->>'user_id') != v_user_id::text THEN
            v_updated_positions := v_updated_positions || (v_positions->v_idx);
        ELSE
            v_removed := true;
        END IF;
    END LOOP;

    IF NOT v_removed THEN
        RETURN jsonb_build_object('success', true, 'message', 'No position to remove');
    END IF;

    UPDATE ideas
    SET metadata = jsonb_set(
        jsonb_set(COALESCE(metadata, '{}'::jsonb), '{fact}', COALESCE(metadata->'fact', '{}'::jsonb)),
        '{fact,positions}',
        v_updated_positions
    )
    WHERE id = p_idea_id;

    RETURN jsonb_build_object('success', true, 'removed', true);
END;
$$;

COMMENT ON FUNCTION rpc_remove_idea_position IS 
'PRE-GOVERNANCE: Remove user position from idea. ADVISORY-ONLY.';

-- ============================================================================
-- FUNCTION: rpc_get_idea_positions_summary
-- ============================================================================
-- Get analytics summary of positions (counts only, no ranking)
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_get_idea_positions_summary(p_idea_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_idea RECORD;
    v_positions jsonb;
    v_support_count int := 0;
    v_concern_count int := 0;
    v_objection_count int := 0;
    v_total int := 0;
    v_idx int;
BEGIN
    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'support', 0,
            'concern', 0,
            'objection', 0,
            'total', 0,
            '_disclaimer', 'Analytics only. No procedural meaning.'
        );
    END IF;

    v_positions := COALESCE(v_idea.metadata->'fact'->'positions', '[]'::jsonb);
    v_total := jsonb_array_length(v_positions);

    FOR v_idx IN 0..v_total - 1 LOOP
        CASE v_positions->v_idx->>'type'
            WHEN 'support' THEN v_support_count := v_support_count + 1;
            WHEN 'concern' THEN v_concern_count := v_concern_count + 1;
            WHEN 'objection' THEN v_objection_count := v_objection_count + 1;
            ELSE NULL;
        END CASE;
    END LOOP;

    RETURN jsonb_build_object(
        'support', v_support_count,
        'concern', v_concern_count,
        'objection', v_objection_count,
        'total', v_total,
        '_disclaimer', 'Analytics only. No procedural meaning.'
    );
END;
$$;

COMMENT ON FUNCTION rpc_get_idea_positions_summary IS 
'PRE-GOVERNANCE: Get position counts for analytics. ADVISORY-ONLY, no thresholds, no pass/fail.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION rpc_set_idea_position TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_remove_idea_position TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_idea_positions_summary TO authenticated;

