-- Board Onboarding Questions and Assignments
-- This migration adds governance questions for chairman/board term management
-- and creates the board_member_assignments table for tracking board composition
-- 
-- Idempotent: uses INSERT ... ON CONFLICT and CREATE TABLE IF NOT EXISTS

-- ============================================================================
-- PART 1: New Governance Questions for Term Management
-- ============================================================================

DO $$
BEGIN
  -- Question 1: Chairman term start date (REQUIRED)
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options,
    depends_on,
    depends_value,
    validation_rules
  ) VALUES (
    'chairman_term_start',
    'Kada prasidėjo pirmininko kadencija?',
    'date',
    'Valdymo organai',
    10,
    true,
    true,
    NULL,
    NULL,
    NULL,
    '{"required": true}'::jsonb
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options,
    depends_on = EXCLUDED.depends_on,
    depends_value = EXCLUDED.depends_value,
    validation_rules = EXCLUDED.validation_rules;

  -- Question 2: Chairman term duration in years (REQUIRED)
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options,
    depends_on,
    depends_value,
    validation_rules
  ) VALUES (
    'chairman_term_years',
    'Kiek metų trunka pirmininko kadencija pagal įstatus?',
    'number',
    'Valdymo organai',
    20,
    true,
    true,
    NULL,
    NULL,
    NULL,
    '{"min": 1, "max": 10, "required": true}'::jsonb
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options,
    depends_on = EXCLUDED.depends_on,
    depends_value = EXCLUDED.depends_value,
    validation_rules = EXCLUDED.validation_rules;

  -- Question 3: What governing body type does the organization have?
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options,
    depends_on,
    depends_value,
    validation_rules
  ) VALUES (
    'governing_body_type',
    'Koks kolegialus valdymo organas yra numatytas įstatuose?',
    'radio',
    'Valdymo organai',
    25,
    true,
    true,
    '[
      {"value": "valdyba", "label": "Valdyba"},
      {"value": "taryba", "label": "Taryba"},
      {"value": "valdyba_ir_taryba", "label": "Valdyba ir Taryba"},
      {"value": "nera", "label": "Nėra kolegialaus valdymo organo"}
    ]'::jsonb,
    NULL,
    NULL,
    '{"required": true}'::jsonb
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options,
    depends_on = EXCLUDED.depends_on,
    depends_value = EXCLUDED.depends_value,
    validation_rules = EXCLUDED.validation_rules;

  -- Question 4: Does board term match chairman term? (only if governing body exists)
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options,
    depends_on,
    depends_value,
    validation_rules
  ) VALUES (
    'board_term_same_as_chairman',
    'Ar valdybos/tarybos kadencija sutampa su pirmininko kadencija?',
    'checkbox',
    'Valdymo organai',
    30,
    false,
    true,
    NULL,
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options,
    depends_on = EXCLUDED.depends_on,
    depends_value = EXCLUDED.depends_value,
    validation_rules = EXCLUDED.validation_rules;

  -- Question 4: Board term start date (only if board_term_same_as_chairman is false)
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options,
    depends_on,
    depends_value,
    validation_rules
  ) VALUES (
    'board_term_start',
    'Kada prasidėjo valdybos/tarybos kadencija?',
    'date',
    'Valdymo organai',
    40,
    true,
    true,
    NULL,
    'board_term_same_as_chairman',
    'false',
    '{"required": true}'::jsonb
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options,
    depends_on = EXCLUDED.depends_on,
    depends_value = EXCLUDED.depends_value,
    validation_rules = EXCLUDED.validation_rules;

  -- Question 5: Board term duration in years (only if board_term_same_as_chairman is false)
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options,
    depends_on,
    depends_value,
    validation_rules
  ) VALUES (
    'board_term_years',
    'Kiek metų trunka valdybos/tarybos kadencija?',
    'number',
    'Valdymo organai',
    50,
    true,
    true,
    NULL,
    'board_term_same_as_chairman',
    'false',
    '{"min": 1, "max": 10, "required": true}'::jsonb
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options,
    depends_on = EXCLUDED.depends_on,
    depends_value = EXCLUDED.depends_value,
    validation_rules = EXCLUDED.validation_rules;

  -- Question 7: Number of board members according to bylaws (REQUIRED if has governing body)
  -- Note: This will be shown for valdyba, taryba, or valdyba_ir_taryba
  -- The UI should handle conditional display based on governing_body_type != 'nera'
  INSERT INTO public.governance_questions (
    question_key,
    question_text,
    question_type,
    section,
    section_order,
    is_required,
    is_active,
    options,
    depends_on,
    depends_value,
    validation_rules
  ) VALUES (
    'board_member_count',
    'Kiek valdybos/tarybos narių numato įstatai?',
    'number',
    'Valdymo organai',
    60,
    true,
    true,
    NULL,
    'governing_body_type',
    'valdyba',  -- Will need custom UI logic to show for valdyba, taryba, or valdyba_ir_taryba
    '{"min": 1, "max": 50, "required": true}'::jsonb
  )
  ON CONFLICT (question_key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    section = EXCLUDED.section,
    section_order = EXCLUDED.section_order,
    is_required = EXCLUDED.is_required,
    is_active = EXCLUDED.is_active,
    options = EXCLUDED.options,
    depends_on = EXCLUDED.depends_on,
    depends_value = EXCLUDED.depends_value,
    validation_rules = EXCLUDED.validation_rules;

  -- Deactivate old chairman term questions if they exist
  UPDATE public.governance_questions 
  SET is_active = false 
  WHERE question_key IN ('chairman_term_start_date', 'chairman_term_duration_years', 'council_elected_with_chairman')
    AND question_key NOT IN ('chairman_term_start', 'chairman_term_years');

END $$;

-- ============================================================================
-- PART 2: Board Member Assignments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.board_member_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  position_type text NOT NULL DEFAULT 'BOARD_MEMBER',
  term_start date NOT NULL,
  term_end date,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  
  -- Ensure unique active assignment per member per org
  CONSTRAINT unique_active_board_assignment UNIQUE (org_id, membership_id, is_active)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_board_member_assignments_org 
  ON public.board_member_assignments(org_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_board_member_assignments_membership 
  ON public.board_member_assignments(membership_id) WHERE is_active = true;

-- ============================================================================
-- PART 3: RLS Policies for board_member_assignments
-- ============================================================================

ALTER TABLE public.board_member_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "board_assignments_select" ON public.board_member_assignments;
DROP POLICY IF EXISTS "board_assignments_insert" ON public.board_member_assignments;
DROP POLICY IF EXISTS "board_assignments_update" ON public.board_member_assignments;

-- SELECT: Members can see board assignments for their org
CREATE POLICY "board_assignments_select" ON public.board_member_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = board_member_assignments.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- INSERT: Only OWNER can assign board members
CREATE POLICY "board_assignments_insert" ON public.board_member_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = board_member_assignments.org_id
        AND m.user_id = auth.uid()
        AND m.role = 'OWNER'
        AND m.status = 'ACTIVE'
    )
  );

-- UPDATE: Only OWNER can update board assignments
CREATE POLICY "board_assignments_update" ON public.board_member_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = board_member_assignments.org_id
        AND m.user_id = auth.uid()
        AND m.role = 'OWNER'
        AND m.status = 'ACTIVE'
    )
  );

