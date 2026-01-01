-- ==================================================
-- KLAUSIMYNO LENTELIŲ STRUKTŪRA
-- ==================================================
-- Gauna visą informaciją apie klausimyno lenteles
-- ==================================================

-- ==================================================
-- 1. GOVERNANCE_QUESTIONS STRUKTŪRA
-- ==================================================

SELECT 
  'governance_questions' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_questions'
ORDER BY ordinal_position;

-- ==================================================
-- 2. GOVERNANCE_CONFIGS (atsakymų saugojimas)
-- ==================================================

SELECT 
  'governance_configs' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs'
ORDER BY ordinal_position;

-- ==================================================
-- 3. VISOS SUSIJUSIOS LENTELĖS
-- ==================================================

SELECT 
  'All Questionnaire-Related Tables' as check_type,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%question%'
    OR table_name LIKE '%governance%'
    OR table_name LIKE '%questionnaire%'
  )
ORDER BY table_name;

-- ==================================================
-- 4. ATSAKYMŲ SAUGOJIMO BŪDAS
-- ==================================================

-- Check governance_configs.answers structure
SELECT 
  'Answer Storage in governance_configs' as check_type,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'jsonb' THEN 'JSONB (viename lauke)'
    ELSE 'Other'
  END as storage_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs'
  AND column_name LIKE '%answer%';

-- ==================================================
-- 5. VERSIJŲ MECHANIZMAS
-- ==================================================

-- Check if there's version tracking in governance_questions
SELECT 
  'Version Tracking in governance_questions' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_questions'
  AND (
    column_name LIKE '%version%'
    OR column_name LIKE '%active%'
    OR column_name = 'is_active'
  );

-- Check if there's org-specific active version mechanism
SELECT 
  'Org-Specific Active Version' as check_type,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'governance_configs' AND column_name LIKE '%version%')
    OR (table_name = 'governance_questions' AND column_name LIKE '%org%')
  );

-- ==================================================
-- 6. OPTIONS SAUGOJIMAS
-- ==================================================

-- Check how options are stored in governance_questions
SELECT 
  'Options Storage in governance_questions' as check_type,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'jsonb' THEN 'JSONB array'
    WHEN data_type = 'text[]' THEN 'Text array'
    ELSE 'Other'
  END as storage_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_questions'
  AND column_name LIKE '%option%';

