-- ============================================================================
-- IDEAS / PLANNING MODULE - PRE-GOVERNANCE TABLES
-- ============================================================================
-- 
-- PURPOSE: Non-binding discussion and planning space
-- CONSTRAINTS:
--   - Zero legal/procedural power
--   - No foreign keys to governance tables
--   - Metadata follows Registry v1.0 (jsonb object only)
--   - Phases are labels, NOT statuses
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: ideas
-- ----------------------------------------------------------------------------
-- Pre-governance discussion and planning space.
-- Ideas can be snapshotted (parent_id self-reference).
-- Phases track discussion progress but have no procedural meaning.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ideas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL,
    parent_id uuid NULL,
    is_snapshot boolean NOT NULL DEFAULT false,
    snapshot_label text NULL,
    title text NOT NULL,
    content text NOT NULL,
    phase text NOT NULL DEFAULT 'draft'
        CHECK (phase IN ('draft', 'discussion', 'refined', 'ready_for_vote', 'abandoned')),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object')
);

-- Self-reference for snapshots (no FK constraint yet)
-- parent_id references ideas.id logically

-- ----------------------------------------------------------------------------
-- TABLE: idea_comments
-- ----------------------------------------------------------------------------
-- Discussion comments on ideas.
-- Objections are semantic markers, not procedural blocks.
-- No voting or decision-making semantics.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS idea_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    is_objection boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(metadata) = 'object')
);

-- ----------------------------------------------------------------------------
-- NOTES:
-- ----------------------------------------------------------------------------
-- 1. Foreign keys to orgs.id and logical references will be added in later
--    stage after schema validation.
--
-- 2. Snapshot protection (no UPDATE on is_snapshot = true) will be enforced
--    via triggers in later stage.
--
-- 3. Unique indexes (e.g., preventing duplicate titles) will be added in
--    later stage based on business requirements.
--
-- 4. RLS policies will be added in later stage for access control.
--
-- 5. Metadata keys must follow Registry v1.0:
--    - Allowed prefixes: fact.*, project.*, ui.*, ai.*
--    - No structural duplication (title, status, etc. in metadata)
-- ----------------------------------------------------------------------------