-- ============================================================================
-- PART 4: Helper function to get board term dates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_board_term_dates(p_org_id uuid)
RETURNS TABLE (
  term_start date,
  term_end date,
  uses_chairman_term boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config jsonb;
  v_chairman_start date;
  v_chairman_years int;
  v_board_same boolean;
  v_board_start date;
  v_board_years int;
BEGIN
  -- Get governance config
  SELECT gc.config INTO v_config
  FROM public.governance_config gc
  WHERE gc.org_id = p_org_id
  ORDER BY gc.created_at DESC
  LIMIT 1;

  IF v_config IS NULL THEN
    RETURN;
  END IF;

  -- Extract values
  v_chairman_start := (v_config->>'chairman_term_start')::date;
  v_chairman_years := COALESCE((v_config->>'chairman_term_years')::int, 3);
  v_board_same := COALESCE((v_config->>'board_term_same_as_chairman')::boolean, true);

  IF v_board_same THEN
    term_start := v_chairman_start;
    term_end := v_chairman_start + (v_chairman_years || ' years')::interval;
    uses_chairman_term := true;
  ELSE
    v_board_start := (v_config->>'board_term_start')::date;
    v_board_years := COALESCE((v_config->>'board_term_years')::int, 3);
    term_start := v_board_start;
    term_end := v_board_start + (v_board_years || ' years')::interval;
    uses_chairman_term := false;
  END IF;

  RETURN NEXT;
END;
$$;

COMMENT ON TABLE public.board_member_assignments IS 'Tracks board/council member assignments with term dates';
COMMENT ON FUNCTION public.get_board_term_dates IS 'Returns the board term dates based on governance config';
