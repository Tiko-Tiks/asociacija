-- ==================================================
-- FIX: Allow reading agenda items for COMPLETED meetings
-- ==================================================
-- Problem: RLS policies only allow reading agenda items for PUBLISHED/DRAFT meetings
-- Solution: Update policies to include COMPLETED (and CANCELLED) meetings
-- ==================================================
-- NOTE: This is a database-level fix, not a code change
-- Run this in Supabase SQL Editor
-- ==================================================

-- 1. Update "Members can read agenda items for PUBLISHED meetings"
--    Change to allow PUBLISHED, COMPLETED, and CANCELLED
DO $$
BEGIN
  -- Drop existing policy
  DROP POLICY IF EXISTS "Members can read agenda items for PUBLISHED meetings" 
    ON public.meeting_agenda_items;
  
  -- Create updated policy
  CREATE POLICY "Members can read agenda items for PUBLISHED/COMPLETED meetings"
    ON public.meeting_agenda_items
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM meetings m
        WHERE m.id = meeting_agenda_items.meeting_id
          AND m.status IN ('PUBLISHED', 'COMPLETED', 'CANCELLED')
          AND EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = m.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.member_status = 'ACTIVE'
          )
      )
    );
END $$;

-- 2. Update "OWNER/BOARD can read agenda items for DRAFT/PUBLISHED meetings"
--    Change to allow DRAFT, PUBLISHED, COMPLETED, and CANCELLED
DO $$
BEGIN
  -- Drop existing policy
  DROP POLICY IF EXISTS "OWNER/BOARD can read agenda items for DRAFT/PUBLISHED meetings" 
    ON public.meeting_agenda_items;
  
  -- Create updated policy
  CREATE POLICY "OWNER/BOARD can read agenda items for all meetings"
    ON public.meeting_agenda_items
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM meetings m
        WHERE m.id = meeting_agenda_items.meeting_id
          AND m.status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')
          AND (
            EXISTS (
              SELECT 1
              FROM memberships
              WHERE memberships.org_id = m.org_id
                AND memberships.user_id = auth.uid()
                AND memberships.member_status = 'ACTIVE'
                AND memberships.role = 'OWNER'
            )
            OR EXISTS (
              SELECT 1
              FROM positions
              WHERE positions.org_id = m.org_id
                AND positions.user_id = auth.uid()
                AND positions.is_active = true
                AND positions.title ILIKE '%BOARD%'
            )
          )
      )
    );
END $$;

-- 3. Also update agenda attachments policies for consistency
DO $$
BEGIN
  -- Drop existing policy
  DROP POLICY IF EXISTS "Members can read attachments for PUBLISHED meetings" 
    ON public.meeting_agenda_attachments;
  
  -- Create updated policy
  CREATE POLICY "Members can read attachments for PUBLISHED/COMPLETED meetings"
    ON public.meeting_agenda_attachments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM meeting_agenda_items ai
        JOIN meetings m ON m.id = ai.meeting_id
        WHERE ai.id = meeting_agenda_attachments.agenda_item_id
          AND m.status IN ('PUBLISHED', 'COMPLETED', 'CANCELLED')
          AND EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = m.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.member_status = 'ACTIVE'
          )
      )
    );
END $$;

DO $$
BEGIN
  -- Drop existing policy
  DROP POLICY IF EXISTS "OWNER/BOARD can read attachments for DRAFT/PUBLISHED meetings" 
    ON public.meeting_agenda_attachments;
  
  -- Create updated policy
  CREATE POLICY "OWNER/BOARD can read attachments for all meetings"
    ON public.meeting_agenda_attachments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM meeting_agenda_items ai
        JOIN meetings m ON m.id = ai.meeting_id
        WHERE ai.id = meeting_agenda_attachments.agenda_item_id
          AND m.status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')
          AND (
            EXISTS (
              SELECT 1
              FROM memberships
              WHERE memberships.org_id = m.org_id
                AND memberships.user_id = auth.uid()
                AND memberships.member_status = 'ACTIVE'
                AND memberships.role = 'OWNER'
            )
            OR EXISTS (
              SELECT 1
              FROM positions
              WHERE positions.org_id = m.org_id
                AND positions.user_id = auth.uid()
                AND positions.is_active = true
                AND positions.title ILIKE '%BOARD%'
            )
          )
      )
    );
END $$;

-- ==================================================
-- VERIFICATION
-- ==================================================
-- After running this migration, verify policies:
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'meeting_agenda_items';
-- ==================================================

