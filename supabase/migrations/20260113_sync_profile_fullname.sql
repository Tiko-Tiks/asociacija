-- ============================================================================
-- FIX: Sync full_name from auth.users to profiles
-- ============================================================================
-- 
-- PROBLEM: profiles.full_name is empty for some users because:
--          1. handle_new_user trigger doesn't copy full_name from user_metadata
--          2. Old registration flow didn't update profiles table
--
-- SOLUTION: One-time migration to copy full_name from auth.users.raw_user_meta_data
--           to profiles.full_name for all users where profiles.full_name is empty
--
-- NOTE: This is a one-time fix. The auth.ts login function now syncs
--       full_name automatically on each login.
--
-- ============================================================================

-- Update profiles.full_name from auth.users.raw_user_meta_data where empty
UPDATE public.profiles p
SET 
  full_name = COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p.id),
    p.full_name
  ),
  email = COALESCE(
    p.email,
    (SELECT email FROM auth.users WHERE id = p.id)
  ),
  updated_at = now()
WHERE 
  (p.full_name IS NULL OR p.full_name = '' OR LENGTH(TRIM(p.full_name)) < 2)
  AND EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = p.id 
    AND u.raw_user_meta_data->>'full_name' IS NOT NULL
    AND LENGTH(TRIM(u.raw_user_meta_data->>'full_name')) >= 2
  );

-- Also update profiles.email if empty
UPDATE public.profiles p
SET 
  email = (SELECT email FROM auth.users WHERE id = p.id),
  updated_at = now()
WHERE 
  (p.email IS NULL OR p.email = '')
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = p.id AND email IS NOT NULL);

