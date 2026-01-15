-- ==================================================
-- GA SUSIRINKIMO MODULIO RLS POLICIES
-- ==================================================
-- Saugumo taisyklės agenda lentelėms
-- ==================================================

-- ==================================================
-- 1. MEETINGS RLS (papildymai)
-- ==================================================

-- Members can read PUBLISHED meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meetings'
    AND policyname = 'Members can read PUBLISHED meetings'
  ) THEN
    CREATE POLICY "Members can read PUBLISHED meetings"
    ON public.meetings
    FOR SELECT
    TO authenticated
    USING (
      status = 'PUBLISHED'
      AND EXISTS (
        SELECT 1 FROM public.memberships
        WHERE org_id = meetings.org_id
        AND user_id = auth.uid()
        AND member_status = 'ACTIVE'
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can read DRAFT/PUBLISHED meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meetings'
    AND policyname = 'OWNER/BOARD can read DRAFT/PUBLISHED meetings'
  ) THEN
    CREATE POLICY "OWNER/BOARD can read DRAFT/PUBLISHED meetings"
    ON public.meetings
    FOR SELECT
    TO authenticated
    USING (
      status IN ('DRAFT', 'PUBLISHED')
      AND (
        EXISTS (
          SELECT 1 FROM public.memberships
          WHERE org_id = meetings.org_id
          AND user_id = auth.uid()
          AND member_status = 'ACTIVE'
          AND role = 'OWNER'
        )
        OR EXISTS (
          SELECT 1 FROM public.positions
          WHERE org_id = meetings.org_id
          AND user_id = auth.uid()
          AND is_active = true
          AND title ILIKE '%BOARD%'
        )
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can create meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meetings'
    AND policyname = 'OWNER/BOARD can create meetings'
  ) THEN
    CREATE POLICY "OWNER/BOARD can create meetings"
    ON public.meetings
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE org_id = meetings.org_id
        AND user_id = auth.uid()
        AND member_status = 'ACTIVE'
        AND role = 'OWNER'
      )
      OR EXISTS (
        SELECT 1 FROM public.positions
        WHERE org_id = meetings.org_id
        AND user_id = auth.uid()
        AND is_active = true
        AND title ILIKE '%BOARD%'
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can update DRAFT meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meetings'
    AND policyname = 'OWNER/BOARD can update DRAFT meetings'
  ) THEN
    CREATE POLICY "OWNER/BOARD can update DRAFT meetings"
    ON public.meetings
    FOR UPDATE
    TO authenticated
    USING (
      status = 'DRAFT'
      AND (
        EXISTS (
          SELECT 1 FROM public.memberships
          WHERE org_id = meetings.org_id
          AND user_id = auth.uid()
          AND member_status = 'ACTIVE'
          AND role = 'OWNER'
        )
        OR EXISTS (
          SELECT 1 FROM public.positions
          WHERE org_id = meetings.org_id
          AND user_id = auth.uid()
          AND is_active = true
          AND title ILIKE '%BOARD%'
        )
      )
    )
    WITH CHECK (
      status = 'DRAFT'
      AND (
        EXISTS (
          SELECT 1 FROM public.memberships
          WHERE org_id = meetings.org_id
          AND user_id = auth.uid()
          AND member_status = 'ACTIVE'
          AND role = 'OWNER'
        )
        OR EXISTS (
          SELECT 1 FROM public.positions
          WHERE org_id = meetings.org_id
          AND user_id = auth.uid()
          AND is_active = true
          AND title ILIKE '%BOARD%'
        )
      )
    );
  END IF;
END $$;

-- ==================================================
-- 2. MEETING_AGENDA_ITEMS RLS
-- ==================================================

-- Members can read agenda items for PUBLISHED meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_agenda_items'
    AND policyname = 'Members can read agenda items for PUBLISHED meetings'
  ) THEN
    CREATE POLICY "Members can read agenda items for PUBLISHED meetings"
    ON public.meeting_agenda_items
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_agenda_items.meeting_id
        AND m.status = 'PUBLISHED'
        AND EXISTS (
          SELECT 1 FROM public.memberships
          WHERE org_id = m.org_id
          AND user_id = auth.uid()
          AND member_status = 'ACTIVE'
        )
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can read agenda items for DRAFT/PUBLISHED meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_agenda_items'
    AND policyname = 'OWNER/BOARD can read agenda items for DRAFT/PUBLISHED meetings'
  ) THEN
    CREATE POLICY "OWNER/BOARD can read agenda items for DRAFT/PUBLISHED meetings"
    ON public.meeting_agenda_items
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_agenda_items.meeting_id
        AND m.status IN ('DRAFT', 'PUBLISHED')
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND is_active = true
            AND title ILIKE '%BOARD%'
          )
        )
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can manage agenda items for DRAFT meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_agenda_items'
    AND policyname = 'OWNER/BOARD can manage agenda items for DRAFT meetings'
  ) THEN
    CREATE POLICY "OWNER/BOARD can manage agenda items for DRAFT meetings"
    ON public.meeting_agenda_items
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_agenda_items.meeting_id
        AND m.status = 'DRAFT'
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND is_active = true
            AND title ILIKE '%BOARD%'
          )
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_agenda_items.meeting_id
        AND m.status = 'DRAFT'
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND is_active = true
            AND title ILIKE '%BOARD%'
          )
        )
      )
    );
  END IF;
