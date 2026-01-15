-- ==================================================
-- Full Database Schema Dump
-- Run this in Supabase SQL Editor
-- This will generate CREATE statements for all database objects
-- ==================================================

-- Note: This script uses PostgreSQL system functions to generate
-- CREATE statements. Copy the output and save it to consolidated_all.sql

-- 1. ENUM TYPES
SELECT 
    '-- ==================================================' || E'\n' ||
    '-- ENUM TYPES' || E'\n' ||
    '-- ==================================================' || E'\n' || E'\n' ||
    'CREATE TYPE ' || t.typname || ' AS ENUM (' || E'\n' ||
    string_agg('  ''' || e.enumlabel || '''', ',' || E'\n' ORDER BY e.enumsortorder) ||
    E'\n);' || E'\n' || E'\n'
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND NOT EXISTS (
    SELECT 1 FROM pg_type t2 
    WHERE t2.typname = t.typname 
    AND t2.oid != t.oid
  )
GROUP BY t.typname
ORDER BY t.typname;

-- 2. TABLES (structure only - you'll need to run pg_dump for full CREATE)
-- For now, we'll list all tables
SELECT 
    '-- Table: ' || tablename || E'\n' ||
    '-- Run pg_dump to get full CREATE TABLE statement' || E'\n' ||
    '-- pg_dump -h <host> -U <user> -d <database> -t ' || tablename || ' --schema-only' || E'\n' || E'\n'
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. FUNCTIONS
SELECT 
    '-- ==================================================' || E'\n' ||
    '-- FUNCTION: ' || p.proname || E'\n' ||
    '-- ==================================================' || E'\n' ||
    pg_get_functiondef(p.oid) || E'\n' || E'\n'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 4. VIEWS
SELECT 
    '-- ==================================================' || E'\n' ||
    '-- VIEW: ' || table_name || E'\n' ||
    '-- ==================================================' || E'\n' ||
    'CREATE OR REPLACE VIEW ' || table_name || ' AS ' || E'\n' ||
    view_definition || ';' || E'\n' || E'\n'
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 5. RLS POLICIES
SELECT 
    '-- ==================================================' || E'\n' ||
    '-- RLS POLICY: ' || tablename || '.' || policyname || E'\n' ||
    '-- ==================================================' || E'\n' ||
    'CREATE POLICY "' || policyname || '" ON ' || tablename || E'\n' ||
    '  FOR ' || cmd || E'\n' ||
    '  TO ' || roles::text || E'\n' ||
    CASE 
        WHEN qual IS NOT NULL THEN '  USING (' || qual || ')' || E'\n'
        ELSE ''
    END ||
    CASE 
        WHEN with_check IS NOT NULL THEN '  WITH CHECK (' || with_check || ')' || E'\n'
        ELSE ''
    END ||
    ';' || E'\n' || E'\n'
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==================================================
-- RECOMMENDED: Use Supabase CLI to generate full schema
-- ==================================================
-- Run this command in your terminal:
-- 
-- supabase db dump --schema public > sql/consolidated_all.sql
--
-- Or use pg_dump directly:
--
-- pg_dump -h <your-supabase-host> \
--         -U postgres \
--         -d postgres \
--         --schema=public \
--         --no-owner \
--         --no-acl \
--         > sql/consolidated_all.sql
--
-- ==================================================

