-- ==================================================
-- Fix Governance Questions
-- ==================================================
-- 1. Deactivate unnecessary questions (always-true rules)
-- 2. Fix conditional logic for board term questions
-- ==================================================

-- ============================================================================
-- PART 1: Deactivate unnecessary questions (visada taikomi, nereikia klausti)
-- ============================================================================

-- one_member_one_vote - VISADA taip, nereikia klausti
UPDATE public.governance_questions
SET is_active = false, is_required = false
WHERE question_key = 'one_member_one_vote';

-- live_voting_capture_mode - VISADA agreguotai (PRIEŠ + SUSILAIKĖ, UŽ skaičiuojama)
UPDATE public.governance_questions
SET is_active = false, is_required = false
WHERE question_key = 'live_voting_capture_mode';

-- abstain_handling - VISADA: SUSILAIKĘ skaičiuojami kaip dalyvavimas, bet ne kaip UŽ/PRIEŠ
UPDATE public.governance_questions
SET is_active = false, is_required = false
WHERE question_key = 'abstain_handling';

-- protocol_signed_required - VISADA taip (susirinkimas užbaigtas tik su PDF)
UPDATE public.governance_questions
SET is_active = false, is_required = false
WHERE question_key = 'protocol_signed_required';

-- ============================================================================
-- PART 2: Fix board term questions conditional logic
-- ============================================================================
-- These questions should NOT be required (is_required = false)
-- They are conditionally required based on other answers
-- Frontend handles the conditional display
-- ============================================================================

-- board_term_start - conditional, NOT globally required
UPDATE public.governance_questions
SET 
  is_required = false,
  depends_on = 'board_term_same_as_chairman',
  depends_value = 'false'
WHERE question_key = 'board_term_start';

-- board_term_years - conditional, NOT globally required
UPDATE public.governance_questions
SET 
  is_required = false,
  depends_on = 'board_term_same_as_chairman',
  depends_value = 'false'
WHERE question_key = 'board_term_years';

-- board_term_same_as_chairman - NOT globally required, conditional on governing body
UPDATE public.governance_questions
SET 
  is_required = false,
  depends_on = 'governing_body_type',
  depends_value = 'valdyba'
WHERE question_key = 'board_term_same_as_chairman';

-- board_member_count - NOT globally required, conditional on governing body
UPDATE public.governance_questions
SET 
  is_required = false,
  depends_on = 'governing_body_type',
  depends_value = 'valdyba'
WHERE question_key = 'board_member_count';

-- ============================================================================
-- PART 3: Verify changes
-- ============================================================================
SELECT 
  question_key,
  question_text,
  is_required,
  is_active,
  depends_on,
  depends_value
FROM public.governance_questions
WHERE question_key IN (
  -- Deaktyvuoti (visada taikomi, nerodomi)
  'one_member_one_vote',
  'live_voting_capture_mode',
  'abstain_handling',
  'protocol_signed_required',
  -- Sąlyginiai (is_required = false, bet aktyvūs)
  'board_term_same_as_chairman',
  'board_term_start',
  'board_term_years',
  'board_member_count',
  'governing_body_type'
)
ORDER BY section_order;
