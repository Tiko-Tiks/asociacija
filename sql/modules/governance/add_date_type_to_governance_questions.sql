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

