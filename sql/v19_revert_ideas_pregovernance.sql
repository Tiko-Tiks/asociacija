-- ============================================================================
-- v19.0 STRICT COMPLIANCE: PRE-GOVERNANCE IDEAS MODULE REVERT
-- ============================================================================
--
-- ARCHITEKTŪRINIS SPRENDIMAS: v19.0 GRIEŽTAS ATITIKIMAS
--   ❌ Jokių naujų lentelių
--   ❌ Jokių naujų stulpelių
--   ✅ Tik metadata JSONB
--   ✅ Tik esama ideas lentelė
--   ✅ Tik RPC / VIEW / TRIGGER
--
-- PRE-GOVERNANCE yra INTERPRETACINIS SLUOKSNIS, ne schemos lygio modulis.
--
-- Struktūra:
--   ideas.status: DRAFT | OPEN | FAILED (v19 originalus)
--   metadata.fact.phase: draft | discussion | refined | ready_for_vote | abandoned
--   metadata.fact.is_snapshot: boolean
--   metadata.fact.parent_id: uuid string
--   metadata.fact.comments[]: array of comment objects
--
-- ============================================================================

-- ============================================================================
-- PART 1: MIGRATE DATA FROM NEW COLUMNS TO metadata.fact.*
-- ============================================================================

DO $$
DECLARE
  v_idea RECORD;
  v_new_metadata jsonb;
  v_has_phase boolean;
  v_has_content boolean;
  v_has_is_snapshot boolean;
BEGIN
  -- Check if new columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'phase'
  ) INTO v_has_phase;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'content'
  ) INTO v_has_content;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'is_snapshot'
  ) INTO v_has_is_snapshot;

  IF v_has_phase OR v_has_content OR v_has_is_snapshot THEN
    RAISE NOTICE 'Migrating PRE-GOVERNANCE data to metadata.fact.*';
    
    FOR v_idea IN SELECT * FROM ideas LOOP
      v_new_metadata := COALESCE(v_idea.metadata, '{}'::jsonb);
      
      IF v_has_phase AND v_idea.phase IS NOT NULL THEN
        v_new_metadata := jsonb_set(
          v_new_metadata, '{fact,phase}', to_jsonb(v_idea.phase)
        );
      END IF;
      
      IF v_has_is_snapshot THEN
        v_new_metadata := jsonb_set(
          v_new_metadata, '{fact,is_snapshot}', to_jsonb(COALESCE(v_idea.is_snapshot, false))
        );
      END IF;
      
      IF v_has_is_snapshot AND v_idea.parent_id IS NOT NULL THEN
        v_new_metadata := jsonb_set(
          v_new_metadata, '{fact,parent_id}', to_jsonb(v_idea.parent_id::text)
        );
      END IF;
      
      IF v_has_content AND v_idea.content IS NOT NULL AND v_idea.content != '' THEN
        UPDATE ideas SET 
          details = COALESCE(v_idea.content, details),
          metadata = v_new_metadata
        WHERE id = v_idea.id;
      ELSE
        UPDATE ideas SET metadata = v_new_metadata WHERE id = v_idea.id;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Data migration complete';
  ELSE
    RAISE NOTICE 'No new columns found, skipping data migration';
  END IF;
END $$;

-- ============================================================================
-- PART 2: MIGRATE COMMENTS FROM idea_comments TO metadata.fact.comments[]
-- ============================================================================

DO $$
DECLARE
  v_comment RECORD;
  v_idea_metadata jsonb;
  v_comments jsonb;
  v_new_comment jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'idea_comments'
  ) THEN
    RAISE NOTICE 'Migrating comments from idea_comments to metadata.fact.comments[]';
    
    FOR v_comment IN 
      SELECT ic.*, p.full_name as author_name
      FROM idea_comments ic
      LEFT JOIN profiles p ON p.id = ic.user_id
      ORDER BY ic.idea_id, ic.created_at
    LOOP
      SELECT metadata INTO v_idea_metadata FROM ideas WHERE id = v_comment.idea_id;
      
      IF v_idea_metadata IS NULL THEN
        v_idea_metadata := '{}'::jsonb;
      END IF;
      
      v_comments := COALESCE(v_idea_metadata->'fact'->'comments', '[]'::jsonb);
      
      v_new_comment := jsonb_build_object(
        'id', v_comment.id::text,
        'author_id', v_comment.user_id::text,
        'author_name', v_comment.author_name,
        'created_at', v_comment.created_at,
        'content', v_comment.content,
        'is_objection', COALESCE(v_comment.is_objection, false),
        'reason', v_comment.metadata->'fact'->'objection'->>'reason'
      );
      
      v_comments := v_comments || v_new_comment;
      
      UPDATE ideas SET metadata = jsonb_set(
        jsonb_set(v_idea_metadata, '{fact}', COALESCE(v_idea_metadata->'fact', '{}'::jsonb)),
        '{fact,comments}', v_comments
      ) WHERE id = v_comment.idea_id;
    END LOOP;
    
    RAISE NOTICE 'Comments migration complete';
  ELSE
    RAISE NOTICE 'idea_comments table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART 3: DROP idea_comments TABLE
