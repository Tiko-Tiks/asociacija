-- ==================================================
-- RLS Policies for Organization Review Requests
-- ==================================================
-- IMPORTANT: Run this AFTER create_org_review_requests.sql
-- ==================================================

-- Ensure table exists before enabling RLS
-- If table doesn't exist, skip RLS setup (will be enabled when table is created)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'org_review_requests'
  ) THEN
    -- Enable RLS on org_review_requests
    ALTER TABLE public.org_review_requests ENABLE ROW LEVEL SECURITY;
  ELSE
    -- Just log a warning, don't fail
    RAISE WARNING 'Table org_review_requests does not exist. RLS will be enabled when table is created.';
  END IF;
END $$;

-- 1. OWNER can SELECT their own org requests
CREATE POLICY "org_review_requests_select_owner"
ON public.org_review_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = auth.uid()
      AND m.org_id = org_review_requests.org_id
      AND m.role = 'OWNER'
      AND m.member_status = 'ACTIVE'
      AND o.status = 'ACTIVE'
      AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  )
);

-- 2. Platform admin can SELECT all requests
CREATE POLICY "org_review_requests_select_admin"
ON public.org_review_requests
FOR SELECT
USING (
  public.is_platform_admin(auth.uid())
);

-- 3. Platform admin can UPDATE requests (for status changes)
CREATE POLICY "org_review_requests_update_admin"
ON public.org_review_requests
FOR UPDATE
USING (
  public.is_platform_admin(auth.uid())
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
);

-- 4. INSERT is only allowed via RPC (no direct inserts)
-- But we add a policy that allows it if user is OWNER (for safety)
CREATE POLICY "org_review_requests_insert_owner"
ON public.org_review_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    INNER JOIN public.orgs o ON o.id = m.org_id
    WHERE m.user_id = auth.uid()
      AND m.org_id = org_review_requests.org_id
      AND m.role = 'OWNER'
      AND m.member_status = 'ACTIVE'
      AND o.status = 'ACTIVE'
      AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  )
  AND requested_by = auth.uid()
  AND status = 'OPEN'
);

-- Note: DELETE is not allowed (requests are historical records)
-- If needed, add a soft delete mechanism

COMMENT ON POLICY "org_review_requests_select_owner" ON public.org_review_requests IS 'OWNER gali matyti savo organizacijos užklausas';
COMMENT ON POLICY "org_review_requests_select_admin" ON public.org_review_requests IS 'Platform admin gali matyti visas užklausas';
COMMENT ON POLICY "org_review_requests_update_admin" ON public.org_review_requests IS 'Platform admin gali atnaujinti užklausas';
COMMENT ON POLICY "org_review_requests_insert_owner" ON public.org_review_requests IS 'OWNER gali sukurti užklausą (bet rekomenduojama naudoti RPC)';

