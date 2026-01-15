-- Test RLS on member_debts view as authenticated user
-- This simulates what happens when server action runs

-- First, check if you can query it directly (as postgres superuser)
SELECT 'Direct query (superuser):' as test, COUNT(*) as rows
FROM member_debts
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52';

-- Now test what authenticated user sees
-- Note: This won't work in SQL editor (no auth context)
-- But will show if view has any RLS issues

-- Check if view is accessible
SELECT 
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE viewname = 'member_debts';

-- Check grants on view
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'member_debts';