-- ============================================================================

DROP TABLE IF EXISTS idea_comments CASCADE;

-- ============================================================================
-- PART 4: DROP NEW COLUMNS FROM ideas TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'phase'
  ) THEN
    ALTER TABLE ideas DROP COLUMN phase;
    RAISE NOTICE 'Dropped column: phase';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'content'
  ) THEN
    ALTER TABLE ideas DROP COLUMN content;
    RAISE NOTICE 'Dropped column: content';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'is_snapshot'
  ) THEN
    ALTER TABLE ideas DROP COLUMN is_snapshot;
    RAISE NOTICE 'Dropped column: is_snapshot';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE ideas DROP COLUMN parent_id;
    RAISE NOTICE 'Dropped column: parent_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'snapshot_label'
  ) THEN
    ALTER TABLE ideas DROP COLUMN snapshot_label;
    RAISE NOTICE 'Dropped column: snapshot_label';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE ideas ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added column: metadata';
  END IF;
END $$;

-- ============================================================================
-- PART 5: DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_ideas_phase;
DROP INDEX IF EXISTS idx_ideas_parent;
DROP INDEX IF EXISTS idx_ideas_snapshot;

-- ============================================================================
-- PART 6: DROP OLD RPC FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS rpc_create_idea(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS rpc_create_idea(uuid, text, text, text);
DROP FUNCTION IF EXISTS rpc_update_idea_phase(uuid, text);
DROP FUNCTION IF EXISTS rpc_add_idea_comment(uuid, text, boolean, jsonb);
DROP FUNCTION IF EXISTS rpc_add_idea_comment(uuid, text, boolean, text);
DROP FUNCTION IF EXISTS rpc_add_comment(uuid, text, boolean, jsonb);
DROP FUNCTION IF EXISTS rpc_promote_to_resolution_draft(uuid);
DROP FUNCTION IF EXISTS rpc_promote_idea_to_resolution_draft(uuid);
DROP FUNCTION IF EXISTS rpc_get_idea_indicators(uuid);

-- ============================================================================
-- PART 7: CREATE v19 COMPLIANT RPC FUNCTIONS
-- ============================================================================

-- Function: rpc_create_idea
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
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF p_title IS NULL OR trim(p_title) = '' THEN
        RAISE EXCEPTION 'Title is required';
    END IF;

    IF p_summary IS NULL OR trim(p_summary) = '' THEN
        RAISE EXCEPTION 'Summary is required';
    END IF;

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

    v_metadata := jsonb_build_object(
        'fact', jsonb_build_object(
            'phase', 'draft',
            'is_snapshot', false,
            'comments', '[]'::jsonb
        )
    );

    INSERT INTO ideas (org_id, title, summary, details, status, public_visible, created_by, metadata)
    VALUES (p_org_id, trim(p_title), trim(p_summary), trim(COALESCE(p_details, '')), 'DRAFT', true, v_user_id, v_metadata)
    RETURNING id INTO v_idea_id;

    RETURN v_idea_id;
END;
$$;

COMMENT ON FUNCTION rpc_create_idea IS 'v19.0 COMPLIANT: Create new idea. Phase stored in metadata.fact.phase.';

-- Function: rpc_update_idea_phase
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
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF p_new_phase NOT IN ('draft', 'discussion', 'refined', 'ready_for_vote', 'abandoned') THEN
        RAISE EXCEPTION 'Invalid phase';
    END IF;

    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
    END IF;

    IF (v_idea.metadata->'fact'->>'is_snapshot')::boolean = true THEN
        RAISE EXCEPTION 'Cannot modify snapshot ideas';
    END IF;

    v_current_phase := COALESCE(v_idea.metadata->'fact'->>'phase', 'draft');

    IF v_current_phase = 'abandoned' THEN
        RAISE EXCEPTION 'Cannot change phase of abandoned ideas';
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

    v_new_status := CASE p_new_phase
        WHEN 'draft' THEN 'DRAFT'
        WHEN 'discussion' THEN 'OPEN'
        WHEN 'refined' THEN 'OPEN'
        WHEN 'ready_for_vote' THEN 'OPEN'
        WHEN 'abandoned' THEN 'FAILED'
        ELSE 'DRAFT'
    END;

    v_new_metadata := jsonb_set(COALESCE(v_idea.metadata, '{}'::jsonb), '{fact,phase}', to_jsonb(p_new_phase));

    UPDATE ideas SET status = v_new_status, metadata = v_new_metadata WHERE id = p_idea_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION rpc_update_idea_phase IS 'v19.0 COMPLIANT: Update idea phase via metadata.fact.phase.';

-- Function: rpc_add_idea_comment
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
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Content is required';
    END IF;

    IF p_is_objection = true AND (p_objection_reason IS NULL OR trim(p_objection_reason) = '') THEN
        RAISE EXCEPTION 'Objection reason is required when is_objection=true';
    END IF;

    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Idea not found';
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

    SELECT full_name INTO v_user_name FROM profiles WHERE id = v_user_id;

    v_comment_id := gen_random_uuid();

    v_new_comment := jsonb_build_object(
        'id', v_comment_id::text,
        'author_id', v_user_id::text,
        'author_name', v_user_name,
        'created_at', now()::text,
        'content', trim(p_content),
        'is_objection', p_is_objection,
        'reason', CASE WHEN p_is_objection THEN trim(p_objection_reason) ELSE NULL END
    );

    v_comments := COALESCE(v_idea.metadata->'fact'->'comments', '[]'::jsonb);
    v_comments := v_comments || v_new_comment;

    v_new_metadata := COALESCE(v_idea.metadata, '{}'::jsonb);
    v_new_metadata := jsonb_set(
        jsonb_set(v_new_metadata, '{fact}', COALESCE(v_new_metadata->'fact', '{}'::jsonb)),
        '{fact,comments}', v_comments
    );

    UPDATE ideas SET metadata = v_new_metadata WHERE id = p_idea_id;

    RETURN v_comment_id;
END;
$$;

COMMENT ON FUNCTION rpc_add_idea_comment IS 'v19.0 COMPLIANT: Add comment to metadata.fact.comments[]. Append-only.';

-- Function: rpc_promote_idea_to_resolution_draft
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
    v_resolution_id uuid;
    v_resolution_metadata jsonb;
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

    RETURN v_resolution_id;
END;
$$;

COMMENT ON FUNCTION rpc_promote_idea_to_resolution_draft IS 'v19.0 COMPLIANT: Promote idea to DRAFT resolution.';

-- Function: rpc_get_idea_indicators
CREATE OR REPLACE FUNCTION rpc_get_idea_indicators(p_idea_id uuid)
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
    SELECT * INTO v_idea FROM ideas WHERE id = p_idea_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'comment_count', 0, 'objection_count', 0, 'participant_count', 0,
            'last_activity', null, '_disclaimer', 'Analytics only. No procedural meaning.'
        );
    END IF;

    v_comments := COALESCE(v_idea.metadata->'fact'->'comments', '[]'::jsonb);
    v_comment_count := jsonb_array_length(v_comments);

    SELECT COUNT(*) INTO v_objection_count
    FROM jsonb_array_elements(v_comments) AS c
    WHERE (c->>'is_objection')::boolean = true;

    SELECT array_agg(DISTINCT c->>'author_id') INTO v_participant_ids
    FROM jsonb_array_elements(v_comments) AS c
    WHERE c->>'author_id' IS NOT NULL;

    v_participant_count := COALESCE(array_length(v_participant_ids, 1), 0);

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

