-- ==================================================
-- PAPRASČIAUSIA KLAUSIMYNO INFORMACIJA
-- ==================================================

-- 1. governance_questions - VISI STULPELIAI
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'governance_questions'
ORDER BY ordinal_position;

-- 2. governance_configs - VISI STULPELIAI  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'governance_configs'
ORDER BY ordinal_position;

-- 3. ATSAKYMŲ SAUGOJIMAS
SELECT 
  'governance_configs.answers' as field,
  data_type,
  CASE WHEN data_type = 'jsonb' THEN 'JSONB (viename lauke)' ELSE 'Other' END as storage_method
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'governance_configs' 
  AND column_name = 'answers';

-- 4. VERSIJŲ MECHANIZMAS
SELECT 
  'governance_questions.version_id' as field,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'governance_questions' AND column_name = 'version_id'
  ) THEN 'TAIP' ELSE 'NE' END as exists
UNION ALL
SELECT 
  'governance_configs.version_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'governance_configs' AND column_name = 'version_id'
  ) THEN 'TAIP' ELSE 'NE' END
UNION ALL
SELECT 
  'governance_configs.active_config (active version per org)',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'governance_configs' AND column_name = 'active_config'
  ) THEN 'TAIP' ELSE 'NE' END;

