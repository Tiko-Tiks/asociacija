-- ==================================================
-- FIX: Enable RLS on idea_comments table
-- ==================================================
-- Security Issue: Table idea_comments is public but RLS is not enabled
-- Solution: Enable RLS and ensure policies exist
-- Governance: Audit-safe - no schema changes, only security fix
-- ==================================================
-- 
-- IMPORTANT: This migration ensures RLS is enabled on idea_comments table.
-- All public tables exposed to PostgREST must have RLS enabled for security.
-- ==================================================

-- Enable ROW LEVEL SECURITY on idea_comments table
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
DO $$
DECLARE
  v_rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'idea_comments'
    AND relnamespace = 'public'::regnamespace;
  
  IF v_rls_enabled THEN
    RAISE NOTICE 'SUCCESS: RLS enabled on idea_comments table';
  ELSE
    RAISE WARNING 'RLS is not enabled on idea_comments table';
  END IF;
END $$;

-- Ensure RLS policies exist (create if they don't)
-- These policies should match the ones in sql/modules/ideas/create_ideas_rls_policies.sql

-- SELECT policy: Allowed for PENDING, ACTIVE, OWNER (same org via ideas.org_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_comments' 
    AND policyname = 'idea_comments_select_policy'
  ) THEN
    -- Check if orgs table has metadata column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'metadata'
    ) THEN
      -- Policy with metadata check (if metadata column exists)
      CREATE POLICY idea_comments_select_policy ON public.idea_comments
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
    ELSE
      -- Policy without metadata check (if metadata column doesn't exist)
      CREATE POLICY idea_comments_select_policy ON public.idea_comments
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
            )
        );
    END IF;
    RAISE NOTICE 'Created idea_comments_select_policy';
  ELSE
    RAISE NOTICE 'idea_comments_select_policy already exists';
  END IF;
END $$;

-- INSERT policy: Allowed ONLY if member_status IN ('ACTIVE','OWNER')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'idea_comments' 
    AND policyname = 'idea_comments_insert_policy'
  ) THEN
    -- Check if orgs table has metadata column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'metadata'
    ) THEN
      -- Policy with metadata check (if metadata column exists)
      CREATE POLICY idea_comments_insert_policy ON public.idea_comments
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
    ELSE
      -- Policy without metadata check (if metadata column doesn't exist)
      CREATE POLICY idea_comments_insert_policy ON public.idea_comments
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
            )
        );
    END IF;
    RAISE NOTICE 'Created idea_comments_insert_policy';
  ELSE
    RAISE NOTICE 'idea_comments_insert_policy already exists';
  END IF;
END $$;

-- Verify policies exist
DO $$
DECLARE
  v_policy_count int;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'idea_comments';
  
  IF v_policy_count >= 2 THEN
    RAISE NOTICE 'SUCCESS: idea_comments has % RLS policies', v_policy_count;
  ELSE
    RAISE WARNING 'idea_comments has only % RLS policies (expected at least 2)', v_policy_count;
  END IF;
END $$;

COMMENT ON TABLE public.idea_comments IS 
'Governance: Discussion comments on ideas. RLS enabled - access controlled via membership status and org membership. UPDATE and DELETE are blocked (no policies).';
