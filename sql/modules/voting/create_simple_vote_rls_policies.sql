-- ==================================================
-- SIMPLE VOTE MODULIO RLS POLICIES
-- ==================================================
-- Saugumo taisyklės simple vote lentelėms
-- ==================================================

-- ==================================================
-- 1. SIMPLE_VOTES RLS
-- ==================================================

-- Members can read OPEN/CLOSED votes in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_votes'
    AND policyname = 'Members can read OPEN/CLOSED votes in their org'
  ) THEN
    CREATE POLICY "Members can read OPEN/CLOSED votes in their org"
    ON public.simple_votes
    FOR SELECT
    TO authenticated
    USING (
      status IN ('OPEN', 'CLOSED')
      AND EXISTS (
        SELECT 1 FROM public.memberships
        WHERE org_id = simple_votes.org_id
        AND user_id = auth.uid()
        AND member_status = 'ACTIVE'
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can CRUD votes in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_votes'
    AND policyname = 'OWNER/BOARD can CRUD votes in their org'
  ) THEN
    CREATE POLICY "OWNER/BOARD can CRUD votes in their org"
    ON public.simple_votes
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE org_id = simple_votes.org_id
        AND user_id = auth.uid()
        AND member_status = 'ACTIVE'
        AND role = 'OWNER'
      )
      OR EXISTS (
        SELECT 1 FROM public.positions
        WHERE org_id = simple_votes.org_id
        AND user_id = auth.uid()
        AND is_active = true
        AND title ILIKE '%BOARD%'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE org_id = simple_votes.org_id
        AND user_id = auth.uid()
        AND member_status = 'ACTIVE'
        AND role = 'OWNER'
      )
      OR EXISTS (
        SELECT 1 FROM public.positions
        WHERE org_id = simple_votes.org_id
        AND user_id = auth.uid()
        AND is_active = true
        AND title ILIKE '%BOARD%'
      )
    );
  END IF;
END $$;

-- ==================================================
-- 2. SIMPLE_VOTE_BALLOTS RLS
-- ==================================================

-- Members can INSERT/UPDATE their own ballots for OPEN votes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_vote_ballots'
    AND policyname = 'Members can INSERT/UPDATE their own ballots for OPEN votes'
  ) THEN
    CREATE POLICY "Members can INSERT/UPDATE their own ballots for OPEN votes"
    ON public.simple_vote_ballots
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        JOIN public.memberships m ON m.org_id = sv.org_id
        WHERE sv.id = simple_vote_ballots.vote_id
        AND sv.status = 'OPEN'
        AND m.id = simple_vote_ballots.membership_id
        AND m.user_id = auth.uid()
        AND m.member_status = 'ACTIVE'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_vote_ballots'
    AND policyname = 'Members can UPDATE their own ballots for OPEN votes'
  ) THEN
    CREATE POLICY "Members can UPDATE their own ballots for OPEN votes"
    ON public.simple_vote_ballots
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        JOIN public.memberships m ON m.org_id = sv.org_id
        WHERE sv.id = simple_vote_ballots.vote_id
        AND sv.status = 'OPEN'
        AND m.id = simple_vote_ballots.membership_id
        AND m.user_id = auth.uid()
        AND m.member_status = 'ACTIVE'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        JOIN public.memberships m ON m.org_id = sv.org_id
        WHERE sv.id = simple_vote_ballots.vote_id
        AND sv.status = 'OPEN'
        AND m.id = simple_vote_ballots.membership_id
        AND m.user_id = auth.uid()
        AND m.member_status = 'ACTIVE'
      )
    );
  END IF;
END $$;

-- Members can SELECT ballots in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_vote_ballots'
    AND policyname = 'Members can SELECT ballots in their org'
  ) THEN
    CREATE POLICY "Members can SELECT ballots in their org"
    ON public.simple_vote_ballots
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        JOIN public.memberships m ON m.org_id = sv.org_id
        WHERE sv.id = simple_vote_ballots.vote_id
        AND m.user_id = auth.uid()
        AND m.member_status = 'ACTIVE'
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can SELECT all ballots in their org (for audit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_vote_ballots'
    AND policyname = 'OWNER/BOARD can SELECT all ballots in their org'
  ) THEN
    CREATE POLICY "OWNER/BOARD can SELECT all ballots in their org"
    ON public.simple_vote_ballots
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        WHERE sv.id = simple_vote_ballots.vote_id
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = sv.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = sv.org_id
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
-- 3. SIMPLE_VOTE_ATTACHMENTS RLS
-- ==================================================

-- Members can SELECT attachments for votes in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_vote_attachments'
    AND policyname = 'Members can SELECT attachments for votes in their org'
  ) THEN
    CREATE POLICY "Members can SELECT attachments for votes in their org"
    ON public.simple_vote_attachments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        JOIN public.memberships m ON m.org_id = sv.org_id
        WHERE sv.id = simple_vote_attachments.vote_id
        AND m.user_id = auth.uid()
        AND m.member_status = 'ACTIVE'
      )
    );
  END IF;
END $$;

-- OWNER/BOARD can CRUD attachments for votes in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'simple_vote_attachments'
    AND policyname = 'OWNER/BOARD can CRUD attachments for votes in their org'
  ) THEN
    CREATE POLICY "OWNER/BOARD can CRUD attachments for votes in their org"
    ON public.simple_vote_attachments
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        WHERE sv.id = simple_vote_attachments.vote_id
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = sv.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = sv.org_id
            AND user_id = auth.uid()
            AND is_active = true
            AND title ILIKE '%BOARD%'
          )
        )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.simple_votes sv
        WHERE sv.id = simple_vote_attachments.vote_id
        AND (
          EXISTS (
            SELECT 1 FROM public.memberships
            WHERE org_id = sv.org_id
            AND user_id = auth.uid()
            AND member_status = 'ACTIVE'
            AND role = 'OWNER'
          )
          OR EXISTS (
            SELECT 1 FROM public.positions
            WHERE org_id = sv.org_id
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
   AND tablename IN ('simple_votes', 'simple_vote_ballots', 'simple_vote_attachments')) as total_policies;

