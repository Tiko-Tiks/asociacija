-- ============================================================================
-- FIX: Remove faulty snapshot immutability trigger from ideas table
-- ============================================================================
-- 
-- PROBLEM: Trigger `ideas_snapshot_immutability_trigger` references OLD.is_snapshot
--          and OLD.phase but ideas table has NO is_snapshot or phase columns.
--          Error: 42703 - record "old" has no field "is_snapshot"
--
-- ROOT CAUSE: enforce_ideas_snapshot_immutability.sql created trigger expecting
--             is_snapshot and phase columns that were never added to ideas table.
--             The ideas table uses a different schema (create_ideas_projects_module.sql)
--             which does not include these columns.
--
-- SOLUTION: Drop the trigger. Ideas table does not have snapshot functionality.
--           If snapshot/phase columns are needed in future, a new migration must
--           add them first (requires governance approval per CODE FREEZE).
--
-- ============================================================================

DROP TRIGGER IF EXISTS ideas_snapshot_immutability_trigger ON ideas;

