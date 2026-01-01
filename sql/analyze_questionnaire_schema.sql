-- ==================================================
-- KLAUSIMYNO SCHEMOS ANALIZĖ
-- ==================================================
-- Analizuoja klausimyno lentelių struktūrą
-- ==================================================

-- ==================================================
-- 1. LENTELIŲ EGZISTAVIMO PATIKRA
-- ==================================================

SELECT 
  'Table Existence Check' as check_type,
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
  ('questionnaire_versions'),
  ('questionnaire_questions'),
  ('questionnaire_options'),
  ('questionnaire_answers'),
  ('questionnaire_assignments'),
  ('ruleset_versions')
) AS t(table_name);

-- ==================================================
-- 2. GOVERNANCE_QUESTIONS STRUKTŪRA
-- ==================================================

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

-- ==================================================
-- 3. KITŲ KLAUSIMYNO LENTELIŲ STRUKTŪRA
-- ==================================================

-- Check questionnaire_versions
SELECT 
  'questionnaire_versions Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'questionnaire_versions'
ORDER BY ordinal_position;

-- Check questionnaire_questions
SELECT 
  'questionnaire_questions Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'questionnaire_questions'
ORDER BY ordinal_position;

-- Check questionnaire_options
SELECT 
  'questionnaire_options Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'questionnaire_options'
ORDER BY ordinal_position;

-- Check questionnaire_answers
SELECT 
  'questionnaire_answers Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'questionnaire_answers'
ORDER BY ordinal_position;

-- Check questionnaire_assignments
SELECT 
  'questionnaire_assignments Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'questionnaire_assignments'
ORDER BY ordinal_position;

-- Check ruleset_versions
SELECT 
  'ruleset_versions Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ruleset_versions'
ORDER BY ordinal_position;

-- ==================================================
-- 4. ATSAKYMŲ SAUGOJIMO BŪDAS
-- ==================================================

-- Check if answers are stored as JSONB or typed fields
SELECT 
  'Answer Storage Method' as check_type,
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'jsonb' THEN 'JSONB (viename lauke)'
    WHEN column_name LIKE '%json%' THEN 'JSONB variant'
    WHEN column_name LIKE '%value%' THEN 'Typed fields (value_text, value_int, etc.)'
    ELSE 'Other'
  END as storage_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%answer%'
    OR column_name LIKE '%answer%'
    OR column_name LIKE '%value%'
  )
ORDER BY table_name, ordinal_position;

-- ==================================================
-- 5. AKTYVIOS VERSIJOS MECHANIZMAS
-- ==================================================

-- Check for active version tracking
SELECT 
  'Active Version Mechanism' as check_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%active%'
    OR column_name LIKE '%is_active%'
    OR column_name LIKE '%current%'
    OR column_name LIKE '%default%'
  )
  AND table_name LIKE '%version%' OR table_name LIKE '%question%'
ORDER BY table_name, column_name;

-- Check for org-specific active version
SELECT 
  'Org-Specific Active Version' as check_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name LIKE '%assignment%' AND column_name LIKE '%active%')
    OR (table_name LIKE '%org%' AND column_name LIKE '%version%')
  )
ORDER BY table_name, column_name;

-- ==================================================
-- 6. FOREIGN KEY RELATIONSHIPS
-- ==================================================

-- Check relationships between questionnaire tables
SELECT 
  'Questionnaire Table Relationships' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (
    tc.table_name LIKE '%question%'
    OR tc.table_name LIKE '%version%'
    OR tc.table_name LIKE '%answer%'
    OR tc.table_name LIKE '%option%'
    OR tc.table_name LIKE '%assignment%'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ==================================================
-- 7. SUMMARY
-- ==================================================

SELECT 
  '=== KLAUSIMYNO SCHEMOS SUVESTINĖ ===' as summary;

-- Count existing questionnaire tables
SELECT 
  'Existing Questionnaire Tables' as metric,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%question%'
    OR table_name LIKE '%version%'
    OR table_name LIKE '%answer%'
    OR table_name LIKE '%option%'
    OR table_name LIKE '%assignment%'
  );

