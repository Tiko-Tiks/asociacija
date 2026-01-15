-- ============================================
-- COMPLETE SCHEMA INSPECTION
-- ============================================
-- Run this in Supabase SQL Editor to get full schema

-- 1. List ALL tables in public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Get COMPLETE structure of key tables
-- profiles/users table
SELECT 
  'profiles' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- users table (if exists)
SELECT 
  'users' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- memberships table
SELECT 
  'memberships' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'memberships'
ORDER BY ordinal_position;

-- invoices table
SELECT 
  'invoices' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
ORDER BY ordinal_position;

-- orgs table
SELECT 
  'orgs' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orgs'
ORDER BY ordinal_position;

-- governance_configs table
SELECT 
  'governance_configs' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs'
ORDER BY ordinal_position;

-- 3. List ALL views
SELECT 
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Check enum types
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('member_status', 'app_role', 'invoice_status')
ORDER BY t.typname, e.enumsortorder;

-- ============================================
-- END OF SCHEMA INSPECTION
-- ============================================

