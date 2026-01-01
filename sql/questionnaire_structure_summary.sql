-- ==================================================
-- KLAUSIMYNO STRUKTŪROS SUVESTINĖ
-- ==================================================
-- Parodo tik svarbiausią informaciją
-- ==================================================

-- ==================================================
-- 1. GOVERNANCE_QUESTIONS - SVARBIAUSI STULPELIAI
-- ==================================================

SELECT 
  'governance_questions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_questions'
  AND column_name IN (
    'id', 'org_id', 'question_key', 'question_text', 
    'question_type', 'section', 'section_order', 
    'is_required', 'is_active', 'options', 
    'depends_on', 'depends_value', 'version_id'
  )
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'org_id' THEN 2
    WHEN 'question_key' THEN 3
    WHEN 'question_text' THEN 4
    WHEN 'question_type' THEN 5
    WHEN 'section' THEN 6
    WHEN 'section_order' THEN 7
    WHEN 'is_required' THEN 8
    WHEN 'is_active' THEN 9
    WHEN 'options' THEN 10
    WHEN 'version_id' THEN 11
    ELSE 12
  END;

-- ==================================================
-- 2. GOVERNANCE_CONFIGS - ATSAKYMŲ SAUGOJIMAS
-- ==================================================

SELECT 
  'governance_configs' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs'
  AND column_name IN (
    'id', 'org_id', 'answers', 'version_id', 
    'created_at', 'updated_at', 'active_config'
  )
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'org_id' THEN 2
    WHEN 'answers' THEN 3
    WHEN 'version_id' THEN 4
    ELSE 5
  END;

-- ==================================================
-- 3. ATSAKYMŲ SAUGOJIMO BŪDAS
-- ==================================================

SELECT 
  'Answer Storage Method' as check_type,
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'jsonb' THEN 'JSONB (viename lauke)'
    WHEN column_name LIKE '%value%' THEN 'Tipizuoti laukai (value_text, value_int, etc.)'
    ELSE 'Other'
  END as storage_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'governance_configs' AND column_name = 'answers')
    OR (table_name LIKE '%answer%' AND column_name LIKE '%value%')
  );

-- ==================================================
-- 4. VERSIJŲ MECHANIZMAS
-- ==================================================

-- Check if version_id exists in governance_questions
SELECT 
  'Version Tracking' as check_type,
  'governance_questions' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_questions'
      AND column_name = 'version_id'
    ) THEN '✓ version_id EXISTS'
    ELSE '✗ version_id MISSING'
  END as version_id_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_questions'
      AND column_name = 'is_active'
    ) THEN '✓ is_active EXISTS (soft versioning)'
    ELSE '✗ is_active MISSING'
  END as is_active_status;

-- Check if version_id exists in governance_configs
SELECT 
  'Version Tracking' as check_type,
  'governance_configs' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_configs'
      AND column_name = 'version_id'
    ) THEN '✓ version_id EXISTS'
    ELSE '✗ version_id MISSING'
  END as version_id_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_configs'
      AND column_name = 'active_config'
    ) THEN '✓ active_config EXISTS (active version per org)'
    ELSE '✗ active_config MISSING'
  END as active_config_status;

-- Check if separate versions table exists
SELECT 
  'Versions Table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('questionnaire_versions', 'governance_versions', 'versions')
    ) THEN '✓ Versions table EXISTS'
    ELSE '✗ Versions table MISSING'
  END as status;

-- ==================================================
-- 5. ORG_ASSIGNMENT MECHANIZMAS
-- ==================================================

-- Check if there's org-specific assignment
SELECT 
  'Org Assignment' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%assignment%'
    ) THEN '✓ Assignment table EXISTS'
    ELSE '✗ Assignment table MISSING'
  END as assignment_table_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_questions'
      AND column_name = 'org_id'
    ) THEN '✓ org_id in questions (direct assignment)'
    ELSE '✗ org_id MISSING (global questions)'
  END as org_assignment_status;

