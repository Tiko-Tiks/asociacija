-- ==================================================
-- Export Complete Database Schema
-- Run this in Supabase SQL Editor
-- Copy the results and save to consolidated_all.sql
-- ==================================================

-- This script generates CREATE statements as query results
-- that you can easily copy and paste

-- ==================================================
-- 1. ENUM TYPES
-- ==================================================

SELECT 
    '-- ==================================================' as output
UNION ALL
SELECT '-- ENUM TYPE: ' || t.typname
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT EXISTS (
    SELECT 1 FROM pg_type t2 
    WHERE t2.typname = t.typname 
    AND t2.oid != t.oid
  )
GROUP BY t.typname
UNION ALL
SELECT '-- =================================================='
UNION ALL
SELECT ''
UNION ALL
SELECT 'CREATE TYPE ' || t.typname || ' AS ENUM (' || E'\n' ||
       string_agg('  ''' || e.enumlabel || '''', ',' || E'\n' ORDER BY e.enumsortorder) ||
       E'\n);'
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT EXISTS (
    SELECT 1 FROM pg_type t2 
    WHERE t2.typname = t.typname 
    AND t2.oid != t.oid
  )
GROUP BY t.typname
ORDER BY output;

-- ==================================================
-- 2. FUNCTIONS (RPC)
-- ==================================================

SELECT 
    '-- ==================================================' as output
UNION ALL
SELECT '-- FUNCTION: ' || p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT '-- =================================================='
UNION ALL
SELECT ''
UNION ALL
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY output;

-- ==================================================
-- 3. VIEWS
-- ==================================================

SELECT 
    '-- ==================================================' as output
UNION ALL
SELECT '-- VIEW: ' || table_name
FROM information_schema.views
WHERE table_schema = 'public'
UNION ALL
SELECT '-- =================================================='
UNION ALL
SELECT ''
UNION ALL
SELECT 'CREATE OR REPLACE VIEW ' || table_name || ' AS ' || E'\n' ||
       view_definition || ';'
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY output;

-- ==================================================
-- 4. RLS POLICIES
-- ==================================================

SELECT 
    '-- ==================================================' as output
UNION ALL
SELECT '-- RLS POLICY: ' || tablename || '.' || policyname
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT '-- =================================================='
UNION ALL
SELECT ''
UNION ALL
SELECT 'CREATE POLICY "' || policyname || '" ON ' || tablename || E'\n' ||
       '  FOR ' || cmd || E'\n' ||
       '  TO ' || roles::text ||
       CASE 
           WHEN qual IS NOT NULL THEN E'\n' || '  USING (' || qual || ')'
           ELSE ''
       END ||
       CASE 
           WHEN with_check IS NOT NULL THEN E'\n' || '  WITH CHECK (' || with_check || ')'
           ELSE ''
       END ||
       ';'
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY output;

-- ==================================================
-- NOTE: For complete table structures with all constraints,
-- foreign keys, indexes, and triggers, you need to use:
-- 
-- 1. Supabase CLI:
--    npx supabase db dump --db-url "postgresql://..." --schema public > consolidated_all.sql
--
-- 2. OR pg_dump:
--    pg_dump -h <host> -U postgres -d postgres --schema=public --no-owner --no-acl > consolidated_all.sql
--
-- The above queries only show ENUMs, Functions, Views, and RLS Policies.
-- For tables, use one of the methods above.
-- ==================================================

