-- ==================================================
-- VISAS KLAUSIMYNO INFORMACIJA
-- ==================================================
-- Vienoje vietoje visi svarbiausi duomenys
-- ==================================================

-- ==================================================
-- 1. GOVERNANCE_QUESTIONS - VISI STULPELIAI
-- ==================================================

SELECT 
  'governance_questions' as table_name,
  string_agg(
    column_name || ' (' || data_type || 
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END || ')',
    ', ' ORDER BY ordinal_position
  ) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_questions';

-- ==================================================
-- 2. GOVERNANCE_CONFIGS - VISI STULPELIAI
-- ==================================================

SELECT 
  'governance_configs' as table_name,
  string_agg(
    column_name || ' (' || data_type || 
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END || ')',
    ', ' ORDER BY ordinal_position
  ) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs';

-- ==================================================
-- 3. SVARBIAUSI STULPELIAI (atskirai)
-- ==================================================

-- governance_questions svarbiausi
SELECT 
  'governance_questions' as table_name,
  'id' as column_name,
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_questions' AND column_name = 'id') as data_type
UNION ALL
SELECT 
  'governance_questions',
  'org_id',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_questions' AND column_name = 'org_id')
UNION ALL
SELECT 
  'governance_questions',
  'question_key',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_questions' AND column_name = 'question_key')
UNION ALL
SELECT 
  'governance_questions',
  'version_id',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_questions' AND column_name = 'version_id')
UNION ALL
SELECT 
  'governance_questions',
  'is_active',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_questions' AND column_name = 'is_active')
UNION ALL
SELECT 
  'governance_questions',
  'is_required',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_questions' AND column_name = 'is_required')
UNION ALL
SELECT 
  'governance_configs',
  'id',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_configs' AND column_name = 'id')
UNION ALL
SELECT 
  'governance_configs',
  'org_id',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_configs' AND column_name = 'org_id')
UNION ALL
SELECT 
  'governance_configs',
  'answers',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_configs' AND column_name = 'answers')
UNION ALL
SELECT 
  'governance_configs',
  'version_id',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_configs' AND column_name = 'version_id')
UNION ALL
SELECT 
  'governance_configs',
  'active_config',
  (SELECT data_type FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'governance_configs' AND column_name = 'active_config');

-- ==================================================
-- 4. ATSAKYMŲ SAUGOJIMAS
-- ==================================================

SELECT 
  'Answer Storage' as check_type,
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'jsonb' THEN 'JSONB (viename lauke)'
    ELSE 'Other'
  END as storage_method
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs'
  AND column_name = 'answers';

-- ==================================================
-- 5. VERSIJŲ MECHANIZMAS
-- ==================================================

SELECT 
  'Version Mechanism' as check_type,
  'governance_questions.version_id' as field,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_questions'
      AND column_name = 'version_id'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
UNION ALL
SELECT 
  'Version Mechanism',
  'governance_configs.version_id',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_configs'
      AND column_name = 'version_id'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END
UNION ALL
SELECT 
  'Version Mechanism',
  'governance_configs.active_config (active version per org)',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'governance_configs'
      AND column_name = 'active_config'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END
UNION ALL
SELECT 
  'Version Mechanism',
  'Separate versions table',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('questionnaire_versions', 'governance_versions', 'versions')
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END;

