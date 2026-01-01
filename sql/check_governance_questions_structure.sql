-- ==================================================
-- GOVERNANCE_QUESTIONS LENTELĖS STRUKTŪRA
-- ==================================================
-- Patikrina governance_questions lentelės struktūrą
-- ==================================================

-- Check if table exists
SELECT 
  'Table Existence' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'governance_questions'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- Get full structure
SELECT 
  'governance_questions Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_questions'
ORDER BY ordinal_position;

-- Check for related tables
SELECT 
  'Related Tables Check' as check_type,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (VALUES 
  ('governance_questions'),
  ('governance_answers'),
  ('questionnaire_versions'),
  ('questionnaire_assignments')
) AS t(table_name);

