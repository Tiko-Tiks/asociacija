-- ============================================================================
-- IDEAS / PLANNING MODULE - ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- 
-- PURPOSE: Access control for PRE-GOVERNANCE tables
-- CONSTRAINTS:
--   - No governance logic
--   - No RPC dependencies
--   - Membership-based access only
--   - Snapshots are read-only
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- IDEAS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Allowed for PENDING, ACTIVE, OWNER (same org)
CREATE POLICY ideas_select_policy ON ideas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            INNER JOIN public.orgs o ON o.id = m.org_id
            WHERE m.user_id = auth.uid()
                AND m.org_id = ideas.org_id
                AND m.member_status IN ('PENDING', 'ACTIVE', 'OWNER')
                AND o.status = 'ACTIVE'
                AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
        )
    );

-- INSERT: BLOCKED (must go through RPC later)
-- No policy = implicit deny

-- UPDATE: BLOCKED (must go through SECURITY DEFINER RPC)
DROP POLICY IF EXISTS ideas_update_policy ON ideas;
-- No policy = implicit deny

-- DELETE: BLOCKED (no deletion in MVP)
-- No policy = implicit deny

-- ----------------------------------------------------------------------------
-- IDEA_COMMENTS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: Allowed for PENDING, ACTIVE, OWNER (same org via ideas.org_id)
CREATE POLICY idea_comments_select_policy ON idea_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas i
            JOIN public.memberships m ON m.org_id = i.org_id
            INNER JOIN public.orgs o ON o.id = m.org_id
            WHERE i.id = idea_comments.idea_id
                AND m.user_id = auth.uid()
                AND m.member_status IN ('PENDING', 'ACTIVE', 'OWNER')
                AND o.status = 'ACTIVE'
                AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
        )
    );

-- INSERT: Allowed ONLY if member_status IN ('ACTIVE','OWNER')
CREATE POLICY idea_comments_insert_policy ON idea_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ideas i
            JOIN public.memberships m ON m.org_id = i.org_id
            INNER JOIN public.orgs o ON o.id = m.org_id
            WHERE i.id = idea_comments.idea_id
                AND m.user_id = auth.uid()
                AND m.member_status IN ('ACTIVE', 'OWNER')
                AND o.status = 'ACTIVE'
                AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
        )
    );

-- UPDATE: BLOCKED
-- No policy = implicit deny

-- DELETE: BLOCKED
-- No policy = implicit deny

-- ----------------------------------------------------------------------------
-- NOTES:
-- ----------------------------------------------------------------------------
-- 1. All policies use auth.uid() for Supabase authentication context.
--
-- 2. UPDATE on ideas is blocked (no policy) - all writes must go through
--    SECURITY DEFINER RPC functions for validation and audit.
--
-- 3. idea_comments access is gated through ideas.org_id join to ensure
--    comments are only accessible to members of the idea's organization.
--
-- 4. INSERT on ideas is blocked (no policy) - must go through RPC function
--    in later stage for validation and audit.
--
-- 5. DELETE is blocked on both tables (no policies) - no deletion in MVP.
-- ----------------------------------------------------------------------------
