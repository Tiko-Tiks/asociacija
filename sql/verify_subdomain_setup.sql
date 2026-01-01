-- Verify Subdomain Setup
-- This script checks if all required components for subdomain functionality are in place

-- 1. Check if orgs table has slug column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orgs' 
  AND column_name = 'slug';

-- 2. Check if slug column has unique constraint
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.orgs'::regclass
  AND contype = 'u'
  AND conkey::text LIKE '%slug%';

-- 3. Check RLS is enabled on orgs table
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'orgs';

-- 4. Check if anon_select_orgs_public policy exists
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
  AND tablename = 'orgs' 
  AND policyname = 'anon_select_orgs_public';

-- 5. Check for duplicate slugs (should be none)
SELECT 
    slug,
    COUNT(*) as count
FROM public.orgs
GROUP BY slug
HAVING COUNT(*) > 1;

-- 6. Check for invalid slugs (empty, null, or too short)
SELECT 
    id,
    name,
    slug,
    CASE 
        WHEN slug IS NULL THEN 'NULL slug'
        WHEN slug = '' THEN 'Empty slug'
        WHEN LENGTH(slug) < 3 THEN 'Too short (< 3 chars)'
        WHEN slug !~ '^[a-z0-9-]+$' THEN 'Invalid characters (should be lowercase, numbers, hyphens only)'
        ELSE 'OK'
    END AS slug_status
FROM public.orgs
WHERE slug IS NULL 
   OR slug = '' 
   OR LENGTH(slug) < 3
   OR slug !~ '^[a-z0-9-]+$';

-- 7. Summary
SELECT 
    'Subdomain Setup Verification' AS check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'orgs' 
              AND column_name = 'slug'
        ) THEN '✅ slug column exists'
        ELSE '❌ slug column missing'
    END AS slug_column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = 'orgs' 
              AND policyname = 'anon_select_orgs_public'
        ) THEN '✅ RLS policy exists'
        ELSE '❌ RLS policy missing'
    END AS rls_policy_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename = 'orgs' 
              AND rowsecurity = true
        ) THEN '✅ RLS enabled'
        ELSE '❌ RLS not enabled'
    END AS rls_enabled_check;

