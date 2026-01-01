-- ==================================================
-- GA PROTOKOLŲ MODULIO RLS POLICIES
-- ==================================================
-- Saugumo taisyklės protokolo lentelėms
-- ==================================================

-- ==================================================
-- 1. MEETING_PROTOCOLS RLS
-- ==================================================

-- Members can read FINAL protocols in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_protocols'
    AND policyname = 'Members can read FINAL protocols in their org'
  ) THEN
    CREATE POLICY "Members can read FINAL protocols in their org"
    ON public.meeting_protocols
    FOR SELECT
    TO authenticated
    USING (
      status = 'FINAL'
      AND EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_protocols.meeting_id
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

-- OWNER/BOARD can read DRAFT/FINAL protocols in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_protocols'
    AND policyname = 'OWNER/BOARD can read DRAFT/FINAL protocols in their org'
  ) THEN
    CREATE POLICY "OWNER/BOARD can read DRAFT/FINAL protocols in their org"
    ON public.meeting_protocols
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_protocols.meeting_id
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

-- OWNER/BOARD can create protocols in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_protocols'
    AND policyname = 'OWNER/BOARD can create protocols in their org'
  ) THEN
    CREATE POLICY "OWNER/BOARD can create protocols in their org"
    ON public.meeting_protocols
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_protocols.meeting_id
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

-- Prevent UPDATE of FINAL protocols (immutability)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_protocols'
    AND policyname = 'Prevent UPDATE of FINAL protocols'
  ) THEN
    CREATE POLICY "Prevent UPDATE of FINAL protocols"
    ON public.meeting_protocols
    FOR UPDATE
    TO authenticated
    USING (status != 'FINAL')
    WITH CHECK (status != 'FINAL');
  END IF;
END $$;

-- OWNER/BOARD can update DRAFT protocols (for PDF path)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_protocols'
    AND policyname = 'OWNER/BOARD can update DRAFT protocols'
  ) THEN
    CREATE POLICY "OWNER/BOARD can update DRAFT protocols"
    ON public.meeting_protocols
    FOR UPDATE
    TO authenticated
    USING (
      status = 'DRAFT'
      AND EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_protocols.meeting_id
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
      status = 'DRAFT'
      AND EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_protocols.meeting_id
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
-- 2. MEETING_PROTOCOL_SIGNATURES RLS
-- ==================================================

-- Members can read signatures for FINAL protocols in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_protocol_signatures'
    AND policyname = 'Members can read signatures for FINAL protocols in their org'
  ) THEN
    CREATE POLICY "Members can read signatures for FINAL protocols in their org"
    ON public.meeting_protocol_signatures
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meeting_protocols mp
        JOIN public.meetings m ON m.id = mp.meeting_id
        WHERE mp.id = meeting_protocol_signatures.protocol_id
        AND mp.status = 'FINAL'
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

-- OWNER/BOARD can manage signatures for protocols in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'meeting_protocol_signatures'
    AND policyname = 'OWNER/BOARD can manage signatures for protocols in their org'
  ) THEN
    CREATE POLICY "OWNER/BOARD can manage signatures for protocols in their org"
    ON public.meeting_protocol_signatures
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.meeting_protocols mp
        JOIN public.meetings m ON m.id = mp.meeting_id
        WHERE mp.id = meeting_protocol_signatures.protocol_id
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
        SELECT 1 FROM public.meeting_protocols mp
        JOIN public.meetings m ON m.id = mp.meeting_id
        WHERE mp.id = meeting_protocol_signatures.protocol_id
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
   AND tablename IN ('meeting_protocols', 'meeting_protocol_signatures')) as total_policies;

