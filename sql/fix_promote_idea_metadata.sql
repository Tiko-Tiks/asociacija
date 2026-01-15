-- ============================================================================
-- FIX: rpc_promote_idea_to_resolution_draft
-- ============================================================================
-- 1. Use flat metadata format (required by validate_metadata trigger)
-- 2. Prevent duplicate promotions
-- 3. Save promoted_to_resolution_id in idea metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_promote_idea_to_resolution_draft(p_idea_id uuid)
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
    v_existing_resolution_id text;
    v_resolution_id uuid;
    v_resolution_metadata jsonb;
    v_idea_new_metadata jsonb;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    IF (v_idea.metadata->'fact'->>'is_snapshot')::boolean = true THEN
        RAISE EXCEPTION 'Cannot promote snapshot ideas';
    END IF;

    v_current_phase := COALESCE(v_idea.metadata->'fact'->>'phase', 'draft');

    IF v_current_phase != 'ready_for_vote' THEN
        RAISE EXCEPTION 'Idea must be in ready_for_vote phase. Current: %', v_current_phase;
    END IF;

    -- Check if already promoted (prevent duplicates)
    v_existing_resolution_id := v_idea.metadata->'fact'->>'promoted_to_resolution_id';
    IF v_existing_resolution_id IS NOT NULL THEN
        RAISE EXCEPTION 'Idėja jau buvo konvertuota į rezoliuciją (ID: %). Negalima kurti pakartotinai.', v_existing_resolution_id;
    END IF;

    -- Also check if resolution with this source_idea_id exists
    IF EXISTS (
        SELECT 1 FROM resolutions 
        WHERE metadata->>'fact.source_idea_id' = p_idea_id::text
    ) THEN
        RAISE EXCEPTION 'Rezoliucija iš šios idėjos jau egzistuoja.';
    END IF;

    SELECT m.member_status::text INTO v_membership_status
    FROM memberships m
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_user_id
        AND m.org_id = v_idea.org_id
        AND m.member_status::text IN ('ACTIVE', 'OWNER')
        AND o.status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User must be ACTIVE or OWNER member';
    END IF;

    -- v19.0 COMPLIANT: Flat metadata format with dot notation
    v_resolution_metadata := jsonb_build_object(
        'template.type', 'from_idea',
        'fact.source_idea_id', p_idea_id::text
    );

    INSERT INTO resolutions (org_id, title, content, status, meeting_id, metadata)
    VALUES (v_idea.org_id, v_idea.title, COALESCE(v_idea.details, v_idea.summary), 'DRAFT', NULL, v_resolution_metadata)
    RETURNING id INTO v_resolution_id;

    -- Update idea metadata to mark as promoted (prevent duplicate promotions)
    v_idea_new_metadata := COALESCE(v_idea.metadata, '{}'::jsonb);
    v_idea_new_metadata := jsonb_set(
        jsonb_set(v_idea_new_metadata, '{fact}', COALESCE(v_idea_new_metadata->'fact', '{}'::jsonb)),
        '{fact,promoted_to_resolution_id}',
        to_jsonb(v_resolution_id::text)
    );

    UPDATE ideas
    SET metadata = v_idea_new_metadata
    WHERE id = p_idea_id;

    RETURN v_resolution_id;
END;
$$;

COMMENT ON FUNCTION rpc_promote_idea_to_resolution_draft IS 
'v19.0 COMPLIANT: Promote idea to DRAFT resolution. Prevents duplicates. Saves promoted_to_resolution_id in idea metadata.';
