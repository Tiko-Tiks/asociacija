-- ==================================================
-- Export All Tables Structure
-- Run this in Supabase SQL Editor
-- This generates CREATE TABLE statements for all tables
-- ==================================================

-- Note: This generates basic table structures.
-- For complete schema with all constraints, foreign keys, indexes,
-- use pg_dump or Supabase CLI (see UPDATE_CONSOLIDATED_SCHEMA.md)

SELECT 
    '-- ==================================================' as sql_line
UNION ALL
SELECT '-- TABLE: ' || tablename
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT '-- =================================================='
UNION ALL
SELECT ''
UNION ALL
SELECT 'CREATE TABLE IF NOT EXISTS ' || tablename || ' (' || E'\n' ||
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
           CASE 
               WHEN column_default IS NOT NULL 
               THEN ' DEFAULT ' || column_default 
               ELSE '' 
           END,
           ',' || E'\n'
           ORDER BY ordinal_position
       ) ||
       E'\n);'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY tablename
ORDER BY sql_line;

