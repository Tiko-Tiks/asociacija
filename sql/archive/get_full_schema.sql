-- ==================================================
-- Get Full Database Schema as Query Results
-- Run this in Supabase SQL Editor
-- Copy the 'sql_line' column results and save to consolidated_all.sql
-- ==================================================

-- This generates all CREATE statements as query results
-- that you can easily copy from the results table

WITH enum_types AS (
    SELECT 
        t.typname as enum_name,
        string_agg('  ''' || e.enumlabel || '''', ',' || E'\n' ORDER BY e.enumsortorder) as enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND NOT EXISTS (
        SELECT 1 FROM pg_type t2 
        WHERE t2.typname = t.typname 
        AND t2.oid != t.oid
      )
    GROUP BY t.typname
),
table_structures AS (
    SELECT 
        t.tablename,
        string_agg(
            '  ' || c.column_name || ' ' ||
            CASE 
                WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
                WHEN c.data_type = 'ARRAY' THEN c.udt_name || '[]'
                ELSE c.data_type
            END ||
            CASE 
                WHEN c.character_maximum_length IS NOT NULL 
                THEN '(' || c.character_maximum_length || ')'
                WHEN c.numeric_precision IS NOT NULL AND c.numeric_scale IS NOT NULL
                THEN '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
                WHEN c.numeric_precision IS NOT NULL
                THEN '(' || c.numeric_precision || ')'
                ELSE ''
            END ||
            CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE 
                WHEN c.column_default IS NOT NULL 
                THEN ' DEFAULT ' || c.column_default 
                ELSE '' 
            END,
            ',' || E'\n'
            ORDER BY c.ordinal_position
        ) as columns
    FROM pg_tables t
    JOIN information_schema.columns c ON t.tablename = c.table_name
    WHERE t.schemaname = 'public' AND c.table_schema = 'public'
    GROUP BY t.tablename
)
SELECT 
    '-- ==================================================' as sql_line,
    1 as sort_order
UNION ALL
SELECT '-- FULL DATABASE SCHEMA EXPORT', 2
UNION ALL
SELECT '-- Generated: ' || NOW()::text, 3
UNION ALL
SELECT '-- ==================================================', 4
UNION ALL
SELECT '', 5
UNION ALL
SELECT '-- ENUM TYPES', 100
UNION ALL
SELECT '-- ==================================================', 101
UNION ALL
SELECT '', 102
UNION ALL
SELECT 'CREATE TYPE ' || enum_name || ' AS ENUM (' || E'\n' || enum_values || E'\n);', 
    200 + row_number() OVER (ORDER BY enum_name)
FROM enum_types
UNION ALL
SELECT '', 300
UNION ALL
SELECT '-- TABLES', 301
UNION ALL
SELECT '-- ==================================================', 302
UNION ALL
SELECT '', 303
UNION ALL
SELECT 'CREATE TABLE IF NOT EXISTS ' || tablename || ' (' || E'\n' || columns || E'\n);',
    400 + row_number() OVER (ORDER BY tablename)
FROM table_structures
UNION ALL
SELECT '', 500
UNION ALL
SELECT '-- FUNCTIONS (RPC)', 501
UNION ALL
SELECT '-- ==================================================', 502
UNION ALL
SELECT '', 503
UNION ALL
SELECT '-- Function: ' || p.proname || E'\n' || pg_get_functiondef(p.oid),
    600 + row_number() OVER (ORDER BY p.proname)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT '', 700
UNION ALL
SELECT '-- VIEWS', 701
UNION ALL
SELECT '-- ==================================================', 702
UNION ALL
SELECT '', 703
UNION ALL
SELECT 'CREATE OR REPLACE VIEW ' || table_name || ' AS ' || E'\n' || view_definition || ';',
    800 + row_number() OVER (ORDER BY table_name)
FROM information_schema.views
WHERE table_schema = 'public'
UNION ALL
SELECT '', 900
UNION ALL
SELECT '-- RLS POLICIES', 901
UNION ALL
SELECT '-- ==================================================', 902
UNION ALL
SELECT '', 903
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
       ';',
    1000 + row_number() OVER (ORDER BY tablename, policyname)
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY sort_order, sql_line;

