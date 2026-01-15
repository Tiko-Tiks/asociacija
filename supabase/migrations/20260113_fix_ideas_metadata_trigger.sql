-- ============================================================================
-- FIX: Remove faulty trigger from ideas table
-- ============================================================================
-- 
-- PROBLEM: Trigger `ideas_validate_metadata` references NEW.metadata
--          but ideas table has NO metadata column.
--          Error: 42703 - record "new" has no field "metadata"
--
-- ROOT CAUSE: validate_ideas_metadata.sql created trigger expecting metadata
--             column that was never added to ideas table schema.
--
-- SOLUTION: Drop the trigger. Ideas table does not use metadata JSONB.
--           If metadata is needed in future, a new migration must add the
--           column first (requires governance approval per CODE FREEZE).
--
-- ============================================================================

DROP TRIGGER IF EXISTS ideas_validate_metadata ON ideas;

-- Also drop from idea_comments if it has same issue
DROP TRIGGER IF EXISTS idea_comments_validate_metadata ON idea_comments;

