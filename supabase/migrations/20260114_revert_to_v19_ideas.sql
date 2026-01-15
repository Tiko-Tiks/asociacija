-- ============================================================================
-- MIGRATION: Revert ideas to v19.0 compliant schema
-- ============================================================================
--
-- ARCHITECTURAL DECISION: v19.0 STRICT COMPLIANCE
--   ❌ No new tables
--   ❌ No new columns  
--   ✅ Only metadata JSONB
--   ✅ Only existing ideas table
--   ✅ Only RPC / VIEW / TRIGGER
--
-- PRE-GOVERNANCE is an INTERPRETATION LAYER, not a schema-level module.
--
-- ============================================================================

-- Step 1: Migrate data from new columns to metadata.fact.*
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

  -- Only migrate if new columns exist
  IF v_has_phase OR v_has_content OR v_has_is_snapshot THEN
    RAISE NOTICE 'Migrating PRE-GOVERNANCE data to metadata.fact.*';
    
    FOR v_idea IN 
      SELECT * FROM ideas
    LOOP
      -- Build new metadata with fact.* namespace
      v_new_metadata := COALESCE(v_idea.metadata, '{}'::jsonb);
      
      -- Add fact.phase if phase column exists
      IF v_has_phase AND v_idea.phase IS NOT NULL THEN
        v_new_metadata := jsonb_set(
          v_new_metadata, 
          '{fact,phase}', 
          to_jsonb(v_idea.phase)
        );
      END IF;
      
      -- Add fact.is_snapshot if is_snapshot column exists
      IF v_has_is_snapshot THEN
        v_new_metadata := jsonb_set(
          v_new_metadata, 
          '{fact,is_snapshot}', 
          to_jsonb(COALESCE(v_idea.is_snapshot, false))
        );
      END IF;
      
      -- Add fact.parent_id if parent_id exists
      IF v_has_is_snapshot AND v_idea.parent_id IS NOT NULL THEN
        v_new_metadata := jsonb_set(
          v_new_metadata, 
          '{fact,parent_id}', 
          to_jsonb(v_idea.parent_id::text)
        );
      END IF;
      
      -- Migrate content to details (use existing column)
      -- And summary stays as-is
      IF v_has_content AND v_idea.content IS NOT NULL AND v_idea.content != '' THEN
        UPDATE ideas 
        SET 
          details = COALESCE(v_idea.content, details),
          metadata = v_new_metadata
        WHERE id = v_idea.id;
      ELSE
        UPDATE ideas 
        SET metadata = v_new_metadata
        WHERE id = v_idea.id;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration complete';
  ELSE
    RAISE NOTICE 'No new columns found, skipping data migration';
  END IF;
END $$;

-- Step 2: Migrate comments from idea_comments table to metadata.fact.comments[]
-- ============================================================================

DO $$
DECLARE
  v_comment RECORD;
  v_idea_metadata jsonb;
  v_comments jsonb;
  v_new_comment jsonb;
BEGIN
  -- Check if idea_comments table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'idea_comments'
  ) THEN
    RAISE NOTICE 'Migrating comments from idea_comments to metadata.fact.comments[]';
    
    FOR v_comment IN 
      SELECT 
        ic.*,
        p.full_name as author_name
      FROM idea_comments ic
      LEFT JOIN profiles p ON p.id = ic.user_id
      ORDER BY ic.idea_id, ic.created_at
    LOOP
      -- Get current idea metadata
      SELECT metadata INTO v_idea_metadata
      FROM ideas WHERE id = v_comment.idea_id;
      
      IF v_idea_metadata IS NULL THEN
        v_idea_metadata := '{}'::jsonb;
      END IF;
      
      -- Get existing comments array or create empty
      v_comments := COALESCE(v_idea_metadata->'fact'->'comments', '[]'::jsonb);
      
      -- Build new comment object
      v_new_comment := jsonb_build_object(
        'id', v_comment.id::text,
        'author_id', v_comment.user_id::text,
        'author_name', v_comment.author_name,
        'created_at', v_comment.created_at,
        'content', v_comment.content,
        'is_objection', COALESCE(v_comment.is_objection, false),
        'reason', v_comment.metadata->'fact'->'objection'->>'reason'
      );
      
      -- Append to comments array
      v_comments := v_comments || v_new_comment;
      
      -- Update idea metadata
      UPDATE ideas
      SET metadata = jsonb_set(
        jsonb_set(v_idea_metadata, '{fact}', COALESCE(v_idea_metadata->'fact', '{}'::jsonb)),
        '{fact,comments}',
        v_comments
      )
      WHERE id = v_comment.idea_id;
    END LOOP;
    
    RAISE NOTICE 'Comments migration complete';
  ELSE
    RAISE NOTICE 'idea_comments table does not exist, skipping';
  END IF;
