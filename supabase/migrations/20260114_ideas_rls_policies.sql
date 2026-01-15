-- ============================================================================
-- IDEAS / PLANNING MODULE - ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- 
-- PURPOSE: Access control for PRE-GOVERNANCE tables
-- Run this in Supabase SQL Editor to enable member access to ideas
--
-- ============================================================================

-- Enable RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS ideas_select_policy ON ideas;
DROP POLICY IF EXISTS ideas_insert_policy ON ideas;
DROP POLICY IF EXISTS ideas_update_policy ON ideas;
DROP POLICY IF EXISTS ideas_delete_policy ON ideas;
DROP POLICY IF EXISTS idea_comments_select_policy ON idea_comments;
DROP POLICY IF EXISTS idea_comments_insert_policy ON idea_comments;
DROP POLICY IF EXISTS idea_comments_update_policy ON idea_comments;
DROP POLICY IF EXISTS idea_comments_delete_policy ON idea_comments;

-- ----------------------------------------------------------------------------
-- IDEAS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- SELECT: All members (PENDING, ACTIVE, OWNER) can read ideas from their org
CREATE POLICY ideas_select_policy ON ideas
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            INNER JOIN public.orgs o ON o.id = m.org_id
            WHERE m.user_id = auth.uid()
                AND m.org_id = ideas.org_id
                AND m.member_status IN ('PENDING', 'ACTIVE', 'OWNER')
                AND o.status = 'ACTIVE'
        )
    );

-- INSERT/UPDATE/DELETE blocked - must use RPC functions
-- (implicit deny - no policies needed)

-- ----------------------------------------------------------------------------
-- IDEA_COMMENTS TABLE POLICIES  
-- ----------------------------------------------------------------------------

-- SELECT: All members can read comments
CREATE POLICY idea_comments_select_policy ON idea_comments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ideas i
            JOIN public.memberships m ON m.org_id = i.org_id
            WHERE i.id = idea_comments.idea_id
                AND m.user_id = auth.uid()
                AND m.member_status IN ('PENDING', 'ACTIVE', 'OWNER')
        )
    );

-- INSERT: Only ACTIVE/OWNER can add comments (for direct insert if RPC bypassed)
CREATE POLICY idea_comments_insert_policy ON idea_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ideas i
            JOIN public.memberships m ON m.org_id = i.org_id
            WHERE i.id = idea_comments.idea_id
                AND m.user_id = auth.uid()
                AND m.member_status IN ('ACTIVE', 'OWNER')
        )
    );

-- Verify
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: Ideas RLS policies created';
END $$;

