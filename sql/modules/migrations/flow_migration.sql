-- Flow migration (registration + governance + voting)
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
  SELECT COALESCE(MAX(gsv.version_no), 0) + 1 INTO v_new_version
  FROM public.governance_schema_versions gsv;
  
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

-- ===== BEGIN create_set_vote_live_totals.sql =====
-- ==================================================
-- CREATE/UPDATE set_vote_live_totals FUNCTION
-- ==================================================
-- Sets live voting totals for a GA vote
-- live_present_count is derived from meeting_attendance (not manually provided)
-- ==================================================

-- Note: This assumes vote_live_totals table exists
-- If it doesn't exist, it should be created first

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
  AND status = 'DRAFT'
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
--   AND status = 'DRAFT'
  AND status = 'DRAFT'
-- RETURNING id, status, visibility, updated_at;

-- ===== END update_resolution_to_proposed.sql =====

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
