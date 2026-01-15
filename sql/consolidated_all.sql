-- Consolidated SQL migration (auto-generated)
-- ===== BEGIN add_chairman_term_questions.sql =====
-- Add governance questions for chairman term management
-- Idempotent: uses INSERT ... ON CONFLICT DO UPDATE

DO $$
BEGIN
  -- Question: Chairman term start date
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options
  ) VALUES (
    'chairman_term_start_date',
    'Kada prasidėjo (arba prasidės) pirmininko kadencija?',
    'text',
    'Narystė ir rolės',
    50,
    false,
    true,
    NULL
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

  -- Question: Chairman term duration (in years)
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options
  ) VALUES (
    'chairman_term_duration_years',
    'Kiek metų trunka pirmininko kadencija pagal įstatus?',
    'number',
    'Narystė ir rolės',
    51,
    false,
    true,
    NULL
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

  -- Question: Council members elected with chairman
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options
  ) VALUES (
    'council_elected_with_chairman',
    'Ar tarybos nariai renkami kartu su pirmininku (ta pati kadencija)?',
    'checkbox',
    'Narystė ir rolės',
    52,
    false,
    true,
    NULL
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

END $$;
-- ===== END add_chairman_term_questions.sql =====

-- ===== BEGIN add_date_type_to_governance_questions.sql =====
-- ==================================================
-- Add 'date' type to governance_questions.question_type CHECK constraint
-- ==================================================

-- First, drop the existing constraint if it exists
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'governance_questions_question_type_check'
    AND conrelid = 'public.governance_questions'::regclass
  ) THEN
    ALTER TABLE public.governance_questions 
    DROP CONSTRAINT governance_questions_question_type_check;
  END IF;
END $$;

-- Add the new constraint with 'date' type included
ALTER TABLE public.governance_questions
ADD CONSTRAINT governance_questions_question_type_check
CHECK (question_type IN ('radio', 'checkbox', 'text', 'number', 'date'));
-- ===== END add_date_type_to_governance_questions.sql =====

-- ===== BEGIN add_governance_questions_ideas.sql =====
-- ==================================================
-- Add Governance Questions for Ideas/Projects Module
-- ==================================================
-- These questions configure voting duration and participation requirements

-- 1. idea_vote_duration_days
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_duration_days',
  'Kiek dienų trunka idėjos balsavimas?',
  'number',
  'ideas',
  1,
  false,
  true,
  '{"default": 7, "min": 1, "max": 30}'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    options = EXCLUDED.options,
    is_active = true;

-- 2. idea_vote_min_participation_percent
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_min_participation_percent',
  'Minimalus dalyvavimas idėjos balsavime (procentais nuo aktyvių narių)',
  'number',
  'ideas',
  2,
  false,
  true,
  '{"default": 50, "min": 0, "max": 100}'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    options = EXCLUDED.options,
    is_active = true;

-- Note: These will appear in the governance questionnaire
-- Users can configure them per organization via governance_configs.answers
-- ===== END add_governance_questions_ideas.sql =====

-- ===== BEGIN add_logo_to_orgs.sql =====
-- Add logo_url column to orgs table for organization logo/avatar
-- This allows each organization to have a custom logo or avatar image

-- Add logo_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orgs' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN logo_url TEXT;
    
    COMMENT ON COLUMN public.orgs.logo_url IS 'Organization logo or avatar image URL. Stored in Supabase Storage or external URL.';
  END IF;
END $$;
-- ===== END add_logo_to_orgs.sql =====

-- ===== BEGIN add_logo_url_to_orgs.sql =====
-- ==================================================
-- SQL Migracija: Pridėti logo_url stulpelį į orgs lentelę
-- ==================================================
-- 
-- Aprašymas:
-- Prideda logo_url stulpelį į orgs lentelę, kad organizacijos galėtų turėti
-- savo logotipą arba avatarą.
--
-- Naudojimas:
-- 1. Eikite į Supabase Dashboard → SQL Editor
-- 2. Nukopijuokite visą šį failo turinį
-- 3. Įklijuokite į SQL Editor
-- 4. Spauskite "Run" arba Ctrl+Enter
--
-- Pastaba:
-- Šis SQL kodas yra saugus - jis patikrina, ar stulpelis jau egzistuoja,
-- prieš bandydamas jį pridėti. Galite jį paleisti kelis kartus be klaidų.
--
-- ==================================================

-- Pridėti logo_url stulpelį, jei jis dar neegzistuoja
DO $$
BEGIN
  -- Patikrinti, ar stulpelis jau egzistuoja
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'logo_url'
  ) THEN
    -- Pridėti logo_url stulpelį
    ALTER TABLE public.orgs 
    ADD COLUMN logo_url TEXT;
    
    -- Pridėti komentarą
    COMMENT ON COLUMN public.orgs.logo_url IS 
      'Organization logo or avatar image URL. Stored in Supabase Storage or external URL.';
    
    -- Patvirtinimo pranešimas
    RAISE NOTICE 'logo_url stulpelis sėkmingai pridėtas į orgs lentelę';
  ELSE
    -- Jei stulpelis jau egzistuoja
    RAISE NOTICE 'logo_url stulpelis jau egzistuoja orgs lentelėje';
  END IF;
END $$;

-- Patikrinimas: Rodyti logo_url stulpelio informaciją
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orgs' 
  AND column_name = 'logo_url';

-- ==================================================
-- Migracija baigta
-- ==================================================
-- 
-- Jei matote rezultatą su logo_url stulpeliu, migracija sėkminga!
-- Dabar galite naudoti logo upload funkcionalumą.
--
-- ==================================================
-- ===== END add_logo_url_to_orgs.sql =====

-- ===== BEGIN add_org_details_to_community_applications.sql =====
-- ==================================================
-- SQL Migracija: Pridėti organizacijos detalių laukus į community_applications
-- ==================================================
-- 
-- Aprašymas:
-- Prideda laukus, kurie bus naudojami oficialiame bendruomenės puslapyje:
-- - registration_number: Registracijos numeris
-- - address: Adresas
-- - usage_purpose: Kur bus naudojama (oficialiame puslapyje)
--
-- Naudojimas:
-- 1. Eikite į Supabase Dashboard → SQL Editor
-- 2. Nukopijuokite visą šį failo turinį
-- 3. Įklijuokite į SQL Editor
-- 4. Spauskite "Run" arba Ctrl+Enter
--
-- ==================================================

-- Pridėti registration_number stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'community_applications' 
      AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE public.community_applications 
    ADD COLUMN registration_number TEXT;
    
    COMMENT ON COLUMN public.community_applications.registration_number IS 
      'Organizacijos registracijos numeris (pvz., juridinių asmenų registre)';
  END IF;
END $$;

-- Pridėti address stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'community_applications' 
      AND column_name = 'address'
  ) THEN
    ALTER TABLE public.community_applications 
    ADD COLUMN address TEXT;
    
    COMMENT ON COLUMN public.community_applications.address IS 
      'Organizacijos adresas (oficialus adresas)';
  END IF;
END $$;

-- Pridėti usage_purpose stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'community_applications' 
      AND column_name = 'usage_purpose'
  ) THEN
    ALTER TABLE public.community_applications 
    ADD COLUMN usage_purpose TEXT;
    
    COMMENT ON COLUMN public.community_applications.usage_purpose IS 
      'Kur bus naudojama platforma (oficialiame bendruomenės puslapyje)';
  END IF;
END $$;

-- Patikrinimas: Rodyti pridėtų stulpelių informaciją
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'community_applications' 
  AND column_name IN ('registration_number', 'address', 'usage_purpose')
ORDER BY column_name;

-- ==================================================
-- Migracija baigta
-- ==================================================
-- 
-- Jei matote rezultatus su visais trimis stulpeliais, migracija sėkminga!
-- Dabar galite naudoti šiuos laukus registracijos formoje.
--
-- ==================================================
-- ===== END add_org_details_to_community_applications.sql =====

-- ===== BEGIN add_org_details_to_orgs.sql =====
-- ==================================================
-- SQL Migracija: Pridėti organizacijos detalių laukus į orgs lentelę
-- ==================================================
-- 
-- Aprašymas:
-- Prideda laukus, kurie bus naudojami oficialiame bendruomenės puslapyje:
-- - registration_number: Registracijos numeris
-- - address: Adresas
-- - usage_purpose: Kur bus naudojama (oficialiame puslapyje)
--
-- Naudojimas:
-- 1. Eikite į Supabase Dashboard → SQL Editor
-- 2. Nukopijuokite visą šį failo turinį
-- 3. Įklijuokite į SQL Editor
-- 4. Spauskite "Run" arba Ctrl+Enter
--
-- ==================================================

-- Pridėti registration_number stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN registration_number TEXT;
    
    COMMENT ON COLUMN public.orgs.registration_number IS 
      'Organizacijos registracijos numeris (pvz., juridinių asmenų registre)';
  END IF;
END $$;

-- Pridėti address stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'address'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN address TEXT;
    
    COMMENT ON COLUMN public.orgs.address IS 
      'Organizacijos adresas (oficialus adresas)';
  END IF;
END $$;

-- Pridėti usage_purpose stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'usage_purpose'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN usage_purpose TEXT;
    
    COMMENT ON COLUMN public.orgs.usage_purpose IS 
      'Kur bus naudojama platforma (oficialiame bendruomenės puslapyje)';
  END IF;
END $$;

-- Patikrinimas: Rodyti pridėtų stulpelių informaciją
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orgs' 
  AND column_name IN ('registration_number', 'address', 'usage_purpose')
ORDER BY column_name;

-- ==================================================
-- Migracija baigta
-- ==================================================
-- 
-- Jei matote rezultatus su visais trimis stulpeliais, migracija sėkminga!
-- Dabar šie duomenys bus naudojami oficialiame bendruomenės puslapyje.
--
-- ==================================================
-- ===== END add_org_details_to_orgs.sql =====

-- ===== BEGIN add_pending_to_orgs_status.sql =====
-- Add PENDING status to orgs.status check constraint
-- This allows organizations to be created with PENDING status during registration

-- First, drop the existing constraint
ALTER TABLE public.orgs
DROP CONSTRAINT IF EXISTS orgs_status_check;

-- Re-add constraint with PENDING included
ALTER TABLE public.orgs
ADD CONSTRAINT orgs_status_check 
CHECK (status IN ('DRAFT', 'ONBOARDING', 'PENDING', 'SUBMITTED_FOR_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'ACTIVE'));

-- Update comment
COMMENT ON COLUMN public.orgs.status IS 'Organization status: DRAFT, ONBOARDING, PENDING, SUBMITTED_FOR_REVIEW, NEEDS_CHANGES, REJECTED, ACTIVE';
-- ===== END add_pending_to_orgs_status.sql =====

-- ===== BEGIN add_token_to_community_applications.sql =====
-- Add token and token_expires_at columns to community_applications table
-- Token is used for secure onboarding link access

ALTER TABLE public.community_applications
ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_community_applications_token 
ON public.community_applications(token) 
WHERE token IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.community_applications.token IS 'Unique token for onboarding link access';
COMMENT ON COLUMN public.community_applications.token_expires_at IS 'Token expiration timestamp (default: 7 days from creation)';
-- ===== END add_token_to_community_applications.sql =====

-- ===== BEGIN b4_finalize_voting_governance_core.sql =====
-- ==================================================
-- B4: Finalize Voting Governance Core (Resolutions)
-- Enforces strict status flow, immutability, adoption, visibility,
-- governance gate, and audit logging.
-- ==================================================

-- 1) Visibility constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resolutions_visibility_check'
      AND conrelid = 'public.resolutions'::regclass
  ) THEN
    ALTER TABLE public.resolutions
      ADD CONSTRAINT resolutions_visibility_check
      CHECK (visibility IN ('PUBLIC', 'MEMBERS', 'INTERNAL'));
  END IF;
END $$;

-- 2) Governance + status + immutability enforcement
CREATE OR REPLACE FUNCTION public.enforce_resolution_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_activation RECORD;
BEGIN
  -- Governance gate: org must be ACTIVE and have active ruleset
  SELECT *
  INTO v_activation
  FROM public.org_activation_state
  WHERE org_id = NEW.org_id
  LIMIT 1;

  IF NOT FOUND
     OR v_activation.org_status IS DISTINCT FROM 'ACTIVE'
     OR v_activation.has_active_ruleset IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'ORG_NOT_ACTIVE_OR_NO_RULESET';
  END IF;

  -- Visibility constraint (defense in depth)
  IF NEW.visibility NOT IN ('PUBLIC', 'MEMBERS', 'INTERNAL') THEN
    RAISE EXCEPTION 'INVALID_VISIBILITY';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- APPROVED requires adoption fields
    IF NEW.status = 'APPROVED' THEN
      IF NEW.adopted_at IS NULL OR NEW.adopted_by IS NULL THEN
        RAISE EXCEPTION 'APPROVED_REQUIRES_ADOPTION_FIELDS';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: enforce strict status flow
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'DRAFT' AND NEW.status = 'PROPOSED' THEN
      -- allowed
    ELSIF OLD.status = 'PROPOSED' AND NEW.status IN ('APPROVED', 'REJECTED') THEN
      -- allowed
      IF NEW.status = 'APPROVED' THEN
        NEW.adopted_at := now();
        NEW.adopted_by := auth.uid();
      END IF;
    ELSE
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
    END IF;
  END IF;

  -- Adoption guarantee (reject missing fields)
  IF NEW.status = 'APPROVED' THEN
    IF NEW.adopted_at IS NULL OR NEW.adopted_by IS NULL THEN
      RAISE EXCEPTION 'APPROVED_REQUIRES_ADOPTION_FIELDS';
    END IF;
  END IF;

  -- Immutability: block updates on APPROVED rows
  IF OLD.status = 'APPROVED' THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.visibility IS DISTINCT FROM OLD.visibility
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.adopted_at IS DISTINCT FROM OLD.adopted_at
       OR NEW.adopted_by IS DISTINCT FROM OLD.adopted_by THEN
      RAISE EXCEPTION 'APPROVED_RESOLUTION_IMMUTABLE';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_resolution_rules ON public.resolutions;
CREATE TRIGGER trg_enforce_resolution_rules
BEFORE INSERT OR UPDATE ON public.resolutions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_resolution_rules();

-- 3) Audit logging for inserts and status changes
CREATE OR REPLACE FUNCTION public.audit_resolution_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      org_id,
      user_id,
      action,
      target_table,
      target_id,
      old_value,
      new_value
    ) VALUES (
      NEW.org_id,
      auth.uid(),
      'RESOLUTION_CREATED',
      'resolutions',
      NEW.id,
      NULL,
      jsonb_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'status', NEW.status,
        'visibility', NEW.visibility
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (
      org_id,
      user_id,
      action,
      target_table,
      target_id,
      old_value,
      new_value
    ) VALUES (
      NEW.org_id,
      auth.uid(),
      'RESOLUTION_STATUS_CHANGED',
      'resolutions',
      NEW.id,
      jsonb_build_object(
        'status', OLD.status,
        'adopted_at', OLD.adopted_at,
        'adopted_by', OLD.adopted_by
      ),
      jsonb_build_object(
        'status', NEW.status,
        'adopted_at', NEW.adopted_at,
        'adopted_by', NEW.adopted_by
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Soft-fail: do not block main operation
  RAISE NOTICE 'AUDIT_LOG_FAILED: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_resolution_changes ON public.resolutions;
CREATE TRIGGER trg_audit_resolution_changes
AFTER INSERT OR UPDATE ON public.resolutions
FOR EACH ROW
EXECUTE FUNCTION public.audit_resolution_changes();

-- ==================================================
-- Manual test flow (run in SQL editor):
-- 1) INSERT DRAFT
-- 2) UPDATE -> PROPOSED
-- 3) UPDATE -> APPROVED (should set adopted_at/by)
-- 4) ATTEMPT UPDATE (must fail)
-- ==================================================
-- ===== END b4_finalize_voting_governance_core.sql =====

-- ===== BEGIN create_community_applications_table.sql =====
-- Create Community Applications Table
-- Stores registration requests from /register-community page

CREATE TABLE IF NOT EXISTS public.community_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  CONSTRAINT community_applications_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_applications_status ON public.community_applications(status);
CREATE INDEX IF NOT EXISTS idx_community_applications_created_at ON public.community_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_applications_email ON public.community_applications(email);

-- RLS Policies
ALTER TABLE public.community_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can view all applications
DROP POLICY IF EXISTS "community_applications_select_admin" ON public.community_applications;
CREATE POLICY "community_applications_select_admin" ON public.community_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = auth.uid()
        AND m.role = 'OWNER'
        AND m.member_status = 'ACTIVE'
        AND o.slug IN ('branduolys', 'platform')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND email = 'admin@pastas.email'
    )
  );

-- Policy: Platform admins can update applications
DROP POLICY IF EXISTS "community_applications_update_admin" ON public.community_applications;
CREATE POLICY "community_applications_update_admin" ON public.community_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = auth.uid()
        AND m.role = 'OWNER'
        AND m.member_status = 'ACTIVE'
        AND o.slug IN ('branduolys', 'platform')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND email = 'admin@pastas.email'
    )
  );

-- Policy: Anyone can insert (for registration form)
DROP POLICY IF EXISTS "community_applications_insert_anon" ON public.community_applications;
CREATE POLICY "community_applications_insert_anon" ON public.community_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.community_applications IS 'Community registration requests from public registration form';
COMMENT ON COLUMN public.community_applications.status IS 'PENDING, APPROVED, REJECTED, IN_PROGRESS';
COMMENT ON COLUMN public.community_applications.reviewed_by IS 'User ID of admin who reviewed the application';
COMMENT ON COLUMN public.community_applications.admin_notes IS 'Internal notes for admin review';
-- ===== END create_community_applications_table.sql =====

-- ===== BEGIN create_governance_compliance.sql =====
-- ==================================================
-- Governance Compliance System
-- ==================================================
-- Schema versioning ir compliance tracking
-- ==================================================

-- 1. Governance Schema Versions table
CREATE TABLE IF NOT EXISTS public.governance_schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_no INTEGER NOT NULL UNIQUE,
  change_summary TEXT NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_governance_schema_versions_active 
  ON public.governance_schema_versions(is_active, version_no DESC);

COMMENT ON TABLE public.governance_schema_versions IS 'Global governance schema versijos';
COMMENT ON COLUMN public.governance_schema_versions.version_no IS 'Schema versijos numeris (1, 2, 3...)';
COMMENT ON COLUMN public.governance_schema_versions.is_active IS 'Ar ši schema versija yra aktyvi';

-- Initialize with version 1 if no versions exist
INSERT INTO public.governance_schema_versions (version_no, change_summary, is_active)
SELECT 1, 'Initial schema version', true
WHERE NOT EXISTS (SELECT 1 FROM public.governance_schema_versions WHERE version_no = 1);

-- 2. Add compliance columns to governance_configs (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'governance_configs' 
      AND column_name = 'schema_version_no'
  ) THEN
    ALTER TABLE public.governance_configs 
    ADD COLUMN schema_version_no INTEGER NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'governance_configs' 
      AND column_name = 'last_validated_at'
  ) THEN
    ALTER TABLE public.governance_configs 
    ADD COLUMN last_validated_at TIMESTAMPTZ NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'governance_configs' 
      AND column_name = 'compliance_status'
  ) THEN
    ALTER TABLE public.governance_configs 
    ADD COLUMN compliance_status TEXT NOT NULL DEFAULT 'UNKNOWN'
      CHECK (compliance_status IN ('OK', 'NEEDS_UPDATE', 'INVALID', 'UNKNOWN'));
  END IF;
END $$;

COMMENT ON COLUMN public.governance_configs.schema_version_no IS 'Kuri schema versija užpildyta';
COMMENT ON COLUMN public.governance_configs.last_validated_at IS 'Paskutinio validavimo data';
COMMENT ON COLUMN public.governance_configs.compliance_status IS 'Compliance būsena: OK, NEEDS_UPDATE, INVALID, UNKNOWN';

-- 3. Governance Compliance Issues table
CREATE TABLE IF NOT EXISTS public.governance_compliance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  schema_version_no INTEGER NOT NULL,
  issue_code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error')),
  question_key TEXT NULL,
  message TEXT NOT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_governance_compliance_issues_org_version 
  ON public.governance_compliance_issues(org_id, schema_version_no);
CREATE INDEX IF NOT EXISTS idx_governance_compliance_issues_org_severity 
  ON public.governance_compliance_issues(org_id, severity);
CREATE INDEX IF NOT EXISTS idx_governance_compliance_issues_unresolved 
  ON public.governance_compliance_issues(org_id, resolved_at) 
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.governance_compliance_issues IS 'Organizacijų compliance problemos';
COMMENT ON COLUMN public.governance_compliance_issues.issue_code IS 'Problemos kodas: MISSING_REQUIRED, INVALID_TYPE, INACTIVE_ANSWERED, OUT_OF_RANGE';
COMMENT ON COLUMN public.governance_compliance_issues.severity IS 'Severity: warning arba error';

-- 4. Helper function to get current active schema version
CREATE OR REPLACE FUNCTION public.get_active_schema_version()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_version INTEGER;
BEGIN
  SELECT version_no INTO v_version
  FROM public.governance_schema_versions
  WHERE is_active = true
  ORDER BY version_no DESC
  LIMIT 1;
  
  RETURN COALESCE(v_version, 1);
END;
$$;

COMMENT ON FUNCTION public.get_active_schema_version IS 'Grąžina aktyvią schema versiją';

