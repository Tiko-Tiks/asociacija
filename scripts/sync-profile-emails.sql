-- Sync emails from auth.users to profiles table
-- Run this in Supabase SQL Editor after creating users

-- Option 1: Update ALL profiles that don't have email
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND (p.email IS NULL OR p.email = '');

-- Option 2: Update a SPECIFIC user by email
-- Replace 'user@example.com' with the actual email
-- UPDATE public.profiles p
-- SET email = 'user@example.com'
-- FROM auth.users u
-- WHERE p.id = u.id
-- AND u.email = 'user@example.com';

-- Verify the update
SELECT p.id, p.email, p.full_name, u.email as auth_email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
