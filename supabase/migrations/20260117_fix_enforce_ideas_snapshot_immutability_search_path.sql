-- ==================================================
-- FIX: Set search_path for enforce_ideas_snapshot_immutability function
-- ==================================================
-- Security Issue: Function has mutable search_path (security vulnerability)
-- Solution: Add SET search_path = public, pg_temp to function
-- Governance: Audit-safe - no schema changes, only security fix
-- ==================================================
-- 
-- IMPORTANT: This migration fixes the security vulnerability where
-- enforce_ideas_snapshot_immutability function doesn't have an explicit
-- search_path set, which can lead to search path manipulation attacks.
-- ==================================================

-- ==================================================
-- Fix enforce_ideas_snapshot_immutability function
-- ==================================================

CREATE OR REPLACE FUNCTION enforce_ideas_snapshot_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
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

COMMENT ON FUNCTION enforce_ideas_snapshot_immutability IS 
'Governance: Enforces snapshot immutability and phase safety rules. Snapshots cannot be updated or deleted. Security: search_path is set to prevent injection attacks.';

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Verify search_path is set correctly
DO $$
DECLARE
    v_search_path text;
BEGIN
    -- Check enforce_ideas_snapshot_immutability
    SELECT pg_get_functiondef(oid) INTO v_search_path
    FROM pg_proc
    WHERE proname = 'enforce_ideas_snapshot_immutability'
    AND pronamespace = 'public'::regnamespace;
    
    IF v_search_path LIKE '%SET search_path%' THEN
        RAISE NOTICE 'SUCCESS: enforce_ideas_snapshot_immutability has search_path set';
    ELSE
        RAISE WARNING 'enforce_ideas_snapshot_immutability does not have search_path set';
    END IF;
END $$;
