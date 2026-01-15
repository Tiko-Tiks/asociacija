-- Fix prevent_orphan_org trigger to return NEW instead of OLD
-- This bug was preventing all UPDATE operations on memberships table
-- The trigger should only block updates that would create orphan orgs,
-- but it was returning OLD for all updates, preventing any changes

CREATE OR REPLACE FUNCTION public.prevent_orphan_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only check if we're changing an OWNER from ACTIVE to something else
    IF OLD.role = 'OWNER'
       AND OLD.member_status = 'ACTIVE'
       AND (NEW.member_status != 'ACTIVE' OR NEW.role != 'OWNER') THEN
        
        -- Check if there's another ACTIVE OWNER
        IF NOT EXISTS (
            SELECT 1
            FROM memberships m
            WHERE m.org_id = OLD.org_id
              AND m.role = 'OWNER'
              AND m.member_status = 'ACTIVE'
              AND m.id <> OLD.id
        ) THEN
            RAISE EXCEPTION 'Org % must have at least one ACTIVE OWNER', OLD.org_id;
        END IF;
    END IF;

    -- Return NEW to allow the update to proceed
    RETURN NEW;
END;
$$;
