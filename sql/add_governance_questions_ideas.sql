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

