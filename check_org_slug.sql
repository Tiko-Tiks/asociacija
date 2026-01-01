-- SQL script to check org slug and RLS policies
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if org exists and has a slug
SELECT 
    id,
    name,
    slug,
    CASE 
        WHEN slug IS NULL THEN 'SLUG IS NULL'
        WHEN slug = '' THEN 'SLUG IS EMPTY'
        ELSE 'SLUG EXISTS'
    END as slug_status
FROM orgs
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check RLS policies on orgs table
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
WHERE tablename = 'orgs';

-- 3. Test if anon user can read orgs (run as anon role)
-- This simulates what the public client does
SET ROLE anon;
SELECT id, name, slug FROM orgs LIMIT 1;
RESET ROLE;

