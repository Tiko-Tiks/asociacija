-- ============================================================================
-- IDEAS / PLANNING MODULE - SNAPSHOT IMMUTABILITY & PHASE SAFETY
-- ============================================================================
-- 
-- PURPOSE: Database-level enforcement for snapshot protection and phase safety
-- CONSTRAINTS:
--   - PRE-GOVERNANCE only
--   - No governance logic
--   - Fail hard on violations
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: enforce_ideas_snapshot_immutability()
-- ----------------------------------------------------------------------------
-- Enforces snapshot immutability and phase safety rules
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_ideas_snapshot_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_allowed_phases text[] := ARRAY['draft', 'discussion', 'refined', 'ready_for_vote', 'abandoned'];
BEGIN
    -- DELETE: Block if snapshot
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_snapshot = true THEN
            RAISE EXCEPTION 'Cannot delete snapshot ideas - snapshots are immutable';
        END IF;
        RETURN OLD;
    END IF;

    -- UPDATE: Block if snapshot
    IF TG_OP = 'UPDATE' THEN
        -- Snapshot immutability: block all updates to snapshots
        IF OLD.is_snapshot = true THEN
            RAISE EXCEPTION 'Cannot update snapshot ideas - snapshots are immutable';
        END IF;

        -- Phase safety: phase cannot be changed if is_snapshot = true
        -- (This check is redundant given the above, but kept for clarity)
        IF OLD.is_snapshot = true AND (OLD.phase IS DISTINCT FROM NEW.phase) THEN
            RAISE EXCEPTION 'Cannot change phase of snapshot ideas';
        END IF;

        -- Phase safety: ensure phase value is one of allowed labels
        -- (CHECK constraint already enforces this, but trigger provides better error)
        IF NEW.phase IS NOT NULL AND NEW.phase != ALL(v_allowed_phases) THEN
            RAISE EXCEPTION 'Invalid phase value: %. Allowed values: draft, discussion, refined, ready_for_vote, abandoned', NEW.phase;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger for UPDATE and DELETE operations
DROP TRIGGER IF EXISTS ideas_snapshot_immutability_trigger ON ideas;
CREATE TRIGGER ideas_snapshot_immutability_trigger
    BEFORE UPDATE OR DELETE ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION enforce_ideas_snapshot_immutability();

-- ----------------------------------------------------------------------------
-- NOTES:
-- ----------------------------------------------------------------------------
-- 1. Snapshot immutability is enforced at database level - snapshots cannot
--    be updated or deleted, even through RPC functions.
--
-- 2. Phase safety ensures phase values remain valid and snapshots cannot
--    have their phase changed (redundant check given snapshot immutability).
--
-- 3. Direct UPDATE on ideas is already blocked by RLS, but trigger provides
--    defense-in-depth for RPC functions that bypass RLS.
--
-- 4. Fail-hard approach: all violations raise EXCEPTION with descriptive
--    error messages - no silent corrections or warnings.
--
-- 5. Trigger runs BEFORE UPDATE/DELETE to prevent any data modification
--    when violations occur.
-- ----------------------------------------------------------------------------
