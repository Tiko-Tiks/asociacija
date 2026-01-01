-- ==================================================
-- KLAUSIMYNO LENTELIŲ SCHEMOS FAKTAI (READ-ONLY)
-- ==================================================
-- Tik informacijos gavimas, jokių pakeitimų
-- ==================================================

-- ==================================================
-- 1. GOVERNANCE_QUESTIONS - VISI STULPELIAI
-- ==================================================

SELECT 
  'governance_questions' as table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_questions'
ORDER BY ordinal_position;

-- ==================================================
-- 2. GOVERNANCE_CONFIGS - VISI STULPELIAI
-- ==================================================

SELECT 
  'governance_configs' as table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs'
ORDER BY ordinal_position;

-- ==================================================
-- 3. PRIMARY KEYS
-- ==================================================

SELECT 
  'Primary Keys' as constraint_type,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('governance_questions', 'governance_configs')
ORDER BY tc.table_name, kcu.ordinal_position;

-- ==================================================
-- 4. FOREIGN KEYS
-- ==================================================

SELECT 
  'Foreign Keys' as constraint_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('governance_questions', 'governance_configs')
ORDER BY tc.table_name, kcu.column_name;

-- ==================================================
-- 5. UNIQUE CONSTRAINTS
-- ==================================================

SELECT 
  'Unique Constraints' as constraint_type,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('governance_questions', 'governance_configs')
ORDER BY tc.table_name, kcu.ordinal_position;

-- ==================================================
-- 6. CHECK CONSTRAINTS
-- ==================================================

SELECT 
  'Check Constraints' as constraint_type,
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
  AND tc.table_schema = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('governance_questions', 'governance_configs')
ORDER BY tc.table_name, tc.constraint_name;

-- ==================================================
-- 7. INDEXES
-- ==================================================

SELECT 
  'Indexes' as index_type,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('governance_questions', 'governance_configs')
ORDER BY tablename, indexname;

-- ==================================================
-- 8. RLS POLICIES
-- ==================================================

-- Check if pg_policies view exists and get policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'pg_catalog'
    AND table_name = 'pg_policies'
  ) THEN
    RAISE NOTICE 'pg_policies view exists';
  ELSE
    RAISE NOTICE 'pg_policies view does not exist, using information_schema instead';
  END IF;
END $$;

-- Check if RLS is enabled (simple check)
SELECT 
  'RLS Status' as policy_type,
  table_name as tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname = table_name
      AND c.relrowsecurity = true
    ) THEN 'RLS enabled'
    ELSE 'RLS disabled'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('governance_questions', 'governance_configs');

-- ==================================================
-- 9. SUMMARY STATISTICS
-- ==================================================

-- Get row counts (simple version)
SELECT 
  'Table Statistics' as stat_type,
  'governance_questions' as tablename,
  COUNT(*) as row_count
FROM public.governance_questions
UNION ALL
SELECT 
  'Table Statistics',
  'governance_configs',
  COUNT(*)
FROM public.governance_configs;

