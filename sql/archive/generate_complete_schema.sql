-- ==================================================
-- Complete Database Schema Generator
-- Run this in Supabase SQL Editor
-- Copy the output and save to consolidated_all.sql
-- ==================================================

-- This script generates CREATE statements for all database objects
-- Run each section separately and combine the results

-- ==================================================
-- 1. ENUM TYPES
-- ==================================================

DO $$
DECLARE
    enum_record RECORD;
    enum_values TEXT;
BEGIN
    FOR enum_record IN 
        SELECT DISTINCT t.typname
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY t.typname
    LOOP
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '-- ENUM TYPE: %', enum_record.typname;
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'CREATE TYPE % AS ENUM (', enum_record.typname;
        
        SELECT string_agg('  ''' || e.enumlabel || '''', ',' || E'\n' ORDER BY e.enumsortorder)
        INTO enum_values
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = enum_record.typname;
        
        RAISE NOTICE '%', enum_values;
        RAISE NOTICE ');';
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==================================================
-- 2. TABLES (Structure)
-- ==================================================
-- Note: For complete table definitions with constraints, 
-- use pg_dump or Supabase CLI

DO $$
DECLARE
    table_record RECORD;
    col_record RECORD;
    col_def TEXT;
    first_col BOOLEAN;
BEGIN
    FOR table_record IN 
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '-- TABLE: %', table_record.tablename;
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'CREATE TABLE IF NOT EXISTS % (', table_record.tablename;
        
        first_col := TRUE;
        FOR col_record IN
            SELECT 
                column_name,
                data_type,
                udt_name,
                character_maximum_length,
                numeric_precision,
                numeric_scale,
                is_nullable,
                column_default,
                ordinal_position
            FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND table_name = table_record.tablename
            ORDER BY ordinal_position
        LOOP
            IF NOT first_col THEN
                RAISE NOTICE ',';
            END IF;
            first_col := FALSE;
            
            col_def := '  ' || col_record.column_name || ' ';
            
            -- Handle data types
            IF col_record.data_type = 'USER-DEFINED' THEN
                col_def := col_def || col_record.udt_name;
            ELSIF col_record.data_type = 'ARRAY' THEN
                col_def := col_def || col_record.udt_name || '[]';
            ELSE
                col_def := col_def || col_record.data_type;
            END IF;
            
            -- Add length/precision
            IF col_record.character_maximum_length IS NOT NULL THEN
                col_def := col_def || '(' || col_record.character_maximum_length || ')';
            ELSIF col_record.numeric_precision IS NOT NULL AND col_record.numeric_scale IS NOT NULL THEN
                col_def := col_def || '(' || col_record.numeric_precision || ',' || col_record.numeric_scale || ')';
            ELSIF col_record.numeric_precision IS NOT NULL THEN
                col_def := col_def || '(' || col_record.numeric_precision || ')';
            END IF;
            
            -- Add NOT NULL
            IF col_record.is_nullable = 'NO' THEN
                col_def := col_def || ' NOT NULL';
            END IF;
            
            -- Add DEFAULT
            IF col_record.column_default IS NOT NULL THEN
                col_def := col_def || ' DEFAULT ' || col_record.column_default;
            END IF;
            
            RAISE NOTICE '%', col_def;
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE ');';
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==================================================
-- 3. FUNCTIONS (RPC)
-- ==================================================

DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT 
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname
    LOOP
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '-- FUNCTION: %', func_record.function_name;
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '';
        RAISE NOTICE '%', func_record.function_def;
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==================================================
-- 4. VIEWS
-- ==================================================

DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN
        SELECT 
            table_name,
            view_definition
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
    LOOP
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '-- VIEW: %', view_record.table_name;
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'CREATE OR REPLACE VIEW % AS', view_record.table_name;
        RAISE NOTICE '%', view_record.view_definition;
        RAISE NOTICE ';';
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==================================================
-- 5. RLS POLICIES
-- ==================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '-- RLS POLICY: %.%', policy_record.tablename, policy_record.policyname;
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'CREATE POLICY "%" ON %', policy_record.policyname, policy_record.tablename;
        RAISE NOTICE '  FOR %', policy_record.cmd;
        RAISE NOTICE '  TO %', policy_record.roles::text;
        
        IF policy_record.qual IS NOT NULL THEN
            RAISE NOTICE '  USING (%);', policy_record.qual;
        END IF;
        
        IF policy_record.with_check IS NOT NULL THEN
            RAISE NOTICE '  WITH CHECK (%);', policy_record.with_check;
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==================================================
-- 6. INDEXES
-- ==================================================

DO $$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname NOT LIKE 'pg_%'
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '-- INDEX: % ON %', idx_record.indexname, idx_record.tablename;
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '';
        RAISE NOTICE '%;', idx_record.indexdef;
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==================================================
-- 7. TRIGGERS
-- ==================================================

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT 
            trigger_name,
            event_object_table,
            action_timing,
            event_manipulation,
            action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
    LOOP
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '-- TRIGGER: % ON %', trigger_record.trigger_name, trigger_record.event_object_table;
        RAISE NOTICE '-- ==================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'CREATE TRIGGER %', trigger_record.trigger_name;
        RAISE NOTICE '  % %', trigger_record.action_timing, trigger_record.event_manipulation;
        RAISE NOTICE '  ON %', trigger_record.event_object_table;
        IF trigger_record.action_statement IS NOT NULL THEN
            RAISE NOTICE '  %', trigger_record.action_statement;
        END IF;
        RAISE NOTICE ';';
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ==================================================
-- NOTE: For complete schema with all constraints,
-- foreign keys, and other details, use:
-- 
-- supabase db dump --schema public > consolidated_all.sql
-- 
-- OR
--
-- pg_dump -h <host> -U postgres -d postgres --schema=public --no-owner --no-acl > consolidated_all.sql
-- ==================================================