END $$;

-- ==================================================
-- 3. MEETING_AGENDA_ATTACHMENTS RLS
-- ==================================================

-- Members can read attachments for PUBLISHED meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_agenda_attachments'
    AND policyname = 'Members can read attachments for PUBLISHED meetings'
  ) THEN
    CREATE POLICY "Members can read attachments for PUBLISHED meetings"
    ON public.meeting_agenda_attachments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meeting_agenda_items ai
        JOIN public.meetings m ON m.id = ai.meeting_id
        WHERE ai.id = meeting_agenda_attachments.agenda_item_id
        AND m.status = 'PUBLISHED'
        AND EXISTS (
          SELECT 1 FROM public.memberships
          WHERE org_id = m.org_id
          AND user_id = auth.uid()
          AND member_status = 'ACTIVE'
        )
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can read attachments for DRAFT/PUBLISHED meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_agenda_attachments'
    AND policyname = 'OWNER/BOARD can read attachments for DRAFT/PUBLISHED meetings'
  ) THEN
    CREATE POLICY "OWNER/BOARD can read attachments for DRAFT/PUBLISHED meetings"
    ON public.meeting_agenda_attachments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meeting_agenda_items ai
        JOIN public.meetings m ON m.id = ai.meeting_id
        WHERE ai.id = meeting_agenda_attachments.agenda_item_id
        AND m.status IN ('DRAFT', 'PUBLISHED')
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND is_active = true
            AND title ILIKE '%BOARD%'
          )
        )
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can manage attachments for DRAFT meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_agenda_attachments'
    AND policyname = 'OWNER/BOARD can manage attachments for DRAFT meetings'
  ) THEN
    CREATE POLICY "OWNER/BOARD can manage attachments for DRAFT meetings"
    ON public.meeting_agenda_attachments
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meeting_agenda_items ai
        JOIN public.meetings m ON m.id = ai.meeting_id
        WHERE ai.id = meeting_agenda_attachments.agenda_item_id
        AND m.status = 'DRAFT'
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND is_active = true
            AND title ILIKE '%BOARD%'
          )
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.meeting_agenda_items ai
        JOIN public.meetings m ON m.id = ai.meeting_id
        WHERE ai.id = meeting_agenda_attachments.agenda_item_id
        AND m.status = 'DRAFT'
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = m.org_id
            AND user_id = auth.uid()
            AND is_active = true
            AND title ILIKE '%BOARD%'
          )
        )
      )
    );
  END IF;
END $$;

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 
  '=== RLS POLICIES CREATED ===' as status,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('meetings', 'meeting_agenda_items', 'meeting_agenda_attachments')) as total_policies;

