-- ============================================================================
-- MIGRATION: Transform ideas table to PRE-GOVERNANCE schema
-- ============================================================================
-- 
-- PURPOSE: Convert balsavimo modulis to PRE-GOVERNANCE discussion module
-- 
-- ARCHITECTURAL TRUTH:
--   1. Ideas module has ZERO legal/procedural power
--   2. Phases are LABELS, not states
--   3. Only allowed transition: IDEA → DRAFT resolution
--   4. No voting in this module (voting happens in Governance)
--
-- CHANGES:
--   - Add: phase, content, is_snapshot, parent_id, snapshot_label, metadata
--   - Migrate: status → phase, summary+details → content
--   - Keep: legacy columns for backwards compatibility (marked deprecated)
--
-- ============================================================================

-- Step 1: Add new columns if they don't exist
DO $$
BEGIN
  -- Add phase column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'phase'
  ) THEN
    ALTER TABLE public.ideas 
    ADD COLUMN phase text NOT NULL DEFAULT 'draft'
    CHECK (phase IN ('draft', 'discussion', 'refined', 'ready_for_vote', 'abandoned'));
    RAISE NOTICE 'Added column: phase';
  END IF;

  -- Add content column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.ideas ADD COLUMN content text;
    RAISE NOTICE 'Added column: content';
  END IF;

  -- Add is_snapshot column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'is_snapshot'
  ) THEN
    ALTER TABLE public.ideas ADD COLUMN is_snapshot boolean NOT NULL DEFAULT false;
    RAISE NOTICE 'Added column: is_snapshot';
  END IF;

  -- Add parent_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.ideas ADD COLUMN parent_id uuid NULL;
    RAISE NOTICE 'Added column: parent_id';
  END IF;

  -- Add snapshot_label column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'snapshot_label'
  ) THEN
    ALTER TABLE public.ideas ADD COLUMN snapshot_label text NULL;
    RAISE NOTICE 'Added column: snapshot_label';
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.ideas ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object');
    RAISE NOTICE 'Added column: metadata';
  END IF;
END $$;

-- Step 2: Migrate data from old columns to new columns
DO $$
BEGIN
  -- Migrate content from summary + details
  UPDATE public.ideas
  SET content = COALESCE(
    CASE 
      WHEN summary IS NOT NULL AND details IS NOT NULL THEN summary || E'\n\n' || details
      WHEN summary IS NOT NULL THEN summary
      WHEN details IS NOT NULL THEN details
      ELSE ''
    END,
    ''
  )
  WHERE content IS NULL OR content = '';

  -- Migrate status to phase
  UPDATE public.ideas
  SET phase = CASE status
    WHEN 'DRAFT' THEN 'draft'
    WHEN 'OPEN' THEN 'discussion'
    WHEN 'PASSED' THEN 'ready_for_vote'
    WHEN 'FAILED' THEN 'abandoned'
    WHEN 'NOT_COMPLETED' THEN 'abandoned'
    WHEN 'ARCHIVED' THEN 'abandoned'
    ELSE 'draft'
  END
  WHERE phase = 'draft' AND status IS NOT NULL;

  RAISE NOTICE 'Migrated data from legacy columns';
END $$;

-- Step 3: Make content NOT NULL after migration
DO $$
BEGIN
  -- Only alter if content allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' 
    AND column_name = 'content' AND is_nullable = 'YES'
  ) THEN
    -- Set default for any remaining NULL values
    UPDATE public.ideas SET content = '' WHERE content IS NULL;
    ALTER TABLE public.ideas ALTER COLUMN content SET NOT NULL;
    RAISE NOTICE 'Made content column NOT NULL';
  END IF;
END $$;

-- Step 4: Add comments to mark deprecated columns
COMMENT ON COLUMN public.ideas.status IS 'DEPRECATED: Use phase column instead. Kept for backwards compatibility.';
COMMENT ON COLUMN public.ideas.summary IS 'DEPRECATED: Use content column instead. Kept for backwards compatibility.';
COMMENT ON COLUMN public.ideas.details IS 'DEPRECATED: Use content column instead. Kept for backwards compatibility.';
COMMENT ON COLUMN public.ideas.opened_at IS 'DEPRECATED: No voting in PRE-GOVERNANCE module. Kept for backwards compatibility.';
COMMENT ON COLUMN public.ideas.closed_at IS 'DEPRECATED: No voting in PRE-GOVERNANCE module. Kept for backwards compatibility.';
COMMENT ON COLUMN public.ideas.passed_at IS 'DEPRECATED: No voting in PRE-GOVERNANCE module. Kept for backwards compatibility.';

-- Step 5: Add comments for new columns
COMMENT ON COLUMN public.ideas.phase IS 'PRE-GOVERNANCE: Discussion phase label (draft, discussion, refined, ready_for_vote, abandoned). Labels only, no procedural meaning.';
COMMENT ON COLUMN public.ideas.content IS 'PRE-GOVERNANCE: Full idea content/description.';
COMMENT ON COLUMN public.ideas.is_snapshot IS 'PRE-GOVERNANCE: True if this is a snapshot (immutable copy) of another idea.';
COMMENT ON COLUMN public.ideas.parent_id IS 'PRE-GOVERNANCE: Reference to parent idea (for snapshots).';
COMMENT ON COLUMN public.ideas.snapshot_label IS 'PRE-GOVERNANCE: Human-readable label for snapshot.';
COMMENT ON COLUMN public.ideas.metadata IS 'PRE-GOVERNANCE: JSONB metadata following Registry v1.0 (ai.*, fact.*, ui.* namespaces).';

-- Step 6: Create indexes for new columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_phase') THEN
    CREATE INDEX idx_ideas_phase ON public.ideas(org_id, phase);
    RAISE NOTICE 'Created index: idx_ideas_phase';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_parent') THEN
    CREATE INDEX idx_ideas_parent ON public.ideas(parent_id) WHERE parent_id IS NOT NULL;
    RAISE NOTICE 'Created index: idx_ideas_parent';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_snapshot') THEN
    CREATE INDEX idx_ideas_snapshot ON public.ideas(is_snapshot) WHERE is_snapshot = true;
    RAISE NOTICE 'Created index: idx_ideas_snapshot';
  END IF;
END $$;

-- Step 7: Update table comment
COMMENT ON TABLE public.ideas IS 'PRE-GOVERNANCE: Discussion and planning space. Ideas have ZERO legal/procedural power. Phases are labels only. Only transition: IDEA -> DRAFT resolution (via rpc_promote_to_resolution_draft). No voting occurs in this module.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_phase_exists boolean;
  v_content_exists boolean;
  v_is_snapshot_exists boolean;
  v_metadata_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'phase'
  ) INTO v_phase_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'content'
  ) INTO v_content_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'is_snapshot'
  ) INTO v_is_snapshot_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'metadata'
  ) INTO v_metadata_exists;

  IF v_phase_exists AND v_content_exists AND v_is_snapshot_exists AND v_metadata_exists THEN
    RAISE NOTICE 'SUCCESS: ideas table transformed to PRE-GOVERNANCE schema';
  ELSE
    RAISE WARNING 'INCOMPLETE: Some columns may be missing. Check migration logs.';
  END IF;
END $$;

