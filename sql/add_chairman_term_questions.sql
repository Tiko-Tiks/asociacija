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