COMMENT ON FUNCTION rpc_get_idea_indicators IS 'v19.0 COMPLIANT: Get analytics from metadata.fact.comments[].';

-- ============================================================================
-- PART 8: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION rpc_create_idea TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_idea_phase TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_add_idea_comment TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_promote_idea_to_resolution_draft TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_idea_indicators TO authenticated;

-- ============================================================================
-- PART 9: RLS POLICIES
-- ============================================================================

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ideas_select_policy ON ideas;
DROP POLICY IF EXISTS ideas_insert_policy ON ideas;
DROP POLICY IF EXISTS ideas_update_policy ON ideas;
DROP POLICY IF EXISTS ideas_select_member ON ideas;
DROP POLICY IF EXISTS ideas_insert_owner_board ON ideas;
DROP POLICY IF EXISTS ideas_update_owner_board ON ideas;

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

-- ============================================================================
-- PART 10: UPDATE TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE ideas IS 
'v19.0 FROZEN: Ideas/planning table. PRE-GOVERNANCE uses metadata.fact.* for phase, comments, snapshots. No governance power.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_columns text[];
BEGIN
  SELECT array_agg(column_name::text ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'ideas';

  RAISE NOTICE 'ideas table columns: %', v_columns;
  
  IF 'phase' = ANY(v_columns) OR 'is_snapshot' = ANY(v_columns) OR 'parent_id' = ANY(v_columns) THEN
    RAISE WARNING 'PRE-GOVERNANCE columns still exist! Migration may have failed.';
  ELSE
    RAISE NOTICE '✅ SUCCESS: ideas table reverted to v19.0 schema';
    RAISE NOTICE '✅ PRE-GOVERNANCE data stored in metadata.fact.*';
  END IF;
END $$;

