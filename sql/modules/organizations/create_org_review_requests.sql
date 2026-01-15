-- ==================================================
-- Organization Review Requests System
-- ==================================================
-- Lentelė admin užklausoms ir readiness view
-- ==================================================

-- 1. Ensure orgs.status column exists (if not, add it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN status TEXT DEFAULT 'DRAFT';
    
    -- Add CHECK constraint for valid statuses
    ALTER TABLE public.orgs
    ADD CONSTRAINT orgs_status_check 
    CHECK (status IN ('DRAFT', 'ONBOARDING', 'SUBMITTED_FOR_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'ACTIVE'));
    
    COMMENT ON COLUMN public.orgs.status IS 'Organization status: DRAFT, ONBOARDING, SUBMITTED_FOR_REVIEW, NEEDS_CHANGES, REJECTED, ACTIVE';
  END IF;
END $$;

-- 2. Add activated_at and activated_by columns to orgs (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN activated_at TIMESTAMPTZ NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'activated_by'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN activated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create org_review_requests table
CREATE TABLE IF NOT EXISTS public.org_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED')),
  note TEXT NULL,
  admin_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ NULL,
  decided_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Only one OPEN request per org at a time
  CONSTRAINT org_review_requests_one_open_per_org 
    UNIQUE (org_id) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_review_requests_org_id 
  ON public.org_review_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_org_review_requests_status 
  ON public.org_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_org_review_requests_requested_by 
  ON public.org_review_requests(requested_by);

COMMENT ON TABLE public.org_review_requests IS 'Branduolio admin užklausos organizacijų patvirtinimui';
COMMENT ON COLUMN public.org_review_requests.status IS 'OPEN, NEEDS_CHANGES, APPROVED, REJECTED';
COMMENT ON COLUMN public.org_review_requests.note IS 'Pirmininko pastaba pateikiant užklausą';
COMMENT ON COLUMN public.org_review_requests.admin_note IS 'Branduolio admin pastaba/grįžtamasis ryšys';

-- 4. Create helper function to check bylaws (since view can't dynamically check table existence)
CREATE OR REPLACE FUNCTION public.check_org_has_bylaws(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_has_bylaws BOOLEAN := false;
BEGIN
  -- Check if org_documents table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'org_documents'
  ) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.org_documents od
      WHERE od.org_id = p_org_id
        AND (
          (od.document_type = 'BYLAWS' AND od.status = 'UPLOADED')
          OR (od.document_type IS NULL AND od.status = 'UPLOADED')
        )
    ) INTO v_has_bylaws;
  -- Check if orgs has bylaws_path column
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'bylaws_path'
  ) THEN
    SELECT COALESCE(bylaws_path, '') != ''
    INTO v_has_bylaws
    FROM public.orgs
    WHERE id = p_org_id;
  ELSE
    -- If no bylaws mechanism exists, assume it's not required
    v_has_bylaws := true;
  END IF;
  
  RETURN v_has_bylaws;
END;
$$;

COMMENT ON FUNCTION public.check_org_has_bylaws IS 'Patikrina ar organizacija turi įstatų dokumentą';

-- 5. Create readiness view
-- This view checks if org is ready to submit for review
CREATE OR REPLACE VIEW public.org_onboarding_readiness AS
SELECT 
  o.id as org_id,
  
  -- Check required org fields
  (
    o.name IS NOT NULL 
    AND o.name != ''
    AND o.slug IS NOT NULL 
    AND o.slug != ''
    AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = o.id 
        AND m.role = 'OWNER'
        AND m.member_status = 'ACTIVE'
        AND EXISTS (
          SELECT 1 FROM auth.users u 
          WHERE u.id = m.user_id 
            AND u.email IS NOT NULL
        )
    )
  ) as has_required_org_fields,
  
  -- Check bylaws using helper function
  public.check_org_has_bylaws(o.id) as has_bylaws,
  
  -- Check governance required questions
  (
    NOT EXISTS (
      SELECT 1 
      FROM public.governance_questions q
      WHERE q.is_required = true 
        AND q.is_active = true
        AND NOT EXISTS (
          SELECT 1 
          FROM public.governance_configs gc
          WHERE gc.org_id = o.id
            AND gc.answers ? q.question_key
            AND gc.answers->>q.question_key IS NOT NULL
            AND gc.answers->>q.question_key != ''
        )
    )
  ) as has_governance_required,
  
  -- Overall readiness
  (
    (
      o.name IS NOT NULL 
      AND o.name != ''
      AND o.slug IS NOT NULL 
      AND o.slug != ''
      AND EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.org_id = o.id 
          AND m.role = 'OWNER'
          AND m.member_status = 'ACTIVE'
          AND EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = m.user_id 
              AND u.email IS NOT NULL
          )
      )
    )
    AND public.check_org_has_bylaws(o.id)
    AND (
      NOT EXISTS (
        SELECT 1 
        FROM public.governance_questions q
        WHERE q.is_required = true 
          AND q.is_active = true
          AND NOT EXISTS (
            SELECT 1 
            FROM public.governance_configs gc
            WHERE gc.org_id = o.id
              AND gc.answers ? q.question_key
              AND gc.answers->>q.question_key IS NOT NULL
              AND gc.answers->>q.question_key != ''
          )
      )
    )
  ) as ready_to_submit

FROM public.orgs o;

COMMENT ON VIEW public.org_onboarding_readiness IS 'Patikrina ar organizacija gali būti pateikta Branduolio admin patvirtinimui';

