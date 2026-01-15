-- ==================================================
-- Generate Full Database Schema
-- This script generates the complete database schema
-- Run this in Supabase SQL Editor to get the current schema
-- ==================================================

-- 1. Get all tables with their columns
SELECT 
    '-- Table: ' || schemaname || '.' || tablename || E'\n' ||
    'CREATE TABLE IF NOT EXISTS ' || schemaname || '.' || tablename || ' (' || E'\n' ||
    string_agg(
        '  ' || column_name || ' ' || 
        CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            ELSE data_type
        END ||
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
            THEN '(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN numeric_precision IS NOT NULL
            THEN '(' || numeric_precision || ')'
            ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ',' || E'\n'
        ORDER BY ordinal_position
    ) ||
    E'\n);' || E'\n'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 2. Get all enum types
SELECT 
    '-- Enum Type: ' || t.typname || E'\n' ||
    'CREATE TYPE ' || t.typname || ' AS ENUM (' || E'\n' ||
    string_agg('  ''' || e.enumlabel || '''', ',' || E'\n' ORDER BY e.enumsortorder) ||
    E'\n);' || E'\n'
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;

-- 3. Get all functions
SELECT 
    '-- Function: ' || p.proname || E'\n' ||
    pg_get_functiondef(p.oid) || E'\n' || E'\n'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 4. Get all views
SELECT 
    '-- View: ' || table_name || E'\n' ||
    'CREATE OR REPLACE VIEW ' || table_name || ' AS ' || E'\n' ||
    view_definition || ';' || E'\n' || E'\n'
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 5. Get all RLS policies
SELECT 
    '-- RLS Policy: ' || schemaname || '.' || tablename || '.' || policyname || E'\n' ||
    'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename || E'\n' ||
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

-- 6. Get all triggers
SELECT 
    '-- Trigger: ' || trigger_name || ' ON ' || event_object_table || E'\n' ||
    'CREATE TRIGGER ' || trigger_name || E'\n' ||
    '  ' || action_timing || ' ' || event_manipulation || E'\n' ||
    '  ON ' || event_object_schema || '.' || event_object_table || E'\n' ||
    CASE 
        WHEN action_statement IS NOT NULL THEN '  ' || action_statement || E'\n'
        ELSE ''
    END ||
    ';' || E'\n' || E'\n'
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7. Get all indexes
SELECT 
    '-- Index: ' || indexname || ' ON ' || tablename || E'\n' ||
    'CREATE INDEX IF NOT EXISTS ' || indexname || E'\n' ||
    '  ON ' || schemaname || '.' || tablename || E'\n' ||
    '  USING ' || indexdef || ';' || E'\n' || E'\n'
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. Get all sequences
SELECT 
    '-- Sequence: ' || sequence_name || E'\n' ||
    'CREATE SEQUENCE IF NOT EXISTS ' || sequence_name || E'\n' ||
    CASE 
        WHEN data_type = 'bigint' THEN '  AS BIGINT'
        WHEN data_type = 'integer' THEN '  AS INTEGER'
        WHEN data_type = 'smallint' THEN '  AS SMALLINT'
        ELSE ''
    END ||
    CASE 
        WHEN start_value IS NOT NULL THEN '  START WITH ' || start_value
        ELSE ''
    END ||
    CASE 
        WHEN increment IS NOT NULL THEN '  INCREMENT BY ' || increment
        ELSE ''
    END ||
    CASE 
        WHEN minimum_value IS NOT NULL THEN '  MINVALUE ' || minimum_value
        ELSE ''
    END ||
    CASE 
        WHEN maximum_value IS NOT NULL THEN '  MAXVALUE ' || maximum_value
        ELSE ''
    END ||
    ';' || E'\n' || E'\n'
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