-- 5. Function to create new schema version (for admin)
CREATE OR REPLACE FUNCTION public.create_schema_version(
  p_change_summary TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  version_no INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_version INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_created_by, auth.uid());
  
  -- Get current max version
  SELECT COALESCE(MAX(version_no), 0) + 1 INTO v_new_version
  FROM public.governance_schema_versions;
  
  -- Deactivate old versions
  UPDATE public.governance_schema_versions
  SET is_active = false
  WHERE is_active = true;
  
  -- Create new version
  INSERT INTO public.governance_schema_versions (
    version_no,
    change_summary,
    created_by,
    is_active
  ) VALUES (
    v_new_version,
    p_change_summary,
    v_user_id,
    true
  );
  
  -- Mark all orgs as NEEDS_UPDATE (except those already INVALID)
  -- INVALID orgs stay INVALID, but OK/UNKNOWN/NEEDS_UPDATE become NEEDS_UPDATE
  UPDATE public.governance_configs
  SET compliance_status = 'NEEDS_UPDATE'
  WHERE compliance_status IN ('OK', 'UNKNOWN', 'NEEDS_UPDATE');
  
  RETURN QUERY SELECT true, v_new_version, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.create_schema_version IS 'Sukuria naują schema versiją (tik admin)';
-- ===== END create_governance_compliance.sql =====

-- ===== BEGIN create_governance_validation_rpc.sql =====
-- ==================================================
-- Governance Validation RPC Functions
-- ==================================================
-- Validuoja organizacijų compliance su schema
-- ==================================================

-- Main validation function
CREATE OR REPLACE FUNCTION public.validate_governance_for_org(
  p_org_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  status TEXT,
  schema_version_no INTEGER,
  missing_required TEXT[],
  invalid_types JSONB,
  inactive_answered TEXT[],
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_version INTEGER;
  v_org_version INTEGER;
  v_answers JSONB;
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_invalid JSONB := '[]'::JSONB;
  v_inactive TEXT[] := ARRAY[]::TEXT[];
  v_status TEXT := 'OK';
  v_question RECORD;
  v_answer_value TEXT;
  v_answer_json JSONB;
  v_option_values TEXT[];
  v_details JSONB;
BEGIN
  -- Get active schema version
  v_schema_version := public.get_active_schema_version();
  
  -- Get org's config
  SELECT 
    gc.schema_version_no,
    gc.answers
  INTO 
    v_org_version,
    v_answers
  FROM public.governance_configs gc
  WHERE gc.org_id = p_org_id;
  
  -- If no config exists, all required questions are missing
  IF v_answers IS NULL THEN
    SELECT array_agg(question_key) INTO v_missing
    FROM public.governance_questions
    WHERE is_required = true 
      AND is_active = true;
    
    RETURN QUERY SELECT 
      false AS ok,
      'INVALID'::TEXT AS status,
      v_schema_version::INTEGER AS schema_version_no,
      v_missing AS missing_required,
      '[]'::JSONB AS invalid_types,
      ARRAY[]::TEXT[] AS inactive_answered,
      jsonb_build_object('reason', 'NO_CONFIG') AS details;
    RETURN;
  END IF;
  
  -- Check each active required question
  FOR v_question IN 
    SELECT * FROM public.governance_questions
    WHERE is_active = true
    ORDER BY question_key
  LOOP
    -- Check if answer exists
    IF NOT (v_answers ? v_question.question_key) THEN
      IF v_question.is_required THEN
        v_missing := array_append(v_missing, v_question.question_key);
      END IF;
      CONTINUE;
    END IF;
    
    -- Get answer value
    v_answer_value := v_answers->>v_question.question_key;
    
    -- For required questions, check if value is null, empty string, or empty after trim
    IF v_question.is_required THEN
      IF v_answer_value IS NULL OR v_answer_value = '' OR trim(v_answer_value) = '' THEN
        v_missing := array_append(v_missing, v_question.question_key);
        CONTINUE;
      END IF;
    ELSE
      -- Skip null/empty values for non-required
      IF (v_answer_value IS NULL OR v_answer_value = '' OR trim(v_answer_value) = '') THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Validate type
    BEGIN
      v_answer_json := v_answers->v_question.question_key;
    EXCEPTION
      WHEN OTHERS THEN
        v_answer_json := to_jsonb(v_answer_value);
    END;
    
    -- Type validation based on question_type
    CASE v_question.question_type
      WHEN 'checkbox' THEN
        -- Must be boolean
        IF jsonb_typeof(v_answer_json) != 'boolean' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'boolean',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        END IF;
        
      WHEN 'number' THEN
        -- Must be number (or string that can be converted to number)
        IF jsonb_typeof(v_answer_json) = 'number' THEN
          -- Valid number type
          NULL;
        ELSIF jsonb_typeof(v_answer_json) = 'string' THEN
          -- Try to parse as number
          BEGIN
            -- Check if string is a valid number
            IF v_answer_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
              -- Valid number string - this is acceptable
              NULL;
            ELSE
              -- Invalid number string
              v_invalid := v_invalid || jsonb_build_object(
                'question_key', v_question.question_key,
                'expected', 'number',
                'actual_type', 'string (not a number)',
                'value', v_answer_value
              );
            END IF;
          EXCEPTION
            WHEN OTHERS THEN
              v_invalid := v_invalid || jsonb_build_object(
                'question_key', v_question.question_key,
                'expected', 'number',
                'actual_type', 'string (invalid)',
                'value', v_answer_value
              );
          END;
        ELSE
          -- Invalid type
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'number',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        END IF;
        
      WHEN 'radio' THEN
        -- Must be string and value must be in options
        IF jsonb_typeof(v_answer_json) != 'string' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'string',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        ELSE
          -- Check if value is in options
          IF v_question.options IS NOT NULL THEN
            SELECT array_agg((option->>'value')) INTO v_option_values
            FROM jsonb_array_elements(v_question.options) AS option;
            
            IF NOT (v_answer_value = ANY(v_option_values)) THEN
              v_invalid := v_invalid || jsonb_build_object(
                'question_key', v_question.question_key,
                'expected', 'one of: ' || array_to_string(v_option_values, ', '),
                'actual_type', 'string',
                'value', v_answer_value
              );
            END IF;
          END IF;
        END IF;
        
      WHEN 'text' THEN
        -- Must be string
        IF jsonb_typeof(v_answer_json) != 'string' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'string',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        END IF;
        
      ELSE
        -- Unknown type - warning
        NULL;
    END CASE;
  END LOOP;
  
  -- Check for inactive questions that are answered
  SELECT array_agg(question_key) INTO v_inactive
  FROM (
    SELECT key AS question_key
    FROM jsonb_each_text(v_answers)
  ) AS answered_keys
  WHERE NOT EXISTS (
    SELECT 1 FROM public.governance_questions q
    WHERE q.question_key = answered_keys.question_key
      AND q.is_active = true
  );
  
  -- Determine status
  -- Priority: INVALID > NEEDS_UPDATE > OK
  IF array_length(v_missing, 1) > 0 OR jsonb_array_length(v_invalid) > 0 THEN
    v_status := 'INVALID';
  ELSIF v_org_version IS NULL OR v_org_version < v_schema_version THEN
    -- Version mismatch - organization needs to update to new schema
    -- Even if all required are answered, they need to review new questions
    v_status := 'NEEDS_UPDATE';
  ELSIF array_length(v_inactive, 1) > 0 THEN
    -- Inactive answered questions are warnings, not errors
    -- If no missing/invalid and version matches, inactive answered alone is OK
    v_status := 'OK';
  ELSE
    v_status := 'OK';
  END IF;
  
  -- Build details
  v_details := jsonb_build_object(
    'org_version', v_org_version,
    'schema_version', v_schema_version,
    'version_mismatch', (v_org_version IS NULL OR v_org_version < v_schema_version)
  );
  
  RETURN QUERY SELECT 
    (v_status = 'OK') AS ok,
    v_status::TEXT AS status,
    v_schema_version::INTEGER AS schema_version_no,
    COALESCE(v_missing, ARRAY[]::TEXT[]) AS missing_required,
    COALESCE(v_invalid, '[]'::JSONB) AS invalid_types,
    COALESCE(v_inactive, ARRAY[]::TEXT[]) AS inactive_answered,
    v_details::JSONB AS details;
END;
$$;

COMMENT ON FUNCTION public.validate_governance_for_org IS 'Validuoja organizacijos compliance su schema';

-- Function to set compliance status after update
CREATE OR REPLACE FUNCTION public.set_governance_schema_version_for_org(
  p_org_id UUID,
  p_schema_version_no INTEGER
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Update config
  UPDATE public.governance_configs
  SET 
    schema_version_no = p_schema_version_no,
    last_validated_at = now(),
    compliance_status = 'OK'
  WHERE org_id = p_org_id;
  
  -- Resolve compliance issues for this version
  UPDATE public.governance_compliance_issues
  SET resolved_at = now()
  WHERE org_id = p_org_id
    AND schema_version_no = p_schema_version_no
    AND resolved_at IS NULL;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.set_governance_schema_version_for_org IS 'Pažymi organizaciją kaip compliant su schema versija';

-- Function to upsert compliance issues
CREATE OR REPLACE FUNCTION public.upsert_compliance_issues(
  p_org_id UUID,
  p_schema_version_no INTEGER,
  p_missing_required TEXT[],
  p_invalid_types JSONB,
  p_inactive_answered TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issue_code TEXT;
  v_severity TEXT;
  v_message TEXT;
  v_question_key TEXT;
  v_invalid_item JSONB;
BEGIN
  -- Resolve all existing issues for this org and version
  UPDATE public.governance_compliance_issues
  SET resolved_at = now()
  WHERE org_id = p_org_id
    AND schema_version_no = p_schema_version_no
    AND resolved_at IS NULL;
  
  -- Insert missing required issues
  IF array_length(p_missing_required, 1) > 0 THEN
    FOREACH v_question_key IN ARRAY p_missing_required
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id,
        schema_version_no,
        issue_code,
        severity,
        question_key,
        message
      ) VALUES (
        p_org_id,
        p_schema_version_no,
        'MISSING_REQUIRED',
        'error',
        v_question_key,
        'Trūksta privalomo atsakymo: ' || v_question_key
      );
    END LOOP;
  END IF;
  
  -- Insert invalid type issues
  IF jsonb_array_length(p_invalid_types) > 0 THEN
    FOR v_invalid_item IN SELECT * FROM jsonb_array_elements(p_invalid_types)
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id,
        schema_version_no,
        issue_code,
        severity,
        question_key,
        message,
        details
      ) VALUES (
        p_org_id,
        p_schema_version_no,
        'INVALID_TYPE',
        'error',
        v_invalid_item->>'question_key',
        'Netinkamas tipas: ' || (v_invalid_item->>'question_key') || 
        ' (tikėtasi: ' || (v_invalid_item->>'expected') || 
        ', gauta: ' || (v_invalid_item->>'actual_type') || ')',
        v_invalid_item
      );
    END LOOP;
  END IF;
  
  -- Insert inactive answered issues (warnings)
  IF array_length(p_inactive_answered, 1) > 0 THEN
    FOREACH v_question_key IN ARRAY p_inactive_answered
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id,
        schema_version_no,
        issue_code,
        severity,
        question_key,
        message
      ) VALUES (
        p_org_id,
        p_schema_version_no,
        'INACTIVE_ANSWERED',
        'warning',
        v_question_key,
        'Atsakyta į neaktyvų klausimą: ' || v_question_key
      );
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.upsert_compliance_issues IS 'Upsert compliance issues į lentelę';
-- ===== END create_governance_validation_rpc.sql =====

-- ===== BEGIN create_ideas_projects_module.sql =====
-- ==================================================
-- IDEAS → VOTING → PROJECTS → SUPPORT Module
-- Database Schema
-- ==================================================

-- ENUMs (using TEXT with CHECK constraints for flexibility)
-- Note: PostgreSQL ENUMs are also valid, but TEXT+CHECK allows easier migration

-- 1. Ideas table
CREATE TABLE IF NOT EXISTS public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  title text NOT NULL,
  summary text NULL,
  details text NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'PASSED', 'FAILED', 'NOT_COMPLETED', 'ARCHIVED')),
  public_visible boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz NULL,
  closed_at timestamptz NULL,
  passed_at timestamptz NULL
);

-- Create indexes only if they don't exist and table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ideas') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_org') THEN
      CREATE INDEX idx_ideas_org ON public.ideas(org_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_status') THEN
      CREATE INDEX idx_ideas_status ON public.ideas(org_id, status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_public') THEN
      CREATE INDEX idx_ideas_public ON public.ideas(public_visible, status) WHERE public_visible = true;
    END IF;
  END IF;
END $$;

-- 2. Idea attachments
CREATE TABLE IF NOT EXISTS public.idea_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  bucket text NOT NULL DEFAULT 'idea-documents',
  path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NULL,
  size_bytes bigint NULL,
  uploaded_by uuid NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_attachments') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_attachments_idea') THEN
      CREATE INDEX idx_idea_attachments_idea ON public.idea_attachments(idea_id);
    END IF;
  END IF;
END $$;

-- 3. Idea votes (one vote per idea)
CREATE TABLE IF NOT EXISTS public.idea_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL UNIQUE REFERENCES public.ideas(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opens_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz NOT NULL,
  duration_days int NOT NULL DEFAULT 7,
  closed_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_votes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_votes_org') THEN
      CREATE INDEX idx_idea_votes_org ON public.idea_votes(org_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_votes_status') THEN
      CREATE INDEX idx_idea_votes_status ON public.idea_votes(status, closes_at);
    END IF;
  END IF;
END $$;

-- 4. Idea ballots (one ballot per membership per vote)
CREATE TABLE IF NOT EXISTS public.idea_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_vote_id uuid NOT NULL REFERENCES public.idea_votes(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('FOR', 'AGAINST')),
  cast_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(idea_vote_id, membership_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_ballots') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_ballots_vote') THEN
      CREATE INDEX idx_idea_ballots_vote ON public.idea_ballots(idea_vote_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_ballots_membership') THEN
      CREATE INDEX idx_idea_ballots_membership ON public.idea_ballots(membership_id);
    END IF;
  END IF;
END $$;

-- 5. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  idea_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'FUNDING' CHECK (status IN ('PLANNING', 'FUNDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  budget_eur numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  funding_opened_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

-- Add missing columns if table exists but is missing them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    -- Add idea_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'idea_id') THEN
      ALTER TABLE public.projects ADD COLUMN idea_id uuid NULL;
    END IF;
    -- Add budget_eur if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'budget_eur') THEN
      ALTER TABLE public.projects ADD COLUMN budget_eur numeric(12,2) NOT NULL DEFAULT 0;
    END IF;
    -- Add other columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'title') THEN
      ALTER TABLE public.projects ADD COLUMN title text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'description') THEN
      ALTER TABLE public.projects ADD COLUMN description text NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'status') THEN
      ALTER TABLE public.projects ADD COLUMN status text NOT NULL DEFAULT 'FUNDING' CHECK (status IN ('PLANNING', 'FUNDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_by') THEN
      ALTER TABLE public.projects ADD COLUMN created_by uuid NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_at') THEN
      ALTER TABLE public.projects ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'funding_opened_at') THEN
      ALTER TABLE public.projects ADD COLUMN funding_opened_at timestamptz NOT NULL DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'completed_at') THEN
      ALTER TABLE public.projects ADD COLUMN completed_at timestamptz NULL;
    END IF;
  END IF;
END $$;

-- Add foreign key constraint if ideas table exists and constraint doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ideas') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
        AND table_name = 'projects' 
        AND constraint_name LIKE '%idea_id%'
    ) THEN
      ALTER TABLE public.projects 
      ADD CONSTRAINT projects_idea_id_fkey 
      FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    -- Check if idea_id column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'idea_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_idea') THEN
        CREATE INDEX idx_projects_idea ON public.projects(idea_id);
      END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_org') THEN
      CREATE INDEX idx_projects_org ON public.projects(org_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_status') THEN
      CREATE INDEX idx_projects_status ON public.projects(org_id, status);
    END IF;
  END IF;
END $$;

-- 6. Project contributions
CREATE TABLE IF NOT EXISTS public.project_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('MONEY', 'IN_KIND', 'WORK')),
  status text NOT NULL DEFAULT 'PLEDGED' CHECK (status IN ('PLEDGED', 'RECEIVED', 'CANCELLED')),
  money_amount_eur numeric(12,2) NULL,
  in_kind_items jsonb NULL,
  work_offer jsonb NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'MONEY' AND money_amount_eur IS NOT NULL AND money_amount_eur > 0) OR
    (kind = 'IN_KIND' AND in_kind_items IS NOT NULL) OR
    (kind = 'WORK' AND work_offer IS NOT NULL)
  )
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_contributions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_contributions_project') THEN
      CREATE INDEX idx_project_contributions_project ON public.project_contributions(project_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_contributions_org_kind_status') THEN
      CREATE INDEX idx_project_contributions_org_kind_status ON public.project_contributions(org_id, kind, status);
    END IF;
  END IF;
END $$;

-- 7. View: Idea vote tally (only create if required tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ideas')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_votes')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_ballots') THEN
    EXECUTE $sql$
CREATE OR REPLACE VIEW public.idea_vote_tally AS
SELECT 
  iv.idea_id,
  iv.id as vote_id,
  iv.org_id,
  iv.status as vote_status,
  iv.closes_at,
  COUNT(CASE WHEN ib.choice = 'FOR' THEN 1 END)::int as votes_for,
  COUNT(CASE WHEN ib.choice = 'AGAINST' THEN 1 END)::int as votes_against,
  COUNT(ib.id)::int as votes_total,
  (SELECT COUNT(*)::int FROM public.memberships WHERE org_id = iv.org_id AND status = 'ACTIVE') as total_active_members,
  CASE 
    WHEN iv.status = 'OPEN' AND now() < iv.closes_at THEN 'OPEN'
    WHEN iv.status = 'CLOSED' OR now() >= iv.closes_at THEN 'CLOSED'
    ELSE 'OPEN'
  END as effective_status
FROM public.idea_votes iv
LEFT JOIN public.idea_ballots ib ON iv.id = ib.idea_vote_id
GROUP BY iv.id, iv.idea_id, iv.org_id, iv.status, iv.closes_at
$sql$;
  END IF;
END $$;

-- 8. View: Project funding totals (only create if projects table exists with required columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'budget_eur') THEN
      EXECUTE $sql$
CREATE OR REPLACE VIEW public.project_funding_totals AS
SELECT 
  p.id as project_id,
  p.org_id,
  p.budget_eur as goal_budget_eur,
  COALESCE(SUM(CASE WHEN pc.kind = 'MONEY' AND pc.status = 'PLEDGED' THEN pc.money_amount_eur ELSE 0 END), 0)::numeric(12,2) as pledged_money_eur,
  COALESCE(SUM(CASE WHEN pc.kind = 'MONEY' AND pc.status = 'RECEIVED' THEN pc.money_amount_eur ELSE 0 END), 0)::numeric(12,2) as received_money_eur,
  COUNT(CASE WHEN pc.kind = 'IN_KIND' AND pc.status = 'PLEDGED' THEN 1 END)::int as pledged_in_kind_count,
  COALESCE(SUM(
    CASE 
      WHEN pc.kind = 'WORK' AND pc.status = 'PLEDGED' AND pc.work_offer->>'hours' IS NOT NULL 
      THEN (pc.work_offer->>'hours')::numeric
      ELSE 0
    END
  ), 0)::numeric(12,2) as pledged_work_hours,
  CASE 
    WHEN p.budget_eur > 0 THEN 
      (COALESCE(SUM(CASE WHEN pc.kind = 'MONEY' AND pc.status = 'RECEIVED' THEN pc.money_amount_eur ELSE 0 END), 0) / p.budget_eur * 100)::numeric(5,2)
    ELSE 0
  END as progress_ratio
FROM public.projects p
LEFT JOIN public.project_contributions pc ON p.id = pc.project_id
GROUP BY p.id, p.org_id, p.budget_eur
$sql$;
    END IF;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.ideas IS 'Community ideas that can be voted on and turned into projects';
COMMENT ON TABLE public.idea_votes IS 'Voting sessions for ideas (one vote per idea)';
COMMENT ON TABLE public.idea_ballots IS 'Individual votes cast by members';
COMMENT ON TABLE public.projects IS 'Projects created from passed ideas';
COMMENT ON TABLE public.project_contributions IS 'Member contributions (money, in-kind, work) to projects';
COMMENT ON VIEW public.idea_vote_tally IS 'Aggregated vote counts and participation metrics';
COMMENT ON VIEW public.project_funding_totals IS 'Funding progress and totals for projects';
-- ===== END create_ideas_projects_module.sql =====

-- ===== BEGIN create_ideas_projects_rls.sql =====
-- ==================================================
-- IDEAS → VOTING → PROJECTS → SUPPORT Module
-- Row Level Security Policies
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contributions ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- IDEAS POLICIES
-- ==================================================

-- Members can SELECT ideas from their org
DROP POLICY IF EXISTS ideas_select_member ON public.ideas;
CREATE POLICY ideas_select_member ON public.ideas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = ideas.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- OWNER/BOARD can INSERT ideas
DROP POLICY IF EXISTS ideas_insert_owner_board ON public.ideas;
CREATE POLICY ideas_insert_owner_board ON public.ideas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = ideas.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- OWNER/BOARD can UPDATE ideas
DROP POLICY IF EXISTS ideas_update_owner_board ON public.ideas;
CREATE POLICY ideas_update_owner_board ON public.ideas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = ideas.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- IDEA_ATTACHMENTS POLICIES
-- ==================================================

-- Members can SELECT attachments for ideas in their org
DROP POLICY IF EXISTS idea_attachments_select_member ON public.idea_attachments;
CREATE POLICY idea_attachments_select_member ON public.idea_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      JOIN public.memberships m ON m.org_id = i.org_id
      WHERE i.id = idea_attachments.idea_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- OWNER/BOARD can INSERT attachments
DROP POLICY IF EXISTS idea_attachments_insert_owner_board ON public.idea_attachments;
CREATE POLICY idea_attachments_insert_owner_board ON public.idea_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ideas i
      JOIN public.memberships m ON m.org_id = i.org_id
      WHERE i.id = idea_attachments.idea_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- IDEA_VOTES POLICIES
-- ==================================================

-- Members can SELECT votes from their org
DROP POLICY IF EXISTS idea_votes_select_member ON public.idea_votes;
CREATE POLICY idea_votes_select_member ON public.idea_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = idea_votes.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- OWNER/BOARD can INSERT/UPDATE votes (via RPC)
DROP POLICY IF EXISTS idea_votes_insert_owner_board ON public.idea_votes;
CREATE POLICY idea_votes_insert_owner_board ON public.idea_votes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = idea_votes.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

DROP POLICY IF EXISTS idea_votes_update_owner_board ON public.idea_votes;
CREATE POLICY idea_votes_update_owner_board ON public.idea_votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = idea_votes.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- IDEA_BALLOTS POLICIES
-- ==================================================

-- Members can SELECT ballots from their org
DROP POLICY IF EXISTS idea_ballots_select_member ON public.idea_ballots;
CREATE POLICY idea_ballots_select_member ON public.idea_ballots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.idea_votes iv
      JOIN public.memberships m ON m.org_id = iv.org_id
      WHERE iv.id = idea_ballots.idea_vote_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can INSERT their own ballot (via RPC with validation)
DROP POLICY IF EXISTS idea_ballots_insert_member ON public.idea_ballots;
CREATE POLICY idea_ballots_insert_member ON public.idea_ballots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.idea_votes iv ON iv.org_id = m.org_id
      WHERE m.id = idea_ballots.membership_id
        AND iv.id = idea_ballots.idea_vote_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can UPDATE their own ballot (change vote)
DROP POLICY IF EXISTS idea_ballots_update_member ON public.idea_ballots;
CREATE POLICY idea_ballots_update_member ON public.idea_ballots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = idea_ballots.membership_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- ==================================================
-- PROJECTS POLICIES
-- ==================================================

-- Members can SELECT projects from their org
DROP POLICY IF EXISTS projects_select_member ON public.projects;
CREATE POLICY projects_select_member ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = projects.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- OWNER/BOARD can INSERT/UPDATE projects
DROP POLICY IF EXISTS projects_insert_owner_board ON public.projects;
CREATE POLICY projects_insert_owner_board ON public.projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = projects.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

DROP POLICY IF EXISTS projects_update_owner_board ON public.projects;
CREATE POLICY projects_update_owner_board ON public.projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = projects.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- PROJECT_CONTRIBUTIONS POLICIES
-- ==================================================

-- Members can SELECT contributions from their org
DROP POLICY IF EXISTS project_contributions_select_member ON public.project_contributions;
CREATE POLICY project_contributions_select_member ON public.project_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = project_contributions.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can INSERT their own contributions
DROP POLICY IF EXISTS project_contributions_insert_member ON public.project_contributions;
CREATE POLICY project_contributions_insert_member ON public.project_contributions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = project_contributions.membership_id
        AND m.org_id = project_contributions.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can UPDATE their own contributions (before RECEIVED)
DROP POLICY IF EXISTS project_contributions_update_member ON public.project_contributions;
CREATE POLICY project_contributions_update_member ON public.project_contributions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = project_contributions.membership_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
    AND project_contributions.status = 'PLEDGED'
  );

