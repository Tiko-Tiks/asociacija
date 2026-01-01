-- ==================================================
-- KLAUSIMYNO BŪTINIAUSIA INFORMACIJA
-- ==================================================

-- 1. governance_questions - VISI STULPELIAI
SELECT 
  'governance_questions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'governance_questions'
ORDER BY ordinal_position;

-- 2. governance_configs - VISI STULPELIAI
SELECT 
  'governance_configs' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'governance_configs'
ORDER BY ordinal_position;