END $$;

-- Step 3: Drop idea_comments table
-- ============================================================================

DROP TABLE IF EXISTS idea_comments CASCADE;

-- Step 4: Drop new columns from ideas table (revert to v19 schema)
-- ============================================================================

DO $$
BEGIN
  -- Drop phase column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'phase'
  ) THEN
    ALTER TABLE ideas DROP COLUMN phase;
    RAISE NOTICE 'Dropped column: phase';
  END IF;

  -- Drop content column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'content'
  ) THEN
    ALTER TABLE ideas DROP COLUMN content;
    RAISE NOTICE 'Dropped column: content';
  END IF;

  -- Drop is_snapshot column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'is_snapshot'
  ) THEN
    ALTER TABLE ideas DROP COLUMN is_snapshot;
    RAISE NOTICE 'Dropped column: is_snapshot';
  END IF;

  -- Drop parent_id column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE ideas DROP COLUMN parent_id;
    RAISE NOTICE 'Dropped column: parent_id';
  END IF;

  -- Drop snapshot_label column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'snapshot_label'
  ) THEN
    ALTER TABLE ideas DROP COLUMN snapshot_label;
    RAISE NOTICE 'Dropped column: snapshot_label';
  END IF;

  -- Keep metadata column if it was part of original v19 schema
  -- If not, we need to add it (metadata is allowed as JSONB extension channel)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE ideas ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added column: metadata (allowed by v19 as JSONB extension channel)';
  END IF;
END $$;

-- Step 5: Drop indexes for removed columns
-- ============================================================================

DROP INDEX IF EXISTS idx_ideas_phase;
DROP INDEX IF EXISTS idx_ideas_parent;
DROP INDEX IF EXISTS idx_ideas_snapshot;

-- Step 6: Ensure metadata has CHECK constraint
-- ============================================================================

DO $$
BEGIN
  -- Add CHECK constraint for metadata if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ideas_metadata_check' 
    AND conrelid = 'ideas'::regclass
  ) THEN
    ALTER TABLE ideas 
    ADD CONSTRAINT ideas_metadata_check 
    CHECK (jsonb_typeof(metadata) = 'object');
    RAISE NOTICE 'Added metadata CHECK constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Metadata CHECK constraint already exists';
END $$;

-- Step 7: Drop old RPC functions
-- ============================================================================

DROP FUNCTION IF EXISTS rpc_create_idea(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS rpc_update_idea_phase(uuid, text);
DROP FUNCTION IF EXISTS rpc_add_idea_comment(uuid, text, boolean, jsonb);
DROP FUNCTION IF EXISTS rpc_add_comment(uuid, text, boolean, jsonb);
DROP FUNCTION IF EXISTS rpc_promote_to_resolution_draft(uuid);
DROP FUNCTION IF EXISTS rpc_get_idea_indicators(uuid);

-- Step 8: Update table comment
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
  
  -- Verify no PRE-GOVERNANCE columns remain
  IF 'phase' = ANY(v_columns) OR 'is_snapshot' = ANY(v_columns) OR 'parent_id' = ANY(v_columns) THEN
    RAISE WARNING 'PRE-GOVERNANCE columns still exist!';
  ELSE
    RAISE NOTICE 'SUCCESS: ideas table reverted to v19.0 schema';
  END IF;
END $$;