-- OWNER/BOARD can UPDATE contribution status (mark as RECEIVED/CANCELLED)
DROP POLICY IF EXISTS project_contributions_update_status_owner_board ON public.project_contributions;
CREATE POLICY project_contributions_update_status_owner_board ON public.project_contributions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = project_contributions.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );
-- ===== END create_ideas_projects_rls.sql =====

-- ===== BEGIN create_ideas_projects_rpc.sql =====
-- ==================================================
-- IDEAS → VOTING → PROJECTS → SUPPORT Module
-- RPC Functions (Core Business Logic)
-- ==================================================

-- Helper: Get governance config integer value
-- Note: This function already exists from meeting_agenda module with signature:
-- get_governance_int(p_org_id uuid, p_key text, p_default_int int)
-- We'll use the existing function, so no need to recreate it here.
-- If you need to update the function signature, drop it first:
-- DROP FUNCTION IF EXISTS public.get_governance_int(uuid, text, integer);
-- Then recreate with new signature.

-- 1. Create Idea
CREATE OR REPLACE FUNCTION public.create_idea(
  p_org_id uuid,
  p_title text,
  p_summary text,
  p_details text,
  p_public_visible boolean DEFAULT true
) RETURNS TABLE(ok boolean, reason text, idea_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_membership_id uuid;
  v_idea_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Check ACTIVE membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = p_org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert idea
  INSERT INTO public.ideas (org_id, title, summary, details, public_visible, created_by)
  VALUES (p_org_id, p_title, p_summary, p_details, p_public_visible, v_user_id)
  RETURNING id INTO v_idea_id;

  RETURN QUERY SELECT true, 'OK'::text, v_idea_id;
END;
$$;

-- 2. Open Idea for Voting
CREATE OR REPLACE FUNCTION public.open_idea_for_voting(
  p_idea_id uuid
) RETURNS TABLE(ok boolean, reason text, vote_id uuid, closes_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_idea RECORD;
  v_membership RECORD;
  v_duration_days int;
  v_closes_at timestamptz;
  v_vote_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Get idea
  SELECT * INTO v_idea
  FROM public.ideas
  WHERE id = p_idea_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'IDEA_NOT_FOUND'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_idea.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Check idea status
  IF v_idea.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'IDEA_NOT_DRAFT'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Get duration from governance (default 7)
  -- Note: Using existing function signature with p_default_int parameter name
  v_duration_days := public.get_governance_int(v_idea.org_id, 'idea_vote_duration_days', 7);
  v_closes_at := now() + (v_duration_days || ' days')::interval;

  -- Create vote
  INSERT INTO public.idea_votes (idea_id, org_id, closes_at, duration_days, created_by)
  VALUES (p_idea_id, v_idea.org_id, v_closes_at, v_duration_days, v_user_id)
  ON CONFLICT (idea_id) DO UPDATE
    SET status = 'OPEN',
        closes_at = v_closes_at,
        duration_days = v_duration_days,
        opens_at = now()
  RETURNING id INTO v_vote_id;

  -- Update idea status
  UPDATE public.ideas
  SET status = 'OPEN',
      opened_at = now()
  WHERE id = p_idea_id;

  RETURN QUERY SELECT true, 'OK'::text, v_vote_id, v_closes_at;
END;
$$;

-- 3. Can Cast Idea Vote
CREATE OR REPLACE FUNCTION public.can_cast_idea_vote(
  p_vote_id uuid,
  p_user_id uuid
) RETURNS TABLE(allowed boolean, reason text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vote RECORD;
  v_membership_id uuid;
  v_ballot_exists boolean;
  v_can_vote_result RECORD;
  v_can_vote_exists boolean;
BEGIN
  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Check if vote is open
  IF v_vote.status != 'OPEN' OR now() >= v_vote.closes_at THEN
    RETURN QUERY SELECT false, 'VOTE_CLOSED'::text, jsonb_build_object('closes_at', v_vote.closes_at);
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = p_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Check if can_vote function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'can_vote'
  ) INTO v_can_vote_exists;

  IF v_can_vote_exists THEN
    SELECT * INTO v_can_vote_result
    FROM public.can_vote(v_vote.org_id, p_user_id);

    IF NOT v_can_vote_result.allowed THEN
      RETURN QUERY SELECT false, 'CAN_VOTE_BLOCKED'::text, 
        jsonb_build_object(
          'can_vote_reason', v_can_vote_result.reason,
          'can_vote_details', v_can_vote_result.details
        );
      RETURN;
    END IF;
  END IF;

  -- Check if already voted
  SELECT EXISTS (
    SELECT 1 FROM public.idea_ballots
    WHERE idea_vote_id = p_vote_id
      AND membership_id = v_membership_id
  ) INTO v_ballot_exists;

  IF v_ballot_exists THEN
    RETURN QUERY SELECT false, 'ALREADY_VOTED'::text, jsonb_build_object('membership_id', v_membership_id);
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::text, jsonb_build_object('membership_id', v_membership_id);
END;
$$;

-- 4. Cast Idea Vote
CREATE OR REPLACE FUNCTION public.cast_idea_vote(
  p_vote_id uuid,
  p_choice text
) RETURNS TABLE(ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_vote RECORD;
  v_membership_id uuid;
  v_can_vote_check RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  -- Validate choice
  IF p_choice NOT IN ('FOR', 'AGAINST') THEN
    RETURN QUERY SELECT false, 'INVALID_CHOICE'::text;
    RETURN;
  END IF;

  -- Preflight check
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_idea_vote(p_vote_id, v_user_id);

  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false, v_can_vote_check.reason;
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  -- Get membership_id from can_vote_check details
  v_membership_id := (v_can_vote_check.details->>'membership_id')::uuid;

  -- Upsert ballot
  INSERT INTO public.idea_ballots (idea_vote_id, membership_id, choice)
  VALUES (p_vote_id, v_membership_id, p_choice::text)
  ON CONFLICT (idea_vote_id, membership_id) DO UPDATE
    SET choice = p_choice::text,
        cast_at = now();

  RETURN QUERY SELECT true, 'CAST'::text;
END;
$$;

-- 5. Close Idea Vote
CREATE OR REPLACE FUNCTION public.close_idea_vote(
  p_vote_id uuid
) RETURNS TABLE(
  ok boolean, 
  reason text, 
  votes_for int, 
  votes_against int, 
  votes_total int,
  total_active_members int,
  participation_required int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_vote RECORD;
  v_membership RECORD;
  v_tally RECORD;
  v_min_participation_percent int;
  v_participation_required int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Get tally
  SELECT * INTO v_tally
  FROM public.idea_vote_tally
  WHERE vote_id = p_vote_id;

  -- Get min participation percent
  v_min_participation_percent := public.get_governance_int(v_vote.org_id, 'idea_vote_min_participation_percent', 50);
  
  -- Calculate participation required
  v_participation_required := CEIL(v_tally.total_active_members::numeric * v_min_participation_percent::numeric / 100.0);
  
  -- Close vote
  UPDATE public.idea_votes
  SET status = 'CLOSED',
      closed_at = now()
  WHERE id = p_vote_id;

  RETURN QUERY SELECT 
    true, 
    'CLOSED'::text,
    v_tally.votes_for,
    v_tally.votes_against,
    v_tally.votes_total,
    v_tally.total_active_members,
    v_participation_required;
END;
$$;

-- 6. Evaluate Idea Vote and Transition
CREATE OR REPLACE FUNCTION public.evaluate_idea_vote_and_transition(
  p_vote_id uuid,
  p_create_project boolean DEFAULT false,
  p_budget_eur numeric DEFAULT 0
) RETURNS TABLE(ok boolean, reason text, idea_id uuid, outcome text, project_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_vote RECORD;
  v_idea RECORD;
  v_membership RECORD;
  v_tally RECORD;
  v_min_participation_percent int;
  v_participation_required int;
  v_participation_ok boolean;
  v_majority_ok boolean;
  v_outcome text;
  v_project_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get vote
  SELECT * INTO v_vote
  FROM public.idea_votes
  WHERE id = p_vote_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_vote.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get idea
  SELECT * INTO v_idea
  FROM public.ideas
  WHERE id = v_vote.idea_id;

  -- Auto-close if not closed and time passed
  IF v_vote.status = 'OPEN' AND now() >= v_vote.closes_at THEN
    PERFORM * FROM public.close_idea_vote(p_vote_id);
    SELECT * INTO v_vote FROM public.idea_votes WHERE id = p_vote_id;
  END IF;

  IF v_vote.status != 'CLOSED' THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_CLOSED'::text, v_idea.id, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get tally
  SELECT * INTO v_tally
  FROM public.idea_vote_tally
  WHERE vote_id = p_vote_id;

  -- Get min participation percent
  v_min_participation_percent := public.get_governance_int(v_vote.org_id, 'idea_vote_min_participation_percent', 50);
  v_participation_required := CEIL(v_tally.total_active_members::numeric * v_min_participation_percent::numeric / 100.0);
  v_participation_ok := v_tally.votes_total >= v_participation_required;
  v_majority_ok := v_tally.votes_for > v_tally.votes_against;

  -- Determine outcome
  IF NOT v_participation_ok THEN
    v_outcome := 'NOT_COMPLETED';
    UPDATE public.ideas
    SET status = 'NOT_COMPLETED',
        closed_at = now()
    WHERE id = v_idea.id;
    
    RETURN QUERY SELECT true, 'INSUFFICIENT_PARTICIPATION'::text, v_idea.id, v_outcome, NULL::uuid;
    RETURN;
  END IF;

  IF v_majority_ok THEN
    v_outcome := 'PASSED';
    UPDATE public.ideas
    SET status = 'PASSED',
        closed_at = now(),
        passed_at = now()
    WHERE id = v_idea.id;

    -- Create project if requested
    IF p_create_project AND p_budget_eur > 0 THEN
      INSERT INTO public.projects (org_id, idea_id, title, description, budget_eur, created_by)
      VALUES (v_idea.org_id, v_idea.id, v_idea.title, v_idea.summary, p_budget_eur, v_user_id)
      RETURNING id INTO v_project_id;
    END IF;

    RETURN QUERY SELECT true, 'PASSED'::text, v_idea.id, v_outcome, v_project_id;
    RETURN;
  ELSE
    v_outcome := 'FAILED';
    UPDATE public.ideas
    SET status = 'FAILED',
        closed_at = now()
    WHERE id = v_idea.id;

    RETURN QUERY SELECT true, 'NO_MAJORITY'::text, v_idea.id, v_outcome, NULL::uuid;
    RETURN;
  END IF;
END;
$$;

-- 7. Pledge Money
CREATE OR REPLACE FUNCTION public.pledge_money(
  p_project_id uuid,
  p_amount_eur numeric,
  p_note text DEFAULT NULL
) RETURNS TABLE(ok boolean, reason text, contribution_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_amount_eur <= 0 THEN
    RETURN QUERY SELECT false, 'INVALID_AMOUNT'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = v_project.org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id, org_id, membership_id, kind, money_amount_eur, note
  )
  VALUES (p_project_id, v_project.org_id, v_membership_id, 'MONEY', p_amount_eur, p_note)
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true, 'PLEDGED'::text, v_contribution_id;
END;
$$;

-- 8. Pledge In-Kind
CREATE OR REPLACE FUNCTION public.pledge_in_kind(
  p_project_id uuid,
  p_items jsonb,
  p_note text DEFAULT NULL
) RETURNS TABLE(ok boolean, reason text, contribution_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN QUERY SELECT false, 'INVALID_ITEMS'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = v_project.org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id, org_id, membership_id, kind, in_kind_items, note
  )
  VALUES (p_project_id, v_project.org_id, v_membership_id, 'IN_KIND', p_items, p_note)
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true, 'PLEDGED'::text, v_contribution_id;
END;
$$;

-- 9. Pledge Work
CREATE OR REPLACE FUNCTION public.pledge_work(
  p_project_id uuid,
  p_work jsonb,
  p_note text DEFAULT NULL
) RETURNS TABLE(ok boolean, reason text, contribution_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_project RECORD;
  v_membership_id uuid;
  v_contribution_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_work IS NULL OR p_work->>'hours' IS NULL THEN
    RETURN QUERY SELECT false, 'INVALID_WORK'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROJECT_NOT_FOUND'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Get membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE org_id = v_project.org_id
    AND user_id = v_user_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insert contribution
  INSERT INTO public.project_contributions (
    project_id, org_id, membership_id, kind, work_offer, note
  )
  VALUES (p_project_id, v_project.org_id, v_membership_id, 'WORK', p_work, p_note)
  RETURNING id INTO v_contribution_id;

  RETURN QUERY SELECT true, 'PLEDGED'::text, v_contribution_id;
END;
$$;

-- 10. Update Contribution Status
CREATE OR REPLACE FUNCTION public.update_contribution_status(
  p_contribution_id uuid,
  p_status text
) RETURNS TABLE(ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_contribution RECORD;
  v_membership RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  IF p_status NOT IN ('PLEDGED', 'RECEIVED', 'CANCELLED') THEN
    RETURN QUERY SELECT false, 'INVALID_STATUS'::text;
    RETURN;
  END IF;

  -- Get contribution
  SELECT * INTO v_contribution
  FROM public.project_contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'CONTRIBUTION_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Check OWNER/BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_contribution.org_id
    AND m.user_id = v_user_id
    AND m.status = 'ACTIVE'
    AND (
      m.role = 'OWNER' OR
      EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = v_user_id
          AND p.org_id = m.org_id
          AND p.title = 'BOARD'
          AND p.is_active = true
      )
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text;
    RETURN;
  END IF;

  -- Update status
  UPDATE public.project_contributions
  SET status = p_status::text,
      updated_at = now()
  WHERE id = p_contribution_id;

  RETURN QUERY SELECT true, 'UPDATED'::text;
END;
$$;
-- ===== END create_ideas_projects_rpc.sql =====

-- ===== BEGIN create_meeting_agenda_module.sql =====
-- ==================================================
-- GA SUSIRINKIMO MODULIO SUKŪRIMAS
-- ==================================================
-- Sukuria agenda lenteles, meetings papildymus, RPC funkcijas
-- ==================================================

-- ==================================================
-- 1. MEETINGS LENTELĖS PAPILDYMAS
-- ==================================================

-- Add meeting_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'meeting_type'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN meeting_type TEXT NOT NULL DEFAULT 'GA';
    
    RAISE NOTICE 'Added meeting_type column to meetings';
  ELSE
    RAISE NOTICE 'meetings.meeting_type already exists';
  END IF;
END $$;

-- Add status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'));
    
    RAISE NOTICE 'Added status column to meetings';
  ELSE
    RAISE NOTICE 'meetings.status already exists';
  END IF;
END $$;

-- Add location column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN location TEXT;
    
    RAISE NOTICE 'Added location column to meetings';
  ELSE
    RAISE NOTICE 'meetings.location already exists';
  END IF;
END $$;

-- Add published_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN published_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added published_at column to meetings';
  ELSE
    RAISE NOTICE 'meetings.published_at already exists';
  END IF;
END $$;

-- Add notice_days column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'notice_days'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN notice_days INT;
    
    RAISE NOTICE 'Added notice_days column to meetings';
  ELSE
    RAISE NOTICE 'meetings.notice_days already exists';
  END IF;
END $$;

-- Add notice_sent_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'notice_sent_at'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN notice_sent_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added notice_sent_at column to meetings';
  ELSE
    RAISE NOTICE 'meetings.notice_sent_at already exists';
  END IF;
END $$;

-- Add agenda_version column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'agenda_version'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN agenda_version INT NOT NULL DEFAULT 1;
    
    RAISE NOTICE 'Added agenda_version column to meetings';
  ELSE
    RAISE NOTICE 'meetings.agenda_version already exists';
  END IF;
END $$;

-- ==================================================
-- 2. MEETING_AGENDA_ITEMS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  item_no INT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  resolution_id UUID REFERENCES public.resolutions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT uq_meeting_agenda_item_no UNIQUE (meeting_id, item_no)
);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting ON public.meeting_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_resolution ON public.meeting_agenda_items(resolution_id);

COMMENT ON TABLE public.meeting_agenda_items IS 'Susirinkimo darbotvarkės klausimai';
COMMENT ON COLUMN public.meeting_agenda_items.item_no IS 'Klausimo numeris darbotvarkėje (1..n)';
COMMENT ON COLUMN public.meeting_agenda_items.resolution_id IS 'Susietas nutarimo projektas (optional)';

-- ==================================================
-- 3. MEETING_AGENDA_ATTACHMENTS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_agenda_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id UUID NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'meeting-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_attachments_item ON public.meeting_agenda_attachments(agenda_item_id);

COMMENT ON TABLE public.meeting_agenda_attachments IS 'Darbotvarkės klausimų priedai (failų metaduomenys)';
COMMENT ON COLUMN public.meeting_agenda_attachments.storage_path IS 'Supabase Storage path (pvz: org/{orgId}/meetings/{meetingId}/agenda/{itemId}/file.pdf)';

-- ==================================================
-- 4. MEETING_AGENDA_PUBLIC VIEW
-- ==================================================

CREATE OR REPLACE VIEW public.meeting_agenda_public AS
SELECT 
  m.id as meeting_id,
  m.org_id,
  m.title as meeting_title,
  m.scheduled_at,
  m.location,
  m.status as meeting_status,
  m.published_at,
  ai.id as agenda_item_id,
  ai.item_no,
  ai.title as item_title,
  ai.summary,
  ai.details,
  ai.resolution_id,
  aa.id as attachment_id,
  aa.storage_path,
  aa.file_name,
  aa.mime_type,
  aa.size_bytes
FROM public.meetings m
LEFT JOIN public.meeting_agenda_items ai ON ai.meeting_id = m.id
LEFT JOIN public.meeting_agenda_attachments aa ON aa.agenda_item_id = ai.id
WHERE m.status = 'PUBLISHED'
ORDER BY m.scheduled_at DESC, ai.item_no ASC;

COMMENT ON VIEW public.meeting_agenda_public IS 'Publikuotų susirinkimų darbotvarkės su priedais (nariams)';

GRANT SELECT ON public.meeting_agenda_public TO authenticated;

-- ==================================================
-- 5. ENABLE RLS
-- ==================================================

ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_attachments ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 
  '=== MEETING AGENDA MODULIS SUKURTAS ===' as status,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = 'meetings' 
   AND column_name IN ('meeting_type', 'status', 'location', 'published_at', 'notice_days', 'notice_sent_at', 'agenda_version')) as meetings_columns_added,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('meeting_agenda_items', 'meeting_agenda_attachments')) as agenda_tables_created,
  (SELECT COUNT(*) FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name = 'meeting_agenda_public') as views_created;
-- ===== END create_meeting_agenda_module.sql =====

-- ===== BEGIN create_meeting_agenda_rls_policies.sql =====
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
-- ===== END create_meeting_agenda_rls_policies.sql =====

-- ===== BEGIN create_meeting_agenda_rpc_functions.sql =====
-- ==================================================
-- GA SUSIRINKIMO MODULIO RPC FUNKCIJOS
-- ==================================================
-- Visos DB-centrinė logika
-- ==================================================

-- ==================================================
-- A) get_governance_int
-- ==================================================

CREATE OR REPLACE FUNCTION public.get_governance_int(
  p_org_id UUID,
  p_key TEXT,
  p_default_int INT
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_value TEXT;
  v_int_value INT;
BEGIN
  -- Get value from governance_configs.answers
  SELECT gc.answers->>p_key INTO v_value
  FROM public.governance_configs gc
  WHERE gc.org_id = p_org_id
  LIMIT 1;
  
  -- If not found or null, return default
  IF v_value IS NULL THEN
    RETURN p_default_int;
  END IF;
  
  -- Try to cast to int
  BEGIN
    v_int_value := v_value::INT;
    RETURN v_int_value;
  EXCEPTION
    WHEN OTHERS THEN
      -- If cast fails, return default
      RETURN p_default_int;
  END;
END;
$$;

COMMENT ON FUNCTION public.get_governance_int IS 'Gauna int reikšmę iš governance_configs.answers pagal key, jei nėra - grąžina default';

-- ==================================================
-- B) can_schedule_meeting
-- ==================================================

CREATE OR REPLACE FUNCTION public.can_schedule_meeting(
  p_org_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  earliest_allowed TIMESTAMPTZ,
  notice_days INT,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_notice_days INT;
  v_earliest_allowed TIMESTAMPTZ;
BEGIN
  -- Get notice_days from governance config
  v_notice_days := public.get_governance_int(p_org_id, 'meeting_notice_days', 14);
  
  -- Calculate earliest allowed date
  v_earliest_allowed := NOW() + make_interval(days => v_notice_days);
  
  -- Check if scheduled_at is allowed
  IF p_scheduled_at >= v_earliest_allowed THEN
    RETURN QUERY SELECT 
      true,
      'OK'::TEXT,
      v_earliest_allowed,
      v_notice_days,
      jsonb_build_object(
        'scheduled_at', p_scheduled_at,
        'notice_days', v_notice_days,
        'earliest_allowed', v_earliest_allowed
      );
  ELSE
    RETURN QUERY SELECT 
      false,
      'NOTICE_TOO_SHORT'::TEXT,
      v_earliest_allowed,
      v_notice_days,
      jsonb_build_object(
        'scheduled_at', p_scheduled_at,
        'notice_days', v_notice_days,
        'earliest_allowed', v_earliest_allowed,
        'days_short', EXTRACT(DAY FROM (v_earliest_allowed - p_scheduled_at))::INT
      );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.can_schedule_meeting IS 'Tikrina ar susirinkimas gali būti suplanuotas pagal notice_days taisyklę';

-- ==================================================
-- C) create_meeting_ga
-- ==================================================

CREATE OR REPLACE FUNCTION public.create_meeting_ga(
  p_org_id UUID,
  p_title TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_location TEXT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  meeting_id UUID,
  earliest_allowed TIMESTAMPTZ,
  notice_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_schedule_check RECORD;
  v_new_meeting_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID, NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or has BOARD position
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = p_org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  -- If not OWNER, check BOARD position
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = p_org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID, NULL::TIMESTAMPTZ, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(p_org_id, p_scheduled_at);
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false, 
      v_schedule_check.reason,
      NULL::UUID,
      v_schedule_check.earliest_allowed,
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Create meeting
  INSERT INTO public.meetings (
    org_id,
    title,
    scheduled_at,
    location,
    meeting_type,
    status,
    created_by
  )
  VALUES (
    p_org_id,
    p_title,
    p_scheduled_at,
    p_location,
    'GA',
    'DRAFT',
    v_user_id
  )
  RETURNING id INTO v_new_meeting_id;
  
  RETURN QUERY SELECT 
    true,
    'MEETING_CREATED',
    v_new_meeting_id,
    v_schedule_check.earliest_allowed,
    v_schedule_check.notice_days;
END;
$$;

COMMENT ON FUNCTION public.create_meeting_ga IS 'Sukuria GA susirinkimą su scheduling validacija';

-- ==================================================
-- D) update_meeting_schedule
-- ==================================================

CREATE OR REPLACE FUNCTION public.update_meeting_schedule(
  p_meeting_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_location TEXT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  earliest_allowed TIMESTAMPTZ,
  notice_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_schedule_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT (can only update DRAFT)
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::TIMESTAMPTZ, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(v_meeting.org_id, p_scheduled_at);
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false, 
      v_schedule_check.reason,
      v_schedule_check.earliest_allowed,
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Update meeting
  UPDATE public.meetings
  SET 
    scheduled_at = p_scheduled_at,
    location = COALESCE(p_location, location)
  WHERE id = p_meeting_id;
  
  RETURN QUERY SELECT 
    true,
    'MEETING_UPDATED',
    v_schedule_check.earliest_allowed,
    v_schedule_check.notice_days;
END;
$$;

COMMENT ON FUNCTION public.update_meeting_schedule IS 'Atnaujina susirinkimo datą ir vietą (tik DRAFT status)';

-- ==================================================
-- E) add_agenda_item
-- ==================================================

CREATE OR REPLACE FUNCTION public.add_agenda_item(
  p_meeting_id UUID,
  p_item_no INT,
  p_title TEXT,
  p_summary TEXT DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_resolution_id UUID DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  agenda_item_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Insert agenda item
  INSERT INTO public.meeting_agenda_items (
    meeting_id,
    item_no,
    title,
    summary,
    details,
    resolution_id,
    created_by
  )
  VALUES (
    p_meeting_id,
    p_item_no,
    p_title,
    p_summary,
    p_details,
    p_resolution_id,
    v_user_id
  )
  RETURNING id INTO agenda_item_id;
  
  RETURN QUERY SELECT true, 'AGENDA_ITEM_ADDED', agenda_item_id;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'ITEM_NO_EXISTS', NULL::UUID;
END;
$$;

COMMENT ON FUNCTION public.add_agenda_item IS 'Prideda darbotvarkės klausimą (tik DRAFT meeting)';

-- ==================================================
-- F) update_agenda_item
-- ==================================================

CREATE OR REPLACE FUNCTION public.update_agenda_item(
  p_agenda_item_id UUID,
  p_item_no INT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_resolution_id UUID DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'AGENDA_ITEM_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT';
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED';
      RETURN;
    END IF;
  END IF;
  
  -- Update agenda item (only non-null fields)
  UPDATE public.meeting_agenda_items
  SET 
    item_no = COALESCE(p_item_no, item_no),
    title = COALESCE(p_title, title),
    summary = COALESCE(p_summary, summary),
    details = COALESCE(p_details, details),
    resolution_id = COALESCE(p_resolution_id, resolution_id),
    updated_at = NOW()
  WHERE id = p_agenda_item_id;
  
  RETURN QUERY SELECT true, 'AGENDA_ITEM_UPDATED';
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'ITEM_NO_EXISTS';
END;
$$;

COMMENT ON FUNCTION public.update_agenda_item IS 'Atnaujina darbotvarkės klausimą (tik DRAFT meeting)';

-- ==================================================
-- G) delete_agenda_item
-- ==================================================

CREATE OR REPLACE FUNCTION public.delete_agenda_item(
  p_agenda_item_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'AGENDA_ITEM_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT';
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED';
      RETURN;
    END IF;
  END IF;
  
  -- Delete agenda item (cascade will delete attachments)
  DELETE FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  RETURN QUERY SELECT true, 'AGENDA_ITEM_DELETED';
END;
$$;

COMMENT ON FUNCTION public.delete_agenda_item IS 'Ištrina darbotvarkės klausimą (tik DRAFT meeting)';

-- ==================================================
-- H) attach_agenda_file_metadata
-- ==================================================

CREATE OR REPLACE FUNCTION public.attach_agenda_file_metadata(
  p_agenda_item_id UUID,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT DEFAULT NULL,
  p_size_bytes BIGINT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  attachment_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_agenda_item RECORD;
  v_meeting RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get agenda item
  SELECT * INTO v_agenda_item
  FROM public.meeting_agenda_items
  WHERE id = p_agenda_item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'AGENDA_ITEM_NOT_FOUND', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = v_agenda_item.meeting_id;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Insert attachment metadata
  INSERT INTO public.meeting_agenda_attachments (
    agenda_item_id,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    uploaded_by
  )
  VALUES (
    p_agenda_item_id,
    p_storage_path,
    p_file_name,
    p_mime_type,
    p_size_bytes,
    v_user_id
  )
  RETURNING id INTO attachment_id;
  
  RETURN QUERY SELECT true, 'ATTACHMENT_ADDED', attachment_id;
END;
$$;

COMMENT ON FUNCTION public.attach_agenda_file_metadata IS 'Prideda priedo metaduomenis (tik DRAFT meeting, failas jau uploadintas į Storage)';

-- ==================================================
-- I) publish_meeting
-- ==================================================

CREATE OR REPLACE FUNCTION public.publish_meeting(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  published_at TIMESTAMPTZ,
  notice_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_schedule_check RECORD;
  v_notice_days INT;
  v_agenda_count INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if meeting is DRAFT
  IF v_meeting.status != 'DRAFT' THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_DRAFT', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.org_id = v_meeting.org_id
    AND m.user_id = v_user_id
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::TIMESTAMPTZ, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Check if has at least 1 agenda item
  SELECT COUNT(*) INTO v_agenda_count
  FROM public.meeting_agenda_items
  WHERE meeting_id = p_meeting_id;
  
  IF v_agenda_count = 0 THEN
    RETURN QUERY SELECT false, 'NO_AGENDA_ITEMS', NULL::TIMESTAMPTZ, NULL::INT;
    RETURN;
  END IF;
  
  -- Check scheduling rules
  SELECT * INTO v_schedule_check
  FROM public.can_schedule_meeting(v_meeting.org_id, v_meeting.scheduled_at);
  
  IF NOT v_schedule_check.allowed THEN
    RETURN QUERY SELECT 
      false, 
      v_schedule_check.reason,
      NULL::TIMESTAMPTZ,
      v_schedule_check.notice_days;
    RETURN;
  END IF;
  
  -- Get notice_days
  v_notice_days := public.get_governance_int(v_meeting.org_id, 'meeting_notice_days', 14);
  
  -- Publish meeting
  UPDATE public.meetings
  SET 
    status = 'PUBLISHED',
    published_at = NOW(),
    notice_days = v_notice_days,
    agenda_version = agenda_version + 1
  WHERE id = p_meeting_id;
  
  RETURN QUERY SELECT 
    true,
    'MEETING_PUBLISHED',
    NOW(),
    v_notice_days;
END;
$$;

COMMENT ON FUNCTION public.publish_meeting IS 'Publikuoja susirinkimą (reikalauja bent 1 agenda item ir valid scheduling)';
-- ===== END create_meeting_agenda_rpc_functions.sql =====

-- ===== BEGIN create_member_invites_table.sql =====
-- ==================================================
-- MEMBER INVITES TABLE
-- ==================================================
-- Table for managing member invitations to organizations
-- ==================================================

CREATE TABLE IF NOT EXISTS public.member_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_invites_org ON public.member_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_member_invites_token ON public.member_invites(token);
CREATE INDEX IF NOT EXISTS idx_member_invites_email ON public.member_invites(email);
CREATE INDEX IF NOT EXISTS idx_member_invites_status ON public.member_invites(status);

-- RLS Policies
ALTER TABLE public.member_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read invites for their email
CREATE POLICY "Users can read invites for their email"
  ON public.member_invites
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: OWNER can manage invites for their org
CREATE POLICY "OWNER can manage invites for their org"
  ON public.member_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE org_id = member_invites.org_id
        AND user_id = auth.uid()
        AND member_status = 'ACTIVE'
        AND role = 'OWNER'
    )
  );

-- Policy: Users can update invites they created (to mark as accepted)
CREATE POLICY "Users can update their own invites"
  ON public.member_invites
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

COMMENT ON TABLE public.member_invites IS 'Narių kvietimai į organizacijas';
COMMENT ON COLUMN public.member_invites.token IS 'Unikalus kvietimo tokenas';
COMMENT ON COLUMN public.member_invites.status IS 'Kvietimo būsena: PENDING, ACCEPTED, EXPIRED, CANCELLED';
COMMENT ON COLUMN public.member_invites.expires_at IS 'Kvietimo galiojimo pabaigos data';
-- ===== END create_member_invites_table.sql =====

-- ===== BEGIN create_org_logos_bucket.sql =====
-- Create org-logos storage bucket for organization logos
-- This bucket stores uploaded organization logos/avatars

-- Note: Storage buckets are created via Supabase Dashboard or Storage API
-- This SQL file provides the RLS policies for the bucket

-- First, create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage → Create Bucket
-- 2. Name: org-logos
-- 3. Public: Yes (so logos can be accessed via public URLs)
-- 4. File size limit: 5MB
-- 5. Allowed MIME types: image/*

-- Then run the policies below:

-- Policy: Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-logos');

-- Policy: Allow authenticated users to update their org logos
CREATE POLICY "Authenticated users can update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'org-logos')
WITH CHECK (bucket_id = 'org-logos');

-- Policy: Allow public read access to logos
CREATE POLICY "Public read access for org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');

-- Policy: Allow authenticated users to delete their org logos
CREATE POLICY "Authenticated users can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-logos');
-- ===== END create_org_logos_bucket.sql =====

-- ===== BEGIN create_org_review_requests.sql =====
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
-- ===== END create_org_review_requests.sql =====

-- ===== BEGIN create_org_review_rls.sql =====
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
    WHERE m.user_id = auth.uid()
      AND m.org_id = org_review_requests.org_id
      AND m.role = 'OWNER'
      AND m.member_status = 'ACTIVE'
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
    WHERE m.user_id = auth.uid()
      AND m.org_id = org_review_requests.org_id
      AND m.role = 'OWNER'
      AND m.member_status = 'ACTIVE'
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
-- ===== END create_org_review_rls.sql =====

-- ===== BEGIN create_org_review_rpc.sql =====
-- ==================================================
-- Organization Review Request RPC Functions
-- ==================================================
-- Vienintelis kelias sukurti/adminuoti admin užklausas
-- ==================================================

-- Helper function to check if user is platform admin
-- Adjust this based on your actual platform admin mechanism
-- Drop ALL existing functions with this name (regardless of signature)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Find and drop all functions named is_platform_admin
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'is_platform_admin'
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore errors
        NULL;
    END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if platform_admins table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'platform_admins'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = p_user_id
        AND is_active = true
    );
  END IF;
  
  -- Check if users table has is_platform_admin column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' 
      AND table_name = 'users' 
      AND column_name = 'is_platform_admin'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_user_id
        AND is_platform_admin = true
    );
  END IF;
  
  -- If no mechanism exists, return false (security by default)
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_platform_admin IS 'Patikrina ar vartotojas yra Branduolio admin';

-- Helper function to check if user is OWNER of org
CREATE OR REPLACE FUNCTION public.is_org_owner(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_user_id
      AND m.org_id = p_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
  );
END;
$$;

COMMENT ON FUNCTION public.is_org_owner IS 'Patikrina ar vartotojas yra organizacijos OWNER';

-- ==================================================
-- 1. submit_org_for_review
-- ==================================================
-- Sukuria admin užklausą tik jei org yra ready
CREATE OR REPLACE FUNCTION public.submit_org_for_review(
  p_org_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  request_id UUID,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_readiness RECORD;
  v_request_id UUID;
  v_existing_request UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if user is OWNER
  SELECT public.is_org_owner(v_user_id, p_org_id) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RETURN QUERY SELECT false, 'NOT_OWNER'::TEXT, NULL::UUID, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if there's already an OPEN request
  SELECT id INTO v_existing_request
  FROM public.org_review_requests
  WHERE org_id = p_org_id
    AND status = 'OPEN';
  
  IF v_existing_request IS NOT NULL THEN
    RETURN QUERY SELECT false, 'ALREADY_SUBMITTED'::TEXT, v_existing_request, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check readiness
  SELECT * INTO v_readiness
  FROM public.org_onboarding_readiness
  WHERE org_id = p_org_id;
  
  IF NOT v_readiness.ready_to_submit THEN
    RETURN QUERY SELECT 
      false, 
      'NOT_READY'::TEXT, 
      NULL::UUID,
      jsonb_build_object(
        'has_required_org_fields', v_readiness.has_required_org_fields,
        'has_bylaws', v_readiness.has_bylaws,
        'has_governance_required', v_readiness.has_governance_required
      );
    RETURN;
  END IF;
  
  -- Create request
  INSERT INTO public.org_review_requests (
    org_id,
    requested_by,
    status,
    note
  ) VALUES (
    p_org_id,
    v_user_id,
    'OPEN',
    p_note
  )
  RETURNING id INTO v_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'SUBMITTED_FOR_REVIEW'
  WHERE id = p_org_id;
  
  -- Create notification for platform admin (if notifications table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    -- Insert notification for all platform admins
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      created_at
    )
    SELECT 
      u.id,
      'ORG_REVIEW_REQUEST',
      'Nauja bendruomenė laukia patvirtinimo',
      'Bendruomenė ' || o.name || ' pateikta tvirtinimui',
      jsonb_build_object(
        'org_id', p_org_id,
        'org_name', o.name,
        'request_id', v_request_id
      ),
      now()
    FROM auth.users u
    CROSS JOIN public.orgs o
    WHERE o.id = p_org_id
      AND public.is_platform_admin(u.id);
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT, v_request_id, NULL::JSONB;
END;
$$;

COMMENT ON FUNCTION public.submit_org_for_review IS 'Pateikia organizaciją Branduolio admin patvirtinimui (tik jei ready)';

-- ==================================================
-- 2. request_org_changes
-- ==================================================
-- Admin grąžina užklausą taisymams
CREATE OR REPLACE FUNCTION public.request_org_changes(
  p_request_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'NOT_ADMIN'::TEXT;
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status = 'OPEN';
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'REQUEST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'NEEDS_CHANGES',
      admin_note = p_admin_note,
      decided_at = now(),
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'NEEDS_CHANGES'
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      created_at
    )
    SELECT 
      m.user_id,
      'ORG_REVIEW_FEEDBACK',
      'Reikia pataisymų registracijoje',
      'Branduolio admin prašo pataisyti registracijos duomenis',
      jsonb_build_object(
        'org_id', v_org_id,
        'request_id', p_request_id,
        'admin_note', p_admin_note
      ),
      now()
    FROM public.memberships m
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.request_org_changes IS 'Branduolio admin grąžina užklausą taisymams';

-- ==================================================
-- 3. approve_org
-- ==================================================
-- Admin patvirtina organizaciją
CREATE OR REPLACE FUNCTION public.approve_org(
  p_request_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'NOT_ADMIN'::TEXT;
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status = 'OPEN';
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'REQUEST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'APPROVED',
      decided_at = now(),
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status and activation
  UPDATE public.orgs
  SET status = 'ACTIVE',
      activated_at = now(),
      activated_by = v_user_id
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      created_at
    )
    SELECT 
      m.user_id,
      'ORG_APPROVED',
      'Bendruomenė patvirtinta',
      'Jūsų bendruomenė buvo patvirtinta ir dabar yra aktyvi',
      jsonb_build_object(
        'org_id', v_org_id,
        'request_id', p_request_id
      ),
      now()
    FROM public.memberships m
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.approve_org IS 'Branduolio admin patvirtina organizaciją';

-- ==================================================
-- 4. reject_org
-- ==================================================
-- Admin atmeta organizaciją
CREATE OR REPLACE FUNCTION public.reject_org(
  p_request_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is platform admin
  SELECT public.is_platform_admin(v_user_id) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'NOT_ADMIN'::TEXT;
    RETURN;
  END IF;
  
  -- Get org_id from request
  SELECT org_id INTO v_org_id
  FROM public.org_review_requests
  WHERE id = p_request_id
    AND status IN ('OPEN', 'NEEDS_CHANGES');
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'REQUEST_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Update request
  UPDATE public.org_review_requests
  SET status = 'REJECTED',
      admin_note = p_admin_note,
      decided_at = now(),
      decided_by = v_user_id
  WHERE id = p_request_id;
  
  -- Update org status
  UPDATE public.orgs
  SET status = 'REJECTED'
  WHERE id = v_org_id;
  
  -- Create notification for org owner
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_name = 'notifications'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      created_at
    )
    SELECT 
      m.user_id,
      'ORG_REJECTED',
      'Bendruomenė atmesta',
      'Jūsų bendruomenės registracija buvo atmesta',
      jsonb_build_object(
        'org_id', v_org_id,
        'request_id', p_request_id,
        'admin_note', p_admin_note
      ),
      now()
    FROM public.memberships m
    WHERE m.org_id = v_org_id
      AND m.role = 'OWNER'
      AND m.status = 'ACTIVE'
    LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.reject_org IS 'Branduolio admin atmeta organizaciją';
-- ===== END create_org_review_rpc.sql =====

-- ===== BEGIN create_protocol_module.sql =====
-- ==================================================
-- GA PROTOKOLŲ MODULIO SUKŪRIMAS
-- ==================================================
-- Sukuria protokolo lenteles, indeksus
-- ==================================================

-- ==================================================
-- 1. MEETING_PROTOCOLS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  protocol_number TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINAL')),
  snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  pdf_bucket TEXT DEFAULT 'meeting-documents',
  pdf_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_by UUID REFERENCES auth.users(id),
  finalized_at TIMESTAMPTZ,
  CONSTRAINT uq_meeting_protocol_version UNIQUE (meeting_id, version)
);

CREATE INDEX IF NOT EXISTS idx_meeting_protocols_org ON public.meeting_protocols(org_id);
CREATE INDEX IF NOT EXISTS idx_meeting_protocols_meeting ON public.meeting_protocols(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_protocols_status ON public.meeting_protocols(status);
CREATE INDEX IF NOT EXISTS idx_meeting_protocols_number ON public.meeting_protocols(org_id, protocol_number);

COMMENT ON TABLE public.meeting_protocols IS 'GA susirinkimų protokolai (immutable po finalizavimo)';
COMMENT ON COLUMN public.meeting_protocols.snapshot IS 'VISAS protokolo turinys (agenda + votes + quorum + dalyviai)';
COMMENT ON COLUMN public.meeting_protocols.snapshot_hash IS 'sha256(snapshot::text) - immutable garantija';
COMMENT ON COLUMN public.meeting_protocols.protocol_number IS 'Protokolo numeris (pvz. "2025-0002" arba "Nr. 2")';

-- ==================================================
-- 2. MEETING_PROTOCOL_SIGNATURES LENTELĖ (optional MVP)
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_protocol_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES public.meeting_protocols(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('CHAIRMAN', 'SECRETARY')),
  signed_by UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  signature_type TEXT CHECK (signature_type IN ('typed', 'ep-signature')),
  signature_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_meeting_protocol_signatures_protocol ON public.meeting_protocol_signatures(protocol_id);

COMMENT ON TABLE public.meeting_protocol_signatures IS 'Protokolo parašai (optional MVP)';
COMMENT ON COLUMN public.meeting_protocol_signatures.role IS 'CHAIRMAN arba SECRETARY';

-- ==================================================
-- 3. ENABLE RLS
-- ==================================================

ALTER TABLE public.meeting_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_protocol_signatures ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 
  '=== PROTOCOL MODULIS SUKURTAS ===' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('meeting_protocols', 'meeting_protocol_signatures')) as tables_created;
-- ===== END create_protocol_module.sql =====

-- ===== BEGIN create_protocol_rls_policies.sql =====
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
-- ===== END create_protocol_rls_policies.sql =====

-- ===== BEGIN create_protocol_rpc_functions.sql =====
-- ==================================================
-- GA PROTOKOLŲ MODULIO RPC FUNKCIJOS
-- ==================================================
-- Visos DB-centrinė logika
-- ==================================================

-- ==================================================
-- A) build_meeting_protocol_snapshot
-- ==================================================

CREATE OR REPLACE FUNCTION public.build_meeting_protocol_snapshot(
  p_meeting_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_meeting RECORD;
  v_attendance_summary JSONB;
  v_quorum JSONB;
  v_agenda JSONB;
  v_snapshot JSONB;
  v_quorum_function_exists BOOLEAN;
BEGIN
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'MEETING_NOT_FOUND');
  END IF;
  
  -- 1) Meeting meta
  -- Already have v_meeting
  
  -- 2) Attendance summary (using unique participants - no double counting)
  -- Remote participants from vote_ballots (WRITTEN/REMOTE), Live from meeting_attendance (IN_PERSON)
  SELECT jsonb_build_object(
    'present_in_person', COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    ), 0),
    'present_written', COALESCE((
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'WRITTEN'
    ), 0),
    'present_remote', COALESCE((
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'REMOTE'
    ), 0),
    'present_total', (
      SELECT 
        COALESCE((
          SELECT COUNT(DISTINCT membership_id)
          FROM public.meeting_remote_voters
          WHERE meeting_id = p_meeting_id
        ), 0) + COALESCE((
          SELECT COUNT(*)
          FROM public.meeting_attendance
          WHERE meeting_id = p_meeting_id
            AND present = true
            AND mode = 'IN_PERSON'
        ), 0)
    ),
    'total_active_members', (
      SELECT COUNT(*) FROM public.memberships
      WHERE org_id = v_meeting.org_id
      AND member_status = 'ACTIVE'
    )
  ) INTO v_attendance_summary;
  
  -- 3) Quorum
  -- REQUIRE meeting_quorum_status function (source of truth)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'meeting_quorum_status'
  ) INTO v_quorum_function_exists;
  
  IF NOT v_quorum_function_exists THEN
    -- Quorum function is required - return error
    RETURN jsonb_build_object('error', 'QUORUM_FUNCTION_MISSING');
  END IF;
  
  -- Use meeting_quorum_status (source of truth)
  SELECT to_jsonb(q.*) INTO v_quorum
  FROM public.meeting_quorum_status(p_meeting_id) q;
  
  -- 4) Agenda with votes
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_no', ai.item_no,
      'title', ai.title,
      'summary', ai.summary,
      'details', ai.details,
      'resolution_id', ai.resolution_id,
      'resolution', CASE 
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', r.id,
            'title', r.title,
            'status', r.status,
            'adopted_at', r.adopted_at,
            'adopted_by', r.adopted_by,
            'recommended_at', r.recommended_at,
            'recommended_by', r.recommended_by
          )
          FROM public.resolutions r
          WHERE r.id = ai.resolution_id
        )
        ELSE NULL
      END,
      'vote', CASE 
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', v.id,
            'kind', v.kind,
            'status', v.status,
            'opens_at', v.opens_at,
            'closes_at', v.closes_at,
            'closed_at', v.closed_at,
            'tallies', (
              SELECT jsonb_build_object(
                'votes_for', 
                  COALESCE((SELECT votes_for FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_for_count FROM public.vote_live_totals WHERE vote_id = v.id), 0),
                'votes_against', 
                  COALESCE((SELECT votes_against FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_against_count FROM public.vote_live_totals WHERE vote_id = v.id), 0),
                'votes_abstain', 
                  COALESCE((SELECT votes_abstain FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_abstain_count FROM public.vote_live_totals WHERE vote_id = v.id), 0),
                'votes_total', 
                  COALESCE((SELECT votes_for FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_for_count FROM public.vote_live_totals WHERE vote_id = v.id), 0) +
                  COALESCE((SELECT votes_against FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_against_count FROM public.vote_live_totals WHERE vote_id = v.id), 0) +
                  COALESCE((SELECT votes_abstain FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_abstain_count FROM public.vote_live_totals WHERE vote_id = v.id), 0)
              )
            )
          )
          FROM public.votes v
          WHERE v.kind = 'GA'
          AND v.meeting_id = p_meeting_id
          AND v.resolution_id = ai.resolution_id
          LIMIT 1
        )
        ELSE NULL
      END,
      'attachments', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', aa.id,
            'file_name', aa.file_name,
            'storage_path', aa.storage_path,
            'mime_type', aa.mime_type,
            'size_bytes', aa.size_bytes
          )
        )
        FROM public.meeting_agenda_attachments aa
        WHERE aa.agenda_item_id = ai.id
      )
    )
    ORDER BY ai.item_no
  ) INTO v_agenda
  FROM public.meeting_agenda_items ai
  WHERE ai.meeting_id = p_meeting_id;
  
  -- Build final snapshot
  SELECT jsonb_build_object(
    'meeting', jsonb_build_object(
      'id', v_meeting.id,
      'org_id', v_meeting.org_id,
      'title', v_meeting.title,
      'scheduled_at', v_meeting.scheduled_at,
      'location', v_meeting.location,
      'meeting_type', v_meeting.meeting_type,
      'status', v_meeting.status,
      'published_at', v_meeting.published_at,
      'notice_days', v_meeting.notice_days
    ),
    'attendance', v_attendance_summary,
    'quorum', v_quorum,
    'agenda', COALESCE(v_agenda, '[]'::jsonb),
    'generated_at', NOW()
  ) INTO v_snapshot;
  
  RETURN v_snapshot;
END;
$$;

COMMENT ON FUNCTION public.build_meeting_protocol_snapshot IS 'Surenka visą protokolo turinį iš gyvų DB duomenų';

-- ==================================================
-- B) preview_meeting_protocol
-- ==================================================

CREATE OR REPLACE FUNCTION public.preview_meeting_protocol(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  snapshot JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_snapshot JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' THEN
    RETURN QUERY SELECT false, 'NOT_GA_MEETING', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_meeting.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'FORBIDDEN', NULL::JSONB;
      RETURN;
    END IF;
  END IF;
  
  -- Build snapshot
  v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
  
  -- Check if snapshot build failed (e.g. QUORUM_FUNCTION_MISSING)
  IF v_snapshot ? 'error' THEN
    RETURN QUERY SELECT false, (v_snapshot->>'error')::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'OK_PREVIEW', v_snapshot;
END;
$$;

COMMENT ON FUNCTION public.preview_meeting_protocol IS 'Peržiūrėti protokolą (tik OWNER/BOARD, nekuria įrašo)';

-- ==================================================
-- C) finalize_meeting_protocol
-- ==================================================

CREATE OR REPLACE FUNCTION public.finalize_meeting_protocol(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  protocol_id UUID,
  version INT,
  protocol_number TEXT,
  snapshot_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_meeting RECORD;
  v_membership RECORD;
  v_snapshot JSONB;
  v_hash TEXT;
  v_version INT;
  v_protocol_number TEXT;
  v_new_protocol_id UUID;
  v_agenda_item RECORD;
  v_vote RECORD;
  v_apply_result RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if GA meeting
  IF v_meeting.meeting_type != 'GA' THEN
    RETURN QUERY SELECT false, 'NOT_GA_MEETING', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_meeting.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_meeting.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'FORBIDDEN', NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check if meeting_quorum_status function exists (required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'meeting_quorum_status'
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'QUORUM_FUNCTION_MISSING'::TEXT,
      NULL::UUID, 
      NULL::INT, 
      NULL::TEXT, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if apply_vote_outcome function exists (required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'apply_vote_outcome'
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'APPLY_VOTE_OUTCOME_FUNCTION_MISSING'::TEXT,
      NULL::UUID, 
      NULL::INT, 
      NULL::TEXT, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Validate: all GA votes for resolution items must be CLOSED
  -- AND apply outcome BEFORE building snapshot
  FOR v_agenda_item IN
    SELECT * FROM public.meeting_agenda_items
    WHERE meeting_id = p_meeting_id
    AND resolution_id IS NOT NULL
  LOOP
    -- Find GA vote by (meeting_id, resolution_id, kind='GA')
    SELECT * INTO v_vote
    FROM public.votes
    WHERE kind = 'GA'
    AND meeting_id = p_meeting_id
    AND resolution_id = v_agenda_item.resolution_id
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT 
        false, 
        ('VOTE_NOT_FOUND: item_no=' || v_agenda_item.item_no || ', resolution_id=' || v_agenda_item.resolution_id)::TEXT,
        NULL::UUID, 
        NULL::INT, 
        NULL::TEXT, 
        NULL::TEXT;
      RETURN;
    END IF;
    
    -- Require vote.status='CLOSED'
    IF v_vote.status != 'CLOSED' THEN
      RETURN QUERY SELECT 
        false, 
        ('VOTE_NOT_CLOSED: item_no=' || v_agenda_item.item_no || ', resolution_id=' || v_agenda_item.resolution_id)::TEXT,
        NULL::UUID, 
        NULL::INT, 
        NULL::TEXT, 
        NULL::TEXT;
      RETURN;
    END IF;
    
    -- MUST call apply_vote_outcome BEFORE building snapshot
    -- This ensures resolution status is updated (APPROVED/RECOMMENDED) and adopted_at/by are set
    SELECT * INTO v_apply_result
    FROM public.apply_vote_outcome(v_vote.id);
    
    -- Note: apply_vote_outcome may return ok=false if outcome already applied
    -- That's fine - we continue to build snapshot which will reflect current resolution status
  END LOOP;
  
  -- Build snapshot AFTER applying all vote outcomes
  -- Snapshot will reflect updated resolution status (APPROVED) and adopted_at/by
  v_snapshot := public.build_meeting_protocol_snapshot(p_meeting_id);
  
  -- Check if snapshot build failed (e.g. QUORUM_FUNCTION_MISSING)
  IF v_snapshot ? 'error' THEN
    RETURN QUERY SELECT 
      false, 
      (v_snapshot->>'error')::TEXT,
      NULL::UUID, 
      NULL::INT, 
      NULL::TEXT, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Calculate hash
  v_hash := encode(digest(v_snapshot::TEXT, 'sha256'), 'hex');
  
  -- Get next version
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.meeting_protocols
  WHERE meeting_id = p_meeting_id;
  
  -- Generate protocol number (simple: org_id prefix + version)
  -- You can customize this logic
  v_protocol_number := TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_version::TEXT, 4, '0');
  
  -- Create protocol
  INSERT INTO public.meeting_protocols (
    org_id,
    meeting_id,
    protocol_number,
    version,
    status,
    snapshot,
    snapshot_hash,
    created_by,
    finalized_by,
    finalized_at
  )
  VALUES (
    v_meeting.org_id,
    p_meeting_id,
    v_protocol_number,
    v_version,
    'FINAL',
    v_snapshot,
    v_hash,
    v_user_id,
    v_user_id,
    NOW()
  )
  RETURNING id INTO v_new_protocol_id;
  
  -- Optional: set meeting status to COMPLETED
  UPDATE public.meetings
  SET status = 'COMPLETED'
  WHERE id = p_meeting_id
  AND status IN ('PUBLISHED', 'DRAFT');
  
  RETURN QUERY SELECT 
    true,
    'PROTOCOL_FINALIZED',
    v_new_protocol_id,
    v_version,
    v_protocol_number,
    v_hash;
END;
$$;

COMMENT ON FUNCTION public.finalize_meeting_protocol IS 'Finalizuoti protokolą (tik OWNER/BOARD, reikalauja visų GA votes CLOSED)';

-- ==================================================
-- D) get_meeting_protocol
-- ==================================================

CREATE OR REPLACE FUNCTION public.get_meeting_protocol(
  p_protocol_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_protocol RECORD;
  v_user_id UUID;
  v_membership RECORD;
BEGIN
  -- Get current user (optional, for RLS check)
  v_user_id := auth.uid();
  
  -- Get protocol
  SELECT * INTO v_protocol
  FROM public.meeting_protocols
  WHERE id = p_protocol_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'PROTOCOL_NOT_FOUND');
  END IF;
  
  -- RLS check: Members can only see FINAL, OWNER/BOARD can see DRAFT/FINAL
  IF v_protocol.status = 'DRAFT' THEN
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('error', 'AUTH_REQUIRED');
    END IF;
    
    -- Check if user is OWNER or BOARD
    SELECT * INTO v_membership
    FROM public.memberships
    WHERE org_id = v_protocol.org_id
      AND user_id = v_user_id
      AND member_status = 'ACTIVE'
      AND role = 'OWNER'
    LIMIT 1;
    
    IF NOT FOUND THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.positions
        WHERE org_id = v_protocol.org_id
          AND user_id = v_user_id
          AND is_active = true
          AND title ILIKE '%BOARD%'
      ) THEN
        RETURN jsonb_build_object('error', 'FORBIDDEN');
      END IF;
    END IF;
  END IF;
  
  -- Return protocol with meta
  RETURN jsonb_build_object(
    'id', v_protocol.id,
    'org_id', v_protocol.org_id,
    'meeting_id', v_protocol.meeting_id,
    'protocol_number', v_protocol.protocol_number,
    'version', v_protocol.version,
    'status', v_protocol.status,
    'snapshot', v_protocol.snapshot,
    'snapshot_hash', v_protocol.snapshot_hash,
    'pdf_bucket', v_protocol.pdf_bucket,
    'pdf_path', v_protocol.pdf_path,
    'created_at', v_protocol.created_at,
    'finalized_at', v_protocol.finalized_at
  );
END;
$$;

COMMENT ON FUNCTION public.get_meeting_protocol IS 'Gauna protokolą (nariams tik FINAL, adminams DRAFT/FINAL)';
-- ===== END create_protocol_rpc_functions.sql =====

-- ===== BEGIN create_set_protocol_pdf_rpc.sql =====
-- ==================================================
-- SET PROTOCOL PDF RPC FUNCTION
-- ==================================================
-- Allows updating pdf_path for FINAL protocols (immutable otherwise)
-- ==================================================

CREATE OR REPLACE FUNCTION public.set_protocol_pdf(
  p_protocol_id UUID,
  p_bucket TEXT,
  p_path TEXT
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_protocol RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Get protocol
  SELECT * INTO v_protocol
  FROM public.meeting_protocols
  WHERE id = p_protocol_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PROTOCOL_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Only allow updating FINAL protocols (immutability: can't change snapshot, but can set PDF)
  IF v_protocol.status != 'FINAL' THEN
    RETURN QUERY SELECT false, 'PROTOCOL_NOT_FINAL';
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_protocol.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_protocol.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'FORBIDDEN';
      RETURN;
    END IF;
  END IF;
  
  -- Update only pdf_bucket and pdf_path (immutable fields remain unchanged)
  UPDATE public.meeting_protocols
  SET 
    pdf_bucket = p_bucket,
    pdf_path = p_path
  WHERE id = p_protocol_id;
  
  RETURN QUERY SELECT true, 'PDF_PATH_UPDATED';
END;
$$;

COMMENT ON FUNCTION public.set_protocol_pdf IS 'Atnaujina PDF path FINAL protokolui (tik OWNER/BOARD, tik pdf_bucket/pdf_path)';
-- ===== END create_set_protocol_pdf_rpc.sql =====

-- ===== BEGIN create_set_vote_live_totals.sql =====
-- ==================================================
-- CREATE/UPDATE set_vote_live_totals FUNCTION
-- ==================================================
-- Sets live voting totals for a GA vote
-- live_present_count is derived from meeting_attendance (not manually provided)
-- ==================================================

-- Create vote_live_totals table (stores live/in-person voting results)
CREATE TABLE IF NOT EXISTS public.vote_live_totals (
  vote_id UUID PRIMARY KEY REFERENCES public.votes(id) ON DELETE CASCADE,
  live_present_count INT NOT NULL DEFAULT 0,
  live_for_count INT NOT NULL DEFAULT 0,
  live_against_count INT NOT NULL DEFAULT 0,
  live_abstain_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vote_live_totals_vote_id ON public.vote_live_totals(vote_id);

ALTER TABLE public.vote_live_totals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vote_live_totals_select" ON public.vote_live_totals;
CREATE POLICY "vote_live_totals_select" ON public.vote_live_totals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.votes v
      JOIN public.meetings m ON m.id = v.meeting_id
      JOIN public.memberships mem ON mem.org_id = m.org_id
      WHERE v.id = vote_live_totals.vote_id
        AND mem.user_id = auth.uid()
        AND mem.member_status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "vote_live_totals_insert" ON public.vote_live_totals;
CREATE POLICY "vote_live_totals_insert" ON public.vote_live_totals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.votes v
      JOIN public.meetings m ON m.id = v.meeting_id
      JOIN public.memberships mem ON mem.org_id = m.org_id
      WHERE v.id = vote_live_totals.vote_id
        AND mem.user_id = auth.uid()
        AND mem.member_status = 'ACTIVE'
        AND mem.role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "vote_live_totals_update" ON public.vote_live_totals;
CREATE POLICY "vote_live_totals_update" ON public.vote_live_totals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.votes v
      JOIN public.meetings m ON m.id = v.meeting_id
      JOIN public.memberships mem ON mem.org_id = m.org_id
      WHERE v.id = vote_live_totals.vote_id
        AND mem.user_id = auth.uid()
        AND mem.member_status = 'ACTIVE'
        AND mem.role = 'OWNER'
    )
  );

COMMENT ON TABLE public.vote_live_totals IS 'Gyvo balsavimo (in-person) rezultatai';

CREATE OR REPLACE FUNCTION public.set_vote_live_totals(
  p_vote_id uuid,
  p_live_against_count int,
  p_live_abstain_count int
)
RETURNS TABLE(
  ok boolean,
  reason text,
  live_present_count int,
  live_for_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meeting_id uuid;
  v_computed_live_present_count int;
  v_computed_live_for_count int;
  v_vote_exists boolean;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, 0, 0;
    RETURN;
  END IF;

  -- Get vote and meeting_id
  SELECT meeting_id INTO v_meeting_id
  FROM public.votes
  WHERE id = p_vote_id
    AND kind = 'GA';

  IF v_meeting_id IS NULL THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::text, 0, 0;
    RETURN;
  END IF;

  -- Derive live_present_count from meeting_attendance
  -- This ensures remote voters are not double-counted (they're blocked from IN_PERSON registration)
  SELECT COUNT(*) INTO v_computed_live_present_count
  FROM public.meeting_attendance
  WHERE meeting_id = v_meeting_id
    AND present = true
    AND mode = 'IN_PERSON';

  -- Calculate live_for_count (must be >= 0)
  v_computed_live_for_count := v_computed_live_present_count - p_live_against_count - p_live_abstain_count;

  IF v_computed_live_for_count < 0 THEN
    RETURN QUERY SELECT 
      false, 
      'INVALID_TOTALS'::text,
      v_computed_live_present_count,
      v_computed_live_for_count;
    RETURN;
  END IF;

  -- Check if vote_live_totals table exists and insert/update
  -- Note: This assumes the table structure exists
  -- If table doesn't exist, this will fail and should be handled separately
  
  -- Try to insert/update (assuming table exists)
  INSERT INTO public.vote_live_totals (
    vote_id,
    live_present_count,
    live_for_count,
    live_against_count,
    live_abstain_count,
    updated_at
  ) VALUES (
    p_vote_id,
    v_computed_live_present_count,
    v_computed_live_for_count,
    p_live_against_count,
    p_live_abstain_count,
    NOW()
  )
  ON CONFLICT (vote_id)
  DO UPDATE SET
    live_present_count = v_computed_live_present_count,
    live_for_count = v_computed_live_for_count,
    live_against_count = p_live_against_count,
    live_abstain_count = p_live_abstain_count,
    updated_at = NOW();

  RETURN QUERY SELECT 
    true, 
    'OK'::text,
    v_computed_live_present_count,
    v_computed_live_for_count;
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist - return error
    RETURN QUERY SELECT false, 'TABLE_NOT_FOUND'::text, 0, 0;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'OPERATION_FAILED'::text, 0, 0;
END;
$$;

COMMENT ON FUNCTION public.set_vote_live_totals IS 
'Sets live voting totals for a GA vote. live_present_count is automatically derived from meeting_attendance (IN_PERSON present=true). Ensures remote voters are not double-counted.';
-- ===== END create_set_vote_live_totals.sql =====

-- ===== BEGIN create_simple_vote_module.sql =====
-- ==================================================
-- SIMPLE VOTE MODULIO SUKŪRIMAS
-- ==================================================
-- Sukuria simple vote lenteles, view, indeksus
-- ==================================================

-- ==================================================
-- 1. VOTE_CHOICE ENUM (jei neegzistuoja)
-- ==================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'vote_choice'
  ) THEN
    CREATE TYPE public.vote_choice AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');
    RAISE NOTICE 'Created vote_choice enum';
  ELSE
    RAISE NOTICE 'vote_choice enum already exists';
  END IF;
END $$;

-- ==================================================
-- 2. SIMPLE_VOTES LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.simple_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closes_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simple_votes_org ON public.simple_votes(org_id);
CREATE INDEX IF NOT EXISTS idx_simple_votes_org_status ON public.simple_votes(org_id, status);
CREATE INDEX IF NOT EXISTS idx_simple_votes_created_at ON public.simple_votes(created_at DESC);

COMMENT ON TABLE public.simple_votes IS 'Paprasti balsavimai (poll) be kvorumo ir susirinkimo';
COMMENT ON COLUMN public.simple_votes.status IS 'OPEN arba CLOSED';
COMMENT ON COLUMN public.simple_votes.closes_at IS 'Planuota uždarymo data (optional)';

-- ==================================================
-- 3. SIMPLE_VOTE_BALLOTS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.simple_vote_ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.simple_votes(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  choice public.vote_choice NOT NULL,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_simple_vote_ballot UNIQUE (vote_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_simple_vote_ballots_vote ON public.simple_vote_ballots(vote_id);
CREATE INDEX IF NOT EXISTS idx_simple_vote_ballots_membership ON public.simple_vote_ballots(membership_id);

COMMENT ON TABLE public.simple_vote_ballots IS 'Paprastų balsavimų balsai';
COMMENT ON COLUMN public.simple_vote_ballots.choice IS 'FOR, AGAINST, arba ABSTAIN';

-- ==================================================
-- 4. SIMPLE_VOTE_ATTACHMENTS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.simple_vote_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.simple_votes(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'vote-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simple_vote_attachments_vote ON public.simple_vote_attachments(vote_id);

COMMENT ON TABLE public.simple_vote_attachments IS 'Paprastų balsavimų priedai (failų metaduomenys)';
COMMENT ON COLUMN public.simple_vote_attachments.storage_path IS 'Supabase Storage path';

-- ==================================================
-- 5. SIMPLE_VOTE_TALLIES VIEW
-- ==================================================

CREATE OR REPLACE VIEW public.simple_vote_tallies AS
SELECT 
  sv.id as vote_id,
  COUNT(CASE WHEN svb.choice = 'FOR' THEN 1 END)::INT as votes_for,
  COUNT(CASE WHEN svb.choice = 'AGAINST' THEN 1 END)::INT as votes_against,
  COUNT(CASE WHEN svb.choice = 'ABSTAIN' THEN 1 END)::INT as votes_abstain,
  COUNT(svb.id)::INT as votes_total,
  COUNT(DISTINCT svb.membership_id)::INT as unique_voters
FROM public.simple_votes sv
LEFT JOIN public.simple_vote_ballots svb ON svb.vote_id = sv.id
GROUP BY sv.id;

COMMENT ON VIEW public.simple_vote_tallies IS 'Paprastų balsavimų suvestinė (UŽ/PRIEŠ/SUSILAIKĖ + kiek balsavo)';

GRANT SELECT ON public.simple_vote_tallies TO authenticated;

-- ==================================================
-- 6. ENABLE RLS
-- ==================================================

ALTER TABLE public.simple_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_vote_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_vote_attachments ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 
  '=== SIMPLE VOTE MODULIS SUKURTAS ===' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('simple_votes', 'simple_vote_ballots', 'simple_vote_attachments')) as tables_created,
  (SELECT COUNT(*) FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name = 'simple_vote_tallies') as views_created,
  (SELECT COUNT(*) FROM pg_type WHERE typname = 'vote_choice') as enum_created;
-- ===== END create_simple_vote_module.sql =====

-- ===== BEGIN create_simple_vote_rls_policies.sql =====
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
-- ===== END create_simple_vote_rls_policies.sql =====

-- ===== BEGIN create_simple_vote_rpc_functions.sql =====
-- ==================================================
-- SIMPLE VOTE MODULIO RPC FUNKCIJOS
-- ==================================================
-- Visos DB-centrinė logika
-- ==================================================

-- ==================================================
-- 1) can_cast_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.can_cast_simple_vote(
  p_vote_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_vote RECORD;
  v_membership RECORD;
  v_can_vote_result RECORD;
  v_can_vote_exists BOOLEAN;
BEGIN
  -- Check if vote exists and is OPEN
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND', jsonb_build_object('vote_id', p_vote_id);
    RETURN;
  END IF;
  
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_NOT_OPEN', 
      jsonb_build_object('vote_id', p_vote_id, 'status', v_vote.status);
    RETURN;
  END IF;
  
  -- Check if user has ACTIVE membership in the org
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = p_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'NOT_A_MEMBER', 
      jsonb_build_object('org_id', v_vote.org_id, 'user_id', p_user_id);
    RETURN;
  END IF;
  
  -- Check if can_vote function exists and call it
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'can_vote'
  ) INTO v_can_vote_exists;
  
  IF v_can_vote_exists THEN
    -- Call can_vote function (if it exists)
    SELECT * INTO v_can_vote_result
    FROM public.can_vote(v_vote.org_id, p_user_id);
    
    IF NOT v_can_vote_result.allowed THEN
      RETURN QUERY SELECT 
        false, 
        'CAN_VOTE_BLOCKED', 
        jsonb_build_object(
          'org_id', v_vote.org_id,
          'user_id', p_user_id,
          'can_vote_reason', v_can_vote_result.reason,
          'can_vote_details', v_can_vote_result.details
        );
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'OK', 
    jsonb_build_object('vote_id', p_vote_id, 'membership_id', v_membership.id);
END;
$$;

COMMENT ON FUNCTION public.can_cast_simple_vote IS 'Tikrina ar vartotojas gali balsuoti paprastame balsavime';

-- ==================================================
-- 2) cast_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.cast_simple_vote(
  p_vote_id UUID,
  p_choice public.vote_choice
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_can_vote_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED';
    RETURN;
  END IF;
  
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND';
    RETURN;
  END IF;
  
  -- Preflight check
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_simple_vote(p_vote_id, v_user_id);
  
  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false, v_can_vote_check.reason;
    RETURN;
  END IF;
  
  -- Get membership_id from can_vote_check details
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  -- Upsert ballot (INSERT ... ON CONFLICT UPDATE)
  INSERT INTO public.simple_vote_ballots (
    vote_id,
    membership_id,
    choice
  )
  VALUES (
    p_vote_id,
    v_membership.id,
    p_choice
  )
  ON CONFLICT (vote_id, membership_id)
  DO UPDATE SET
    choice = EXCLUDED.choice,
    cast_at = NOW();
  
  RETURN QUERY SELECT true, 'CAST';
END;
$$;

COMMENT ON FUNCTION public.cast_simple_vote IS 'Balsuoja paprastame balsavime (upsert)';

-- ==================================================
-- 3) close_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.close_simple_vote(
  p_vote_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  votes_for INT,
  votes_against INT,
  votes_abstain INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_tally RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND', NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if already closed
  IF v_vote.status = 'CLOSED' THEN
    RETURN QUERY SELECT false, 'VOTE_ALREADY_CLOSED', NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_vote.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::INT, NULL::INT, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Get tallies before closing
  SELECT * INTO v_tally
  FROM public.simple_vote_tallies
  WHERE vote_id = p_vote_id;
  
  -- Close vote
  UPDATE public.simple_votes
  SET 
    status = 'CLOSED',
    closed_at = NOW()
  WHERE id = p_vote_id;
  
  RETURN QUERY SELECT 
    true,
    'VOTE_CLOSED',
    COALESCE(v_tally.votes_for, 0),
    COALESCE(v_tally.votes_against, 0),
    COALESCE(v_tally.votes_abstain, 0);
END;
$$;

COMMENT ON FUNCTION public.close_simple_vote IS 'Uždaro paprastą balsavimą (tik OWNER/BOARD)';

-- ==================================================
-- 4) create_simple_vote
-- ==================================================

CREATE OR REPLACE FUNCTION public.create_simple_vote(
  p_org_id UUID,
  p_title TEXT,
  p_summary TEXT DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_closes_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  vote_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_membership RECORD;
  v_new_vote_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = p_org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = p_org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Create vote
  INSERT INTO public.simple_votes (
    org_id,
    title,
    summary,
    details,
    closes_at,
    created_by
  )
  VALUES (
    p_org_id,
    p_title,
    p_summary,
    p_details,
    p_closes_at,
    v_user_id
  )
  RETURNING id INTO v_new_vote_id;
  
  RETURN QUERY SELECT true, 'VOTE_CREATED', v_new_vote_id;
END;
$$;

COMMENT ON FUNCTION public.create_simple_vote IS 'Sukuria paprastą balsavimą (tik OWNER/BOARD)';

-- ==================================================
-- 5) attach_simple_vote_file_metadata
-- ==================================================

CREATE OR REPLACE FUNCTION public.attach_simple_vote_file_metadata(
  p_vote_id UUID,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT DEFAULT NULL,
  p_size_bytes BIGINT DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  attachment_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED', NULL::UUID;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.simple_votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_vote.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  
  -- Insert attachment metadata
  INSERT INTO public.simple_vote_attachments (
    vote_id,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    uploaded_by
  )
  VALUES (
    p_vote_id,
    p_storage_path,
    p_file_name,
    p_mime_type,
    p_size_bytes,
    v_user_id
  )
  RETURNING id INTO attachment_id;
  
  RETURN QUERY SELECT true, 'ATTACHMENT_ADDED', attachment_id;
END;
$$;

COMMENT ON FUNCTION public.attach_simple_vote_file_metadata IS 'Prideda priedo metaduomenis (tik OWNER/BOARD, failas jau uploadintas į Storage)';
-- ===== END create_simple_vote_rpc_functions.sql =====

-- ===== BEGIN create_vote_rpc_functions.sql =====
-- ==================================================
-- VOTE RPC FUNKCIJOS (rezoliucijų balsavimui)
-- ==================================================
-- Naudojama su `votes` lentele (ne simple_votes)
-- ==================================================

-- ==================================================
-- 1) can_cast_vote
-- ==================================================
-- Tikrina ar vartotojas gali balsuoti rezoliucijos balsavime
-- ==================================================

CREATE OR REPLACE FUNCTION public.can_cast_vote(
  p_vote_id UUID,
  p_user_id UUID,
  p_channel public.vote_channel DEFAULT 'IN_PERSON'
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_vote RECORD;
  v_membership RECORD;
  v_ballot_exists BOOLEAN;
  v_can_vote_result RECORD;
  v_can_vote_exists BOOLEAN;
BEGIN
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_NOT_FOUND'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id);
    RETURN;
  END IF;
  
  -- Check if vote is OPEN
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_CLOSED'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id, 'status', v_vote.status);
    RETURN;
  END IF;
  
  -- Check if vote has closed (closes_at)
  IF v_vote.closes_at IS NOT NULL AND now() >= v_vote.closes_at THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_CLOSED'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id, 'closes_at', v_vote.closes_at);
    RETURN;
  END IF;
  
  -- Check if user has ACTIVE membership in the org
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = p_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'NOT_A_MEMBER'::TEXT, 
      jsonb_build_object(
        'org_id', v_vote.org_id, 
        'user_id', p_user_id,
        'message', 'Vartotojas neturi aktyvios narystės organizacijoje'
      );
    RETURN;
  END IF;
  
  -- OWNER visada gali balsuoti - praleidžiame can_vote patikrą
  -- Check if can_vote function exists and call it (governance rules)
  -- BET: OWNER praleidžiame can_vote patikrą
  IF v_membership.role != 'OWNER' THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'can_vote'
    ) INTO v_can_vote_exists;
    
    IF v_can_vote_exists THEN
      -- Call can_vote function (if it exists) - checks governance rules
      SELECT * INTO v_can_vote_result
      FROM public.can_vote(v_vote.org_id, p_user_id);
      
      IF NOT v_can_vote_result.allowed THEN
        RETURN QUERY SELECT 
          false, 
          'CAN_VOTE_BLOCKED'::TEXT, 
          jsonb_build_object(
            'org_id', v_vote.org_id,
            'user_id', p_user_id,
            'can_vote_reason', v_can_vote_result.reason,
            'can_vote_details', v_can_vote_result.details
          );
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- Check if already voted
  SELECT EXISTS (
    SELECT 1 FROM public.vote_ballots
    WHERE vote_id = p_vote_id
      AND membership_id = v_membership.id
  ) INTO v_ballot_exists;
  
  IF v_ballot_exists THEN
    RETURN QUERY SELECT 
      false, 
      'ALREADY_VOTED'::TEXT, 
      jsonb_build_object('membership_id', v_membership.id);
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'OK'::TEXT, 
    jsonb_build_object(
      'vote_id', p_vote_id, 
      'membership_id', v_membership.id,
      'org_id', v_vote.org_id
    );
END;
$$;

COMMENT ON FUNCTION public.can_cast_vote IS 'Tikrina ar vartotojas gali balsuoti rezoliucijos balsavime. OWNER visada gali balsuoti (praleidžia can_vote patikrą). Patikrina narystę, governance taisykles ir ar jau balsavo.';

-- ==================================================
-- 2) cast_vote
-- ==================================================
-- Balsuoja rezoliucijos balsavime
-- ==================================================

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_vote_id UUID,
  p_choice public.vote_choice,
  p_channel public.vote_channel DEFAULT 'IN_PERSON'
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_can_vote_check RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Preflight check using can_cast_vote
  SELECT * INTO v_can_vote_check
  FROM public.can_cast_vote(p_vote_id, v_user_id, p_channel);
  
  IF NOT v_can_vote_check.allowed THEN
    RETURN QUERY SELECT false, v_can_vote_check.reason;
    RETURN;
  END IF;
  
  -- Get membership_id from can_vote_check details
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Insert ballot (upsert - allow changing vote)
  INSERT INTO public.vote_ballots (
    vote_id,
    membership_id,
    choice,
    channel
  )
  VALUES (
    p_vote_id,
    v_membership.id,
    p_choice,
    p_channel
  )
  ON CONFLICT (vote_id, membership_id)
  DO UPDATE SET
    choice = EXCLUDED.choice,
    channel = EXCLUDED.channel,
    cast_at = NOW();
  
  RETURN QUERY SELECT true, 'CAST'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.cast_vote IS 'Balsuoja rezoliucijos balsavime. Leidžia keisti balsą (upsert).';

-- ==================================================
-- 3) close_vote
-- ==================================================
-- Uždaro balsavimą (tik OWNER/BOARD)
-- ==================================================

CREATE OR REPLACE FUNCTION public.close_vote(
  p_vote_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  votes_for INT,
  votes_against INT,
  votes_abstain INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_membership RECORD;
  v_tally RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT, NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'VOTE_NOT_FOUND'::TEXT, NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if already closed
  IF v_vote.status = 'CLOSED' THEN
    RETURN QUERY SELECT false, 'VOTE_ALREADY_CLOSED'::TEXT, NULL::INT, NULL::INT, NULL::INT;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_vote.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT false, 'ACCESS_DENIED'::TEXT, NULL::INT, NULL::INT, NULL::INT;
      RETURN;
    END IF;
  END IF;
  
  -- Get tallies before closing
  SELECT * INTO v_tally
  FROM public.vote_tallies
  WHERE vote_id = p_vote_id;
  
  -- Close vote
  UPDATE public.votes
  SET 
    status = 'CLOSED',
    closed_at = NOW()
  WHERE id = p_vote_id;
  
  RETURN QUERY SELECT 
    true,
    'VOTE_CLOSED'::TEXT,
    COALESCE(v_tally.votes_for, 0),
    COALESCE(v_tally.votes_against, 0),
    COALESCE(v_tally.votes_abstain, 0);
END;
$$;

COMMENT ON FUNCTION public.close_vote IS 'Uždaro rezoliucijos balsavimą (tik OWNER/BOARD)';

-- ==================================================
-- 4) apply_vote_outcome
-- ==================================================
-- Taiko balsavimo rezultatą rezoliucijai
-- ==================================================

CREATE OR REPLACE FUNCTION public.apply_vote_outcome(
  p_vote_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  out_vote_id UUID,
  resolution_id UUID,
  outcome TEXT,
  votes_for INT,
  votes_against INT,
  votes_abstain INT,
  updated_rows INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote RECORD;
  v_tally RECORD;
  v_membership RECORD;
  v_outcome TEXT;
  v_updated_count INT := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 
      false, 'AUTH_REQUIRED'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
    RETURN;
  END IF;
  
  -- Get vote
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 'VOTE_NOT_FOUND'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
    RETURN;
  END IF;
  
  -- Check if vote is closed
  IF v_vote.status != 'CLOSED' THEN
    RETURN QUERY SELECT 
      false, 'VOTE_NOT_CLOSED'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
    RETURN;
  END IF;
  
  -- Check if user is OWNER or BOARD
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = v_user_id
    AND member_status = 'ACTIVE'
    AND role = 'OWNER'
  LIMIT 1;
  
  IF NOT FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.positions
      WHERE org_id = v_vote.org_id
        AND user_id = v_user_id
        AND is_active = true
        AND title ILIKE '%BOARD%'
    ) THEN
      RETURN QUERY SELECT 
        false, 'ACCESS_DENIED'::TEXT, 
        NULL::UUID, NULL::UUID, NULL::TEXT, 
        NULL::INT, NULL::INT, NULL::INT, 0;
      RETURN;
    END IF;
  END IF;
  
  -- Get tallies
  SELECT * INTO v_tally
  FROM public.vote_tallies
  WHERE vote_id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 'TALLY_NOT_FOUND'::TEXT, 
      NULL::UUID, NULL::UUID, NULL::TEXT, 
      NULL::INT, NULL::INT, NULL::INT, 0;
    RETURN;
  END IF;
  
  -- Determine outcome based on votes
  -- Simple majority: FOR > AGAINST
  IF v_tally.votes_for > v_tally.votes_against THEN
    v_outcome := 'APPROVED';
  ELSIF v_tally.votes_against > v_tally.votes_for THEN
    v_outcome := 'REJECTED';
  ELSE
    -- Tie or no votes
    v_outcome := 'REJECTED';
  END IF;
  
  -- Update resolution status
  UPDATE public.resolutions
  SET 
    status = v_outcome,
    adopted_at = CASE WHEN v_outcome = 'APPROVED' THEN NOW() ELSE NULL END,
    adopted_by = CASE WHEN v_outcome = 'APPROVED' THEN v_user_id ELSE NULL END
  WHERE id = v_vote.resolution_id
    AND status = 'PROPOSED'; -- Only update if still PROPOSED
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    true,
    'OUTCOME_APPLIED'::TEXT,
    p_vote_id,
    v_vote.resolution_id,
    v_outcome,
    v_tally.votes_for,
    v_tally.votes_against,
    v_tally.votes_abstain,
    v_updated_count;
END;
$$;

COMMENT ON FUNCTION public.apply_vote_outcome IS 'Taiko balsavimo rezultatą rezoliucijai (tik OWNER/BOARD). Atnaujina resolutions.status.';
-- ===== END create_vote_rpc_functions.sql =====

-- ===== BEGIN enforce_one_member_one_vote.sql =====
-- ==================================================
-- ENFORCE "ONE MEMBER = ONE VOTE" RULE
-- ==================================================
-- This migration enforces that each member can participate only once per meeting:
-- either REMOTE/WRITTEN voting OR IN_PERSON live attendance
-- ==================================================

-- ==================================================
-- 1. ADD UNIQUE CONSTRAINT TO meeting_attendance
-- ==================================================
-- Ensures one attendance record per meeting+membership

DO $$
BEGIN
  -- Check if unique constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_meeting_attendance_meeting_membership'
    AND conrelid = 'public.meeting_attendance'::regclass
  ) THEN
    -- Create unique index (concurrently if table is large)
    CREATE UNIQUE INDEX IF NOT EXISTS 
      idx_meeting_attendance_meeting_membership 
    ON public.meeting_attendance(meeting_id, membership_id);
    
    -- Add unique constraint using the index
    ALTER TABLE public.meeting_attendance
    ADD CONSTRAINT uq_meeting_attendance_meeting_membership
    UNIQUE USING INDEX idx_meeting_attendance_meeting_membership;
  END IF;
END $$;

-- ==================================================
-- 2. CREATE VIEW: meeting_remote_voters
-- ==================================================
-- Identifies members who voted remotely (WRITTEN/REMOTE) for a GA meeting

CREATE OR REPLACE VIEW public.meeting_remote_voters AS
SELECT DISTINCT
  v.meeting_id,
  vb.membership_id
FROM public.votes v
INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
WHERE v.kind = 'GA'
  AND v.meeting_id IS NOT NULL
  AND vb.channel IN ('WRITTEN', 'REMOTE');

COMMENT ON VIEW public.meeting_remote_voters IS 
'Identifies members who voted remotely (WRITTEN/REMOTE) for GA meetings. Used to prevent double-counting in attendance and quorum calculations.';

-- ==================================================
-- 3. RPC: can_register_in_person
-- ==================================================
-- Checks if a member can register as IN_PERSON for a meeting
-- Blocks registration if member already voted remotely

CREATE OR REPLACE FUNCTION public.can_register_in_person(
  p_meeting_id uuid,
  p_user_id uuid
)
RETURNS TABLE(
  allowed boolean,
  reason text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_membership_id uuid;
  v_meeting_org_id uuid;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text, jsonb_build_object() AS details;
    RETURN;
  END IF;

  -- Verify p_user_id matches auth.uid() (users can only check themselves)
  IF p_user_id != auth.uid() THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text, jsonb_build_object('message', 'Users can only check their own registration eligibility') AS details;
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND'::text, jsonb_build_object() AS details;
    RETURN;
  END IF;

  -- Find active membership
  SELECT id INTO v_membership_id
  FROM public.memberships
  WHERE user_id = p_user_id
    AND org_id = v_meeting_org_id
    AND status = 'ACTIVE';

  IF v_membership_id IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_A_MEMBER'::text, jsonb_build_object() AS details;
    RETURN;
  END IF;

  -- Check if member already voted remotely
  IF EXISTS (
    SELECT 1
    FROM public.meeting_remote_voters mrv
    WHERE mrv.meeting_id = p_meeting_id
      AND mrv.membership_id = v_membership_id
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'REMOTE_ALREADY_VOTED'::text,
      jsonb_build_object(
        'message', 'Member has already voted remotely for this meeting',
        'membership_id', v_membership_id
      ) AS details;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'OK'::text,
    jsonb_build_object('membership_id', v_membership_id) AS details;
END;
$$;

COMMENT ON FUNCTION public.can_register_in_person IS 
'Checks if a member can register as IN_PERSON for a meeting. Returns false if member already voted remotely (WRITTEN/REMOTE).';

-- ==================================================
-- 4. RPC: register_in_person_attendance
-- ==================================================
-- Registers a member as IN_PERSON for a meeting
-- Requires OWNER/BOARD role
-- Blocks if member already voted remotely

CREATE OR REPLACE FUNCTION public.register_in_person_attendance(
  p_meeting_id uuid,
  p_membership_id uuid
)
RETURNS TABLE(
  ok boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_meeting_org_id uuid;
  v_membership_org_id uuid;
  v_membership_status text;
  v_is_owner boolean;
  v_is_board boolean;
BEGIN
  -- Require authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Verify membership belongs to meeting org and is ACTIVE
  SELECT org_id, status INTO v_membership_org_id, v_membership_status
  FROM public.memberships
  WHERE id = p_membership_id;

  IF v_membership_org_id IS NULL OR v_membership_org_id != v_meeting_org_id THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_FOUND'::text;
    RETURN;
  END IF;

  IF v_membership_status != 'ACTIVE' THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_ACTIVE'::text;
    RETURN;
  END IF;

  -- Check if user is OWNER or BOARD
  SELECT 
    EXISTS(SELECT 1 FROM public.memberships WHERE user_id = v_user_id AND org_id = v_meeting_org_id AND role = 'OWNER'),
    EXISTS(
      SELECT 1 FROM public.positions p
      WHERE p.user_id = v_user_id
        AND p.org_id = v_meeting_org_id
        AND p.title = 'BOARD'
        AND p.is_active = true
    )
  INTO v_is_owner, v_is_board;

  IF NOT (v_is_owner OR v_is_board) THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text;
    RETURN;
  END IF;

  -- Check if member already voted remotely
  IF EXISTS (
    SELECT 1
    FROM public.meeting_remote_voters mrv
    WHERE mrv.meeting_id = p_meeting_id
      AND mrv.membership_id = p_membership_id
  ) THEN
    RETURN QUERY SELECT false, 'REMOTE_ALREADY_VOTED'::text;
    RETURN;
  END IF;

  -- Upsert attendance record
  INSERT INTO public.meeting_attendance (
    meeting_id,
    membership_id,
    present,
    mode,
    joined_at
  ) VALUES (
    p_meeting_id,
    p_membership_id,
    true,
    'IN_PERSON',
    NOW()
  )
  ON CONFLICT (meeting_id, membership_id)
  DO UPDATE SET
    present = true,
    mode = 'IN_PERSON',
    joined_at = COALESCE(meeting_attendance.joined_at, NOW()),
    updated_at = NOW();

  RETURN QUERY SELECT true, 'OK'::text;
END;
$$;

COMMENT ON FUNCTION public.register_in_person_attendance IS 
'Registers a member as IN_PERSON for a meeting. Requires OWNER/BOARD role. Blocks registration if member already voted remotely.';

-- ==================================================
-- 5. RPC: unregister_in_person_attendance
-- ==================================================
-- Unregisters a member from IN_PERSON attendance
-- Requires OWNER/BOARD role

CREATE OR REPLACE FUNCTION public.unregister_in_person_attendance(
  p_meeting_id uuid,
  p_membership_id uuid
)
RETURNS TABLE(
  ok boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_meeting_org_id uuid;
  v_membership_org_id uuid;
  v_is_owner boolean;
  v_is_board boolean;
BEGIN
  -- Require authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::text;
    RETURN;
  END IF;

  -- Get meeting org_id
  SELECT org_id INTO v_meeting_org_id
  FROM public.meetings
  WHERE id = p_meeting_id;

  IF v_meeting_org_id IS NULL THEN
    RETURN QUERY SELECT false, 'MEETING_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Verify membership belongs to meeting org
  SELECT org_id INTO v_membership_org_id
  FROM public.memberships
  WHERE id = p_membership_id;

  IF v_membership_org_id IS NULL OR v_membership_org_id != v_meeting_org_id THEN
    RETURN QUERY SELECT false, 'MEMBERSHIP_NOT_FOUND'::text;
    RETURN;
  END IF;

  -- Check if user is OWNER or BOARD
  SELECT 
    EXISTS(SELECT 1 FROM public.memberships WHERE user_id = v_user_id AND org_id = v_meeting_org_id AND role = 'OWNER'),
    EXISTS(
      SELECT 1 FROM public.positions p
      WHERE p.user_id = v_user_id
        AND p.org_id = v_meeting_org_id
        AND p.title = 'BOARD'
        AND p.is_active = true
    )
  INTO v_is_owner, v_is_board;

  IF NOT (v_is_owner OR v_is_board) THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::text;
    RETURN;
  END IF;

  -- Update attendance to present=false (or delete - we'll update for audit trail)
  UPDATE public.meeting_attendance
  SET present = false,
      updated_at = NOW()
  WHERE meeting_id = p_meeting_id
    AND membership_id = p_membership_id;

  -- If no row was updated, it's OK (maybe already unregistered)
  RETURN QUERY SELECT true, 'OK'::text;
END;
$$;

COMMENT ON FUNCTION public.unregister_in_person_attendance IS 
'Unregisters a member from IN_PERSON attendance for a meeting. Requires OWNER/BOARD role.';

-- ==================================================
-- 6. HELPER FUNCTION: get_meeting_unique_participants
-- ==================================================
-- Returns unique participant counts (remote + live, no double counting)

CREATE OR REPLACE FUNCTION public.get_meeting_unique_participants(
  p_meeting_id uuid
)
RETURNS TABLE(
  remote_participants int,
  live_participants int,
  total_participants int
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COALESCE((
      SELECT COUNT(DISTINCT membership_id)
      FROM public.meeting_remote_voters
      WHERE meeting_id = p_meeting_id
    ), 0) AS remote_participants,
    COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    ), 0) AS live_participants,
    COALESCE((
      SELECT COUNT(DISTINCT membership_id)
      FROM public.meeting_remote_voters
      WHERE meeting_id = p_meeting_id
    ), 0) + COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    ), 0) AS total_participants;
$$;

COMMENT ON FUNCTION public.get_meeting_unique_participants IS 
'Returns unique participant counts for a meeting: remote voters (WRITTEN/REMOTE) + live attendees (IN_PERSON). Ensures no double counting.';
-- ===== END enforce_one_member_one_vote.sql =====

-- ===== BEGIN fix_can_cast_vote_for_owner.sql =====
-- ==================================================
-- FIX: can_cast_vote - OWNER visada gali balsuoti
-- ==================================================
-- Problema: OWNER negali balsuoti, nes can_vote funkcija
-- gali blokuoti arba narystės patikra neveikia teisingai
-- ==================================================

CREATE OR REPLACE FUNCTION public.can_cast_vote(
  p_vote_id UUID,
  p_user_id UUID,
  p_channel public.vote_channel DEFAULT 'IN_PERSON'
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_vote RECORD;
  v_membership RECORD;
  v_ballot_exists BOOLEAN;
  v_can_vote_result RECORD;
  v_can_vote_exists BOOLEAN;
  v_is_owner BOOLEAN := false;
BEGIN
  -- Check if vote exists
  SELECT * INTO v_vote
  FROM public.votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_NOT_FOUND'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id);
    RETURN;
  END IF;
  
  -- Check if vote is OPEN
  IF v_vote.status != 'OPEN' THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_CLOSED'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id, 'status', v_vote.status);
    RETURN;
  END IF;
  
  -- Check if vote has closed (closes_at)
  IF v_vote.closes_at IS NOT NULL AND now() >= v_vote.closes_at THEN
    RETURN QUERY SELECT 
      false, 
      'VOTE_CLOSED'::TEXT, 
      jsonb_build_object('vote_id', p_vote_id, 'closes_at', v_vote.closes_at);
    RETURN;
  END IF;
  
  -- Check if user has ACTIVE membership in the org
  SELECT * INTO v_membership
  FROM public.memberships
  WHERE org_id = v_vote.org_id
    AND user_id = p_user_id
    AND member_status = 'ACTIVE'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      'NOT_A_MEMBER'::TEXT, 
      jsonb_build_object(
        'org_id', v_vote.org_id, 
        'user_id', p_user_id,
        'message', 'Vartotojas neturi aktyvios narystės organizacijoje'
      );
    RETURN;
  END IF;
  
  -- Check if user is OWNER - OWNER visada gali balsuoti
  IF v_membership.role = 'OWNER' THEN
    v_is_owner := true;
  END IF;
  
  -- Check if can_vote function exists and call it (governance rules)
  -- BET: OWNER praleidžiame can_vote patikrą
  IF NOT v_is_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'can_vote'
    ) INTO v_can_vote_exists;
    
    IF v_can_vote_exists THEN
      -- Call can_vote function (if it exists) - checks governance rules
      SELECT * INTO v_can_vote_result
      FROM public.can_vote(v_vote.org_id, p_user_id);
      
      IF NOT v_can_vote_result.allowed THEN
        RETURN QUERY SELECT 
          false, 
          'CAN_VOTE_BLOCKED'::TEXT, 
          jsonb_build_object(
            'org_id', v_vote.org_id,
            'user_id', p_user_id,
            'can_vote_reason', v_can_vote_result.reason,
            'can_vote_details', v_can_vote_result.details
          );
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- Check if already voted
  SELECT EXISTS (
    SELECT 1 FROM public.vote_ballots
    WHERE vote_id = p_vote_id
      AND membership_id = v_membership.id
  ) INTO v_ballot_exists;
  
  IF v_ballot_exists THEN
    RETURN QUERY SELECT 
      false, 
      'ALREADY_VOTED'::TEXT, 
      jsonb_build_object('membership_id', v_membership.id);
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'OK'::TEXT, 
    jsonb_build_object(
      'vote_id', p_vote_id, 
      'membership_id', v_membership.id,
      'org_id', v_vote.org_id,
      'is_owner', v_is_owner
    );
END;
$$;

COMMENT ON FUNCTION public.can_cast_vote IS 'Tikrina ar vartotojas gali balsuoti rezoliucijos balsavime. OWNER visada gali balsuoti (praleidžia can_vote patikrą).';
-- ===== END fix_can_cast_vote_for_owner.sql =====

-- ===== BEGIN fix_ruleset_versions_columns.sql =====
-- ==================================================
-- Fix ruleset_versions table columns
-- ==================================================
-- Adds missing columns to ruleset_versions if they don't exist
-- ==================================================

DO $$
BEGIN
  -- Add quorum_percentage column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'quorum_percentage'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN quorum_percentage INTEGER NULL;
    
    COMMENT ON COLUMN public.ruleset_versions.quorum_percentage IS 'Kvorumas procentais nuo ACTIVE narių';
  END IF;
  
  -- Add notice_period_days column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'notice_period_days'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN notice_period_days INTEGER NULL;
    
    COMMENT ON COLUMN public.ruleset_versions.notice_period_days IS 'Pranešimo laikotarpis dienomis';
  END IF;
  
  -- Add annual_fee column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'annual_fee'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN annual_fee NUMERIC(12,2) NULL;
    
    COMMENT ON COLUMN public.ruleset_versions.annual_fee IS 'Metinis nario mokestis';
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN status TEXT NULL;
    
    -- Add check constraint for valid statuses
    ALTER TABLE public.ruleset_versions
    ADD CONSTRAINT ruleset_versions_status_check 
    CHECK (status IS NULL OR status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'));
    
    COMMENT ON COLUMN public.ruleset_versions.status IS 'Ruleset versijos statusas: DRAFT, ACTIVE, ARCHIVED';
  END IF;
  
  -- Add org_id column if it doesn't exist (needed for query)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN org_id UUID NULL;
    
    -- Add foreign key if orgs table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'orgs'
    ) THEN
      ALTER TABLE public.ruleset_versions
      ADD CONSTRAINT ruleset_versions_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;
    END IF;
    
    COMMENT ON COLUMN public.ruleset_versions.org_id IS 'Organizacijos ID';
  END IF;
END $$;
-- ===== END fix_ruleset_versions_columns.sql =====

-- ===== BEGIN update_governance_questionnaire_v2.sql =====
-- ==================================================
-- VALDYMO NUSTATYMAI (Governance klausimynas) — V2
-- ==================================================
-- Visi "Taip/Ne" klausimai kaip radio (ne checkbox)
-- Skaičiai saugomi kaip JSON number (ne string)
-- Datos kaip date picker (ISO date)
-- Visur naudoti terminą "aktyvūs nariai (pagal aktyvių narių sąrašą)"
-- ==================================================
-- UPSERT pagal question_key (unikalus)
-- ==================================================

-- First, add 'date' type to question_type CHECK constraint
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'governance_questions_question_type_check'
    AND conrelid = 'public.governance_questions'::regclass
  ) THEN
    ALTER TABLE public.governance_questions 
    DROP CONSTRAINT governance_questions_question_type_check;
  END IF;
END $$;

-- Add the new constraint with 'date' type included
ALTER TABLE public.governance_questions
ADD CONSTRAINT governance_questions_question_type_check
CHECK (question_type IN ('radio', 'checkbox', 'text', 'number', 'date'));

-- ==================================================
-- NOW UPDATE QUESTIONS
-- ==================================================

-- ==================================================
-- SKYRIUS 1. Narystė ir rolės
-- ==================================================

-- 1. new_member_approval
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'new_member_approval',
  'Kaip tvirtinate naujų narių priėmimą į bendruomenę?',
  'radio',
  'Narystė ir rolės',
  10,
  true,
  true,
  '[
    {"label": "Automatiškai (be tvirtinimo)", "value": "auto"},
    {"label": "Tvirtina pirmininkas", "value": "chairman"},
    {"label": "Tvirtina valdyba", "value": "board"},
    {"label": "Tvirtina administratorius", "value": "admin"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 2. has_board (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'has_board',
  'Ar bendruomenėje sudaryta valdyba?',
  'radio',
  'Narystė ir rolės',
  20,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 3. has_auditor (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'has_auditor',
  'Ar bendruomenėje yra revizorius / auditorius?',
  'radio',
  'Narystė ir rolės',
  30,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 4. board_quorum_percentage (number, tik jei has_board = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'board_quorum_percentage',
  'Koks minimalus valdybos kvorumas sprendimams priimti? (%)',
  'number',
  'Narystė ir rolės',
  40,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 5. chairman_term_start_date (date)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'chairman_term_start_date',
  'Nuo kada prasidėjo (arba prasidės) dabartinio pirmininko kadencija?',
  'date',
  'Narystė ir rolės',
  50,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 6. chairman_term_duration_years (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'chairman_term_duration_years',
  'Kiek metų trunka pirmininko kadencija pagal įstatus?',
  'number',
  'Narystė ir rolės',
  60,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 7. council_elected_with_chairman (radio: Taip/Ne, tik jei has_board = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'council_elected_with_chairman',
  'Ar valdyba (taryba) renkama tai pačiai kadencijai kartu su pirmininku?',
  'radio',
  'Narystė ir rolės',
  70,
  false,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 2. Mokesčiai ir skolos
-- ==================================================

-- 8. track_fees (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'track_fees',
  'Ar platformoje vedate nario mokesčių apskaitą (įmokos / skolos)?',
  'radio',
  'Mokesčiai ir skolos',
  100,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 9. fee_deadline_days (number, tik jei track_fees = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'fee_deadline_days',
  'Po kiek dienų nuo nustatyto termino narys laikomas įsiskolinusiu? (d.)',
  'number',
  'Mokesčiai ir skolos',
  110,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 10. restrict_debtors (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'restrict_debtors',
  'Kaip elgtis, jei narys turi įsiskolinimą?',
  'radio',
  'Mokesčiai ir skolos',
  120,
  true,
  true,
  '[
    {"label": "Blokuoti balsavimą, kol skola nepadengta", "value": "block_vote"},
    {"label": "Leisti balsuoti, bet rodyti įspėjimą", "value": "warning_only"},
    {"label": "Netaikoma (skolos nenaudojamos kaip kriterijus)", "value": "not_applicable"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 3. Visuotinis susirinkimas (GA)
-- ==================================================

-- 11. meeting_notice_days (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_notice_days',
  'Minimalus pranešimo terminas iki visuotinio susirinkimo (dienomis).',
  'number',
  'Visuotinis susirinkimas (GA)',
  200,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 12. ga_quorum_percent (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_quorum_percent',
  'Koks visuotinio susirinkimo kvorumas? (%) Procentais nuo aktyvių narių (pagal aktyvių narių sąrašą).',
  'number',
  'Visuotinis susirinkimas (GA)',
  210,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 13. ga_repeat_meeting_allowed (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_meeting_allowed',
  'Jei pirmasis susirinkimas neįvyksta dėl kvorumo – ar leidžiamas pakartotinis susirinkimas?',
  'radio',
  'Visuotinis susirinkimas (GA)',
  220,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 14. ga_repeat_notice_days (number, tik jei ga_repeat_meeting_allowed = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_notice_days',
  'Pakartotinis susirinkimas: prieš kiek dienų jį reikia paskelbti? (d.)',
  'number',
  'Visuotinis susirinkimas (GA)',
  230,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 15. ga_repeat_quorum_percent (number, tik jei ga_repeat_meeting_allowed = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_quorum_percent',
  'Pakartotinis susirinkimas: koks kvorumas jam taikomas? (%) Procentais nuo aktyvių narių (pagal aktyvių narių sąrašą). Jei 0 – susirinkimas laikomas įvykusiu nepriklausomai nuo dalyvių skaičiaus.',
  'number',
  'Visuotinis susirinkimas (GA)',
  240,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 16. meeting_chair_is_org_chair (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_chair_is_org_chair',
  'Ar bendruomenės pirmininkas automatiškai yra susirinkimo pirmininkas (pagal įstatus)?',
  'radio',
  'Visuotinis susirinkimas (GA)',
  250,
  true,
  true,
  '[
    {"label": "Taip, automatiškai", "value": "yes_auto"},
    {"label": "Ne, renkamas susirinkimo metu", "value": "no_elected"},
    {"label": "Priklauso nuo situacijos (renkamas, jei pirmininkas nedalyvauja)", "value": "conditional"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 17. meeting_secretary_selection (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_secretary_selection',
  'Kaip paskiriamas susirinkimo sekretorius?',
  'radio',
  'Visuotinis susirinkimas (GA)',
  260,
  true,
  true,
  '[
    {"label": "Renkamas susirinkimo metu balsavimu", "value": "elected"},
    {"label": "Paskiria susirinkimo pirmininkas", "value": "appointed_by_chair"},
    {"label": "Paskiriamas iš anksto (nurodomas darbotvarkėje)", "value": "preassigned"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 4. Balsavimo kanalai (GA)
-- ==================================================

-- 18. early_voting (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'early_voting',
  'Ar leidžiamas išankstinis balsavimas iki susirinkimo (raštu / nuotoliu)?',
  'radio',
  'Balsavimo kanalai (GA)',
  300,
  true,
  true,
  '[
    {"label": "Neleidžiamas", "value": "not_allowed"},
    {"label": "Leidžiamas tik raštu", "value": "written_only"},
    {"label": "Leidžiamas tik nuotoliu", "value": "remote_only"},
    {"label": "Leidžiamas ir raštu, ir nuotoliu", "value": "written_and_remote"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 19. remote_vote_freeze_hours (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'remote_vote_freeze_hours',
  'Išankstinio balsavimo užšaldymas: kiek valandų iki susirinkimo uždaromas balsavimas? (val.)',
  'number',
  'Balsavimo kanalai (GA)',
  310,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 20. one_member_one_vote (radio: Taip - fiksuotas)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'one_member_one_vote',
  'Ar taikote taisyklę „vienas narys = vienas balsas“ (jei balsavo nuotoliu/raštu – negali registruotis gyvai)?',
  'radio',
  'Balsavimo kanalai (GA)',
  320,
  true,
  true,
  '[
    {"label": "Taip (visada taikoma)", "value": "always"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 21. live_voting_capture_mode (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'live_voting_capture_mode',
  'Kaip sistemoje fiksuojami gyvo balsavimo rezultatai?',
  'radio',
  'Balsavimo kanalai (GA)',
  330,
  true,
  true,
  '[
    {"label": "Agreguotai (suvedami PRIEŠ ir SUSILAIKĖ; UŽ apskaičiuojama)", "value": "aggregate"},
    {"label": "Individualiai (kiekvienas narys balsuoja savo paskyroje)", "value": "per_member"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 5. Sprendimų priėmimas
-- ==================================================

-- 22. vote_majority_rule_default (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'vote_majority_rule_default',
  'Kokia dauguma taikoma tipiniams sprendimams (jei įstatai nenurodo kitaip)?',
  'radio',
  'Sprendimų priėmimas',
  400,
  true,
  true,
  '[
    {"label": "Paprasta balsų dauguma (UŽ > PRIEŠ)", "value": "simple_majority"},
    {"label": "Kvalifikuota 2/3 dauguma", "value": "two_thirds"},
    {"label": "Kvalifikuota 3/4 dauguma", "value": "three_quarters"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 23. abstain_handling (radio)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'abstain_handling',
  'Kaip traktuojami SUSILAIKĘ balsai priimant sprendimą?',
  'radio',
  'Sprendimų priėmimas',
  410,
  true,
  true,
  '[
    {"label": "Skaičiuojami tik UŽ ir PRIEŠ (SUSILAIKĘ neįtakoja daugumos)", "value": "exclude_from_denominator"},
    {"label": "SUSILAIKĘ skaičiuojami kaip dalyvavimas, bet ne kaip UŽ/PRIEŠ", "value": "count_participation_only"},
    {"label": "SUSILAIKĘ traktuojami kaip PRIEŠ", "value": "treat_as_against"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 6. Viešinimas ir pranešimai
-- ==================================================

-- 24. agenda_public_summary (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'agenda_public_summary',
  'Ar darbotvarkės santrauka turi būti vieša bendruomenės puslapyje? (pavadinimai + trumpi aprašymai)',
  'radio',
  'Viešinimas ir pranešimai',
  500,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 25. send_agenda_email_notifications (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'send_agenda_email_notifications',
  'Ar siųsti el. laiškus aktyviems nariams (pagal aktyvių narių sąrašą) paskelbus susirinkimą ir darbotvarkę?',
  'radio',
  'Viešinimas ir pranešimai',
  510,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 26. protocol_signed_required (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'protocol_signed_required',
  'Ar susirinkimą laikyti pilnai užbaigtu tik įkėlus pasirašytą (skenuotą) protokolo PDF?',
  'radio',
  'Viešinimas ir pranešimai',
  520,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 7. Idėjos ir projektai
-- ==================================================

-- 27. idea_vote_duration_days (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_duration_days',
  'Kiek dienų trunka idėjos balsavimas?',
  'number',
  'Idėjos ir projektai',
  600,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 28. idea_vote_min_participation_percent (number)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_min_participation_percent',
  'Kiek procentų aktyvių narių (pagal aktyvių narių sąrašą) turi sudalyvauti idėjos balsavime, kad jis būtų laikomas įvykusiu? (%)',
  'number',
  'Idėjos ir projektai',
  610,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 29. idea_public_default (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_public_default',
  'Ar naujos idėjos pagal nutylėjimą turi būti viešinamos bendruomenės puslapyje?',
  'radio',
  'Idėjos ir projektai',
  620,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 30. idea_auto_create_project_on_pass (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_auto_create_project_on_pass',
  'Ar patvirtinus idėją automatiškai sukurti projektą (su biudžetu)?',
  'radio',
  'Idėjos ir projektai',
  630,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 31. project_support_money_enabled (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_money_enabled',
  'Ar projekte leisti piniginę paramą (aukoti EUR)?',
  'radio',
  'Idėjos ir projektai',
  640,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 32. project_support_in_kind_enabled (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_in_kind_enabled',
  'Ar projekte leisti daiktinę paramą (mediena, dažai, tvirtinimo detalės ir pan.)?',
  'radio',
  'Idėjos ir projektai',
  650,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 33. project_support_work_enabled (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_work_enabled',
  'Ar projekte leisti siūlyti fizinę pagalbą (darbo valandos, transportas ir pan.)?',
  'radio',
  'Idėjos ir projektai',
  660,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 34. project_support_live_visibility (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_live_visibility',
  'Ar projekto paramos suvestinė (aukos/pasiūlymai) turi būti rodoma realiu laiku nariams?',
  'radio',
  'Idėjos ir projektai',
  670,
  true,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SKYRIUS 8. Finansų kontrolė
-- ==================================================

-- 35. expense_approval_required (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'expense_approval_required',
  'Ar reikalingas papildomas tvirtinimas išlaidoms (pvz., valdybos ar pirmininko)?',
  'radio',
  'Finansų kontrolė',
  700,
  false,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 36. expense_approval_threshold (number, tik jei expense_approval_required = yes)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'expense_approval_threshold',
  'Nuo kokios sumos (EUR) reikalingas papildomas išlaidų tvirtinimas?',
  'number',
  'Finansų kontrolė',
  710,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 37. is_social_business (radio: Taip/Ne)
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'is_social_business',
  'Ar bendruomenė vykdo socialinio verslo veiklą (papildomi finansų/ataskaitų reikalavimai)?',
  'radio',
  'Finansų kontrolė',
  720,
  false,
  true,
  '[
    {"label": "Taip", "value": "yes"},
    {"label": "Ne", "value": "no"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- CREATE NEW SCHEMA VERSION AND MARK ORGS AS NEEDS_UPDATE
-- ==================================================
-- After updating questions, create a new schema version
-- This will automatically mark all organizations as NEEDS_UPDATE
-- ==================================================

-- Create new schema version (this will mark all orgs as NEEDS_UPDATE)
DO $$
DECLARE
  v_result RECORD;
BEGIN
  -- Check if create_schema_version function exists
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'create_schema_version'
  ) THEN
    -- Create new schema version
    SELECT * INTO v_result
    FROM public.create_schema_version(
      'Atnaujintas governance klausimynas V2: visi Taip/Ne kaip radio, pridėti pirmininko kadencijos klausimai, datos tipas'
    );
    
    -- Log the result (optional, for debugging)
    RAISE NOTICE 'Schema version created: % (reason: %)', v_result.version_no, v_result.reason;
  ELSE
    RAISE WARNING 'create_schema_version function does not exist. Organizations will not be automatically marked as NEEDS_UPDATE.';
  END IF;
END $$;
-- ===== END update_governance_questionnaire_v2.sql =====

-- ===== BEGIN update_onboarding_questionnaire.sql =====
-- ==================================================
-- Atnaujintas bendruomenės registracijos / governance onboarding klausimynas
-- ==================================================
-- Pagal GA (susirinkimų) srautą, hibridinį balsavimą, 1 narys = 1 balsas,
-- idėja→projektas→parama modulį ir viešinimą.
-- ==================================================
-- UPSERT pagal question_key (unikalus)
-- Jei jau egzistuoja - UPDATE
-- Jei neegzistuoja - INSERT
-- ==================================================

-- ==================================================
-- NARYSTĖ IR ROLĖS
-- ==================================================

-- 1. new_member_approval
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'new_member_approval',
  'Kaip tvirtinate naujų narių priėmimą į bendruomenę?',
  'radio',
  'Narystė ir rolės',
  10,
  true,
  true,
  '[
    {"label": "Automatiškai (be tvirtinimo)", "value": "auto"},
    {"label": "Pirmininkas tvirtina", "value": "chairman"},
    {"label": "Valdyba tvirtina", "value": "board"},
    {"label": "Administratorius tvirtina", "value": "admin"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 2. has_board
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'has_board',
  'Ar bendruomenėje yra valdyba?',
  'checkbox',
  'Narystė ir rolės',
  20,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 3. has_auditor
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'has_auditor',
  'Ar bendruomenėje yra revizorius / auditorius?',
  'checkbox',
  'Narystė ir rolės',
  30,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 4. board_quorum_percentage
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'board_quorum_percentage',
  'Jei yra valdyba: koks minimalus valdybos kvorumas sprendimams? (procentais nuo valdybos narių)',
  'number',
  'Narystė ir rolės',
  40,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- MOKESČIAI IR SKOLOS
-- ==================================================

-- 5. track_fees
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'track_fees',
  'Ar platformoje vedate nario mokesčių apskaitą (įmokos / skolos)?',
  'checkbox',
  'Mokesčiai ir skolos',
  100,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 6. fee_deadline_days
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'fee_deadline_days',
  'Per kiek dienų nuo termino narys laikomas nesumokėjusiu (skolininku)?',
  'number',
  'Mokesčiai ir skolos',
  110,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 7. restrict_debtors
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'restrict_debtors',
  'Kaip elgtis, jei narys turi įsiskolinimą?',
  'radio',
  'Mokesčiai ir skolos',
  120,
  true,
  true,
  '[
    {"label": "Blokuoti balsavimą (kol skola nepadengta)", "value": "block_vote"},
    {"label": "Tik įspėti (balsuoti gali)", "value": "warning_only"},
    {"label": "Netinka / nenaudojame skolų kriterijaus", "value": "not_applicable"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- GA SUSIRINKIMAI
-- ==================================================

-- 8. meeting_notice_days
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_notice_days',
  'Prieš kiek dienų mažiausiai privaloma paskelbti visuotinį susirinkimą? (d.)',
  'number',
  'GA susirinkimai',
  200,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 9. ga_quorum_percent
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_quorum_percent',
  'Koks visuotinio susirinkimo kvorumas? (procentais nuo ACTIVE narių)',
  'number',
  'GA susirinkimai',
  210,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 10. ga_repeat_meeting_allowed
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_meeting_allowed',
  'Jei pirmas susirinkimas neįvyksta dėl kvorumo – ar leidžiamas pakartotinis susirinkimas?',
  'checkbox',
  'GA susirinkimai',
  220,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 11. ga_repeat_notice_days
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_notice_days',
  'Jei leidžiamas pakartotinis susirinkimas: prieš kiek dienų jį reikia paskelbti? (d.)',
  'number',
  'GA susirinkimai',
  230,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 12. ga_repeat_quorum_percent
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'ga_repeat_quorum_percent',
  'Jei leidžiamas pakartotinis susirinkimas: koks kvorumas jam taikomas? (procentais nuo ACTIVE narių; jei 0 – reiškia ''įvyksta nepriklausomai nuo dalyvių skaičiaus'')',
  'number',
  'GA susirinkimai',
  240,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 13. meeting_chair_is_org_chair
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_chair_is_org_chair',
  'Ar bendruomenės pirmininkas automatiškai yra susirinkimo pirmininkas (pagal įstatus)?',
  'radio',
  'GA susirinkimai',
  260,
  true,
  true,
  '[
    {"label": "Taip (automatiškai)", "value": "yes_auto"},
    {"label": "Ne (renkamas susirinkimo metu)", "value": "no_elected"},
    {"label": "Priklauso nuo situacijos (renkamas, jei pirmininkas nedalyvauja)", "value": "conditional"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 14. meeting_secretary_selection
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'meeting_secretary_selection',
  'Kaip paskiriamas susirinkimo sekretorius?',
  'radio',
  'GA susirinkimai',
  270,
  true,
  true,
  '[
    {"label": "Renkamas susirinkimo metu balsavimu", "value": "elected"},
    {"label": "Paskiria susirinkimo pirmininkas", "value": "appointed_by_chair"},
    {"label": "Paskiriamas iš anksto (nurodomas darbotvarkėje)", "value": "preassigned"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- BALSAVIMO KANALAI
-- ==================================================

-- 15. early_voting
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'early_voting',
  'Ar leidžiamas išankstinis balsavimas iki susirinkimo (raštu / nuotoliu)?',
  'radio',
  'Balsavimo kanalai',
  300,
  true,
  true,
  '[
    {"label": "Neleidžiamas", "value": "not_allowed"},
    {"label": "Leidžiamas tik raštu", "value": "written_only"},
    {"label": "Leidžiamas tik nuotoliu", "value": "remote_only"},
    {"label": "Leidžiamas ir raštu, ir nuotoliu", "value": "written_and_remote"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 16. remote_vote_freeze_hours
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'remote_vote_freeze_hours',
  'Kiek valandų iki susirinkimo turi būti uždaromas išankstinis (raštu/nuotoliu) balsavimas? (val.)',
  'number',
  'Balsavimo kanalai',
  310,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 17. one_member_one_vote
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'one_member_one_vote',
  'Taisyklė: vienas narys turi tik vieną balsą; jei balsavo nuotoliu/raštu – negali registruotis gyvai (dvigubas dalyvavimas draudžiamas).',
  'radio',
  'Balsavimo kanalai',
  320,
  true,
  true,
  '[
    {"label": "Taip (visada taikoma)", "value": "always"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 18. live_voting_capture_mode
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'live_voting_capture_mode',
  'Kaip fiksuojami gyvo balsavimo rezultatai sistemoje?',
  'radio',
  'Balsavimo kanalai',
  330,
  true,
  true,
  '[
    {"label": "Agreguotai (sekretorius suveda PRIEŠ ir SUSILAIKĖ; UŽ apskaičiuojama)", "value": "aggregate"},
    {"label": "Individualiai (kiekvienas narys balsuoja savo paskyroje)", "value": "per_member"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- SPRENDIMŲ PRIĖMIMAS
-- ==================================================

-- 19. vote_majority_rule_default
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'vote_majority_rule_default',
  'Kokia dauguma taikoma tipiniams sprendimams? (jei įstatai nenurodo kitaip)',
  'radio',
  'Sprendimų priėmimas',
  400,
  true,
  true,
  '[
    {"label": "Paprasta balsų dauguma (UŽ > PRIEŠ)", "value": "simple_majority"},
    {"label": "Kvalifikuota 2/3 dauguma", "value": "two_thirds"},
    {"label": "Kvalifikuota 3/4 dauguma", "value": "three_quarters"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 20. abstain_handling
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'abstain_handling',
  'Kaip traktuojami SUSILAIKĘ balsai priimant sprendimą?',
  'radio',
  'Sprendimų priėmimas',
  410,
  true,
  true,
  '[
    {"label": "Neįskaičiuojami į daugumos skaičiavimą (tik UŽ ir PRIEŠ)", "value": "exclude_from_denominator"},
    {"label": "Įskaičiuojami kaip dalyvavimas, bet ne UŽ/PRIEŠ", "value": "count_participation_only"},
    {"label": "Traktuojami kaip PRIEŠ", "value": "treat_as_against"}
  ]'::jsonb
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- VIEŠINIMAS IR PRANEŠIMAI
-- ==================================================

-- 21. agenda_public_summary
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'agenda_public_summary',
  'Ar darbotvarkės santrauka turi būti vieša bendruomenės puslapyje (pavadinimai + trumpi aprašymai)?',
  'checkbox',
  'Viešinimas ir pranešimai',
  500,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 22. send_agenda_email_notifications
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'send_agenda_email_notifications',
  'Ar siųsti el. laiškus ACTIVE nariams paskelbus darbotvarkę / susirinkimą?',
  'checkbox',
  'Viešinimas ir pranešimai',
  510,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 23. protocol_signed_required
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'protocol_signed_required',
  'Ar susirinkimą laikyti pilnai užbaigtu tik įkėlus pasirašyto (skenuoto) protokolo PDF?',
  'checkbox',
  'Viešinimas ir pranešimai',
  520,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- IDĖJOS IR PROJEKTAI
-- ==================================================

-- 24. idea_vote_duration_days
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_duration_days',
  'Kiek dienų trunka idėjos balsavimas (Strategija → Idėjos)?',
  'number',
  'Idėjos ir projektai',
  600,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 25. idea_vote_min_participation_percent
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_vote_min_participation_percent',
  'Kiek procentų ACTIVE narių turi sudalyvauti idėjos balsavime, kad jis būtų laikomas įvykusiu? (%)',
  'number',
  'Idėjos ir projektai',
  610,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 26. idea_public_default
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_public_default',
  'Ar naujos idėjos pagal nutylėjimą turi būti viešinamos bendruomenės puslapyje?',
  'checkbox',
  'Idėjos ir projektai',
  620,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 27. idea_auto_create_project_on_pass
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'idea_auto_create_project_on_pass',
  'Ar patvirtinus idėją automatiškai kurti projektą (su biudžetu)?',
  'checkbox',
  'Idėjos ir projektai',
  630,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 28. project_support_money_enabled
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_money_enabled',
  'Ar projekte leisti piniginę paramą (aukoti EUR)?',
  'checkbox',
  'Idėjos ir projektai',
  640,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 29. project_support_in_kind_enabled
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_in_kind_enabled',
  'Ar projekte leisti daiktinę paramą (mediena, dažai, tvirtinimo detalės ir pan.)?',
  'checkbox',
  'Idėjos ir projektai',
  650,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 30. project_support_work_enabled
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_work_enabled',
  'Ar projekte leisti siūlyti fizinę pagalbą (darbo valandos, transportas ir pan.)?',
  'checkbox',
  'Idėjos ir projektai',
  660,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 31. project_support_live_visibility
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'project_support_live_visibility',
  'Ar projekto paramos suvestinė (aukos/pasiūlymai) turi būti rodoma gyvai nariams?',
  'checkbox',
  'Idėjos ir projektai',
  670,
  true,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- FINANSŲ KONTROLĖ
-- ==================================================

-- 32. expense_approval_required
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'expense_approval_required',
  'Ar reikalingas papildomas tvirtinimas išlaidoms (pvz. valdybos/pirmininko)?',
  'checkbox',
  'Finansų kontrolė',
  700,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 33. expense_approval_threshold
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'expense_approval_threshold',
  'Nuo kokios sumos (EUR) reikalingas papildomas išlaidų tvirtinimas?',
  'number',
  'Finansų kontrolė',
  710,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- 34. is_social_business
INSERT INTO public.governance_questions (
  question_key,
  question_text,
  question_type,
  section,
  section_order,
  is_required,
  is_active,
  options
) VALUES (
  'is_social_business',
  'Ar bendruomenė vykdo socialinio verslo veiklą (papildomi finansų/ataskaitų reikalavimai)?',
  'checkbox',
  'Finansų kontrolė',
  720,
  false,
  true,
  NULL
) ON CONFLICT (question_key) DO UPDATE
SET question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options;

-- ==================================================
-- PASTABOS
-- ==================================================
-- Visi klausimai yra UPSERT pagal question_key
-- Radio tipo klausimams options yra JSONB masyvas su label/value
-- Checkbox ir number tipo klausimams options yra NULL
-- ==================================================
-- ===== END update_onboarding_questionnaire.sql =====

-- ===== BEGIN update_resolution_to_proposed.sql =====
-- ==================================================
-- UPDATE RESOLUTION TO PROPOSED
-- ==================================================
-- Updates resolution status from DRAFT to PROPOSED
-- Handles updated_at column if it exists
-- ==================================================

-- Update resolution to PROPOSED
UPDATE public.resolutions
SET
  status = 'PROPOSED'
WHERE id = '9750aca7-513f-4b1a-a349-769c50d08c05'
RETURNING 
  id, 
  status, 
  visibility,
  created_at;

-- If updated_at column exists, you can also update it:
-- UPDATE public.resolutions
-- SET
--   status = 'PROPOSED',
--   updated_at = now()
-- WHERE id = '9750aca7-513f-4b1a-a349-769c50d08c05'
-- RETURNING id, status, visibility, updated_at;
-- ===== END update_resolution_to_proposed.sql =====
