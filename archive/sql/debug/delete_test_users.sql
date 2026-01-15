-- ==================================================
-- DELETE TEST USERS AND ORGANIZATIONS - SAFE APPROACH
-- ==================================================
-- 
-- This script provides a safe way to delete test users and organizations from the database.
-- 
-- STEP 1: First, review what will be deleted (run the SELECT queries)
-- STEP 2: Then, if satisfied, run the DELETE statements
--
-- Test user patterns to identify:
-- - Email contains '@test' or '@example' or 'test@' or 'demo@'
-- - Email contains specific test domains
-- - Full name contains 'test' or 'Test' or 'TEST'
--
-- Test organization patterns to identify:
-- - Name contains 'test', 'Test', 'TEST', 'demo', 'Demo'
-- - Slug contains 'test', 'demo'
-- - Owner email is a test user email
-- 
-- IMPORTANT: This will cascade delete related data:
-- - profiles
-- - memberships
-- - organizations (and all related data via CASCADE)
-- - votes, resolutions, meetings, invoices, etc.
-- - other related records
--
-- ==================================================

-- ==================================================
-- STEP 1: REVIEW - See what will be deleted
-- ==================================================

-- View test users by email pattern
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.full_name,
  p.first_name,
  p.last_name,
  (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) as membership_count
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE 
  -- Common test email patterns
  u.email ILIKE '%@test%' OR
  u.email ILIKE '%@owner%' OR
  u.email ILIKE 'test@%' OR
  u.email ILIKE 'member@%' OR
  u.email ILIKE '%test.com' OR
  u.email ILIKE '%test..lt' OR
  -- Or by name pattern
  p.full_name ILIKE '%test%' OR
  p.first_name ILIKE '%test%' OR
  p.last_name ILIKE '%test%'
ORDER BY u.created_at DESC;

-- View memberships that will be affected
SELECT 
  m.id as membership_id,
  m.org_id,
  o.name as org_name,
  m.role,
  m.member_status,
  u.email,
  p.full_name
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN orgs o ON o.id = m.org_id
WHERE 
  u.email ILIKE '%@test%' OR
  u.email ILIKE '%@owner%' OR
  u.email ILIKE 'test@%' OR
  u.email ILIKE 'demo@%' OR
  u.email ILIKE '%test.com' OR
  u.email ILIKE '%example.com' OR
  p.full_name ILIKE '%test%' OR
  p.first_name ILIKE '%test%' OR
  p.last_name ILIKE '%test%'
ORDER BY m.created_at DESC;

-- View test organizations that will be deleted
SELECT 
  o.id,
  o.name,
  o.slug,
  o.status,
  o.created_at,
  (SELECT COUNT(*) FROM memberships m WHERE m.org_id = o.id) as member_count,
  (SELECT u.email FROM memberships m 
   JOIN auth.users u ON u.id = m.user_id 
   WHERE m.org_id = o.id AND m.role = 'OWNER' LIMIT 1) as owner_email
FROM orgs o
WHERE 
  -- By name pattern
  o.name ILIKE '%test%' OR
  o.name ILIKE '%demo%' OR
  o.name ILIKE '%Test%' OR
  o.name ILIKE '%Demo%' OR
  -- By slug pattern
  o.slug ILIKE '%test%' OR
  o.slug ILIKE '%demo%' OR
  -- By owner email (if owner is a test user)
  o.id IN (
    SELECT m.org_id
    FROM memberships m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.role = 'OWNER' AND (
      u.email ILIKE '%@test%' OR
      u.email ILIKE '%@example%' OR
      u.email ILIKE 'test@%' OR
      u.email ILIKE 'demo@%' OR
      u.email ILIKE '%test.com' OR
      u.email ILIKE '%example.com'
    )
  )
ORDER BY o.created_at DESC;

-- View all data that will be affected by organization deletion
SELECT 
  'memberships' as table_name,
  COUNT(*) as record_count
FROM memberships
WHERE org_id IN (
  SELECT o.id FROM orgs o
  WHERE 
    o.name ILIKE '%test%' OR o.name ILIKE '%demo%' OR
    o.slug ILIKE '%test%' OR o.slug ILIKE '%demo%' OR
    o.id IN (
      SELECT m.org_id FROM memberships m
      JOIN auth.users u ON u.id = m.user_id
      WHERE m.role = 'OWNER' AND (
        u.email ILIKE '%@test%' OR u.email ILIKE '%@example%' OR
        u.email ILIKE 'test@%' OR u.email ILIKE 'demo@%' OR
        u.email ILIKE '%test.com' OR u.email ILIKE '%example.com'
      )
    )
)
UNION ALL
SELECT 'resolutions', COUNT(*) FROM resolutions WHERE org_id IN (
  SELECT o.id FROM orgs o WHERE 
    o.name ILIKE '%test%' OR o.name ILIKE '%demo%' OR
    o.slug ILIKE '%test%' OR o.slug ILIKE '%demo%' OR
    o.id IN (SELECT m.org_id FROM memberships m JOIN auth.users u ON u.id = m.user_id WHERE m.role = 'OWNER' AND (u.email ILIKE '%@test%' OR u.email ILIKE '%@example%' OR u.email ILIKE 'test@%' OR u.email ILIKE 'demo@%' OR u.email ILIKE '%test.com' OR u.email ILIKE '%example.com'))
)
UNION ALL
SELECT 'meetings', COUNT(*) FROM meetings WHERE org_id IN (
  SELECT o.id FROM orgs o WHERE 
    o.name ILIKE '%test%' OR o.name ILIKE '%demo%' OR
    o.slug ILIKE '%test%' OR o.slug ILIKE '%demo%' OR
    o.id IN (SELECT m.org_id FROM memberships m JOIN auth.users u ON u.id = m.user_id WHERE m.role = 'OWNER' AND (u.email ILIKE '%@test%' OR u.email ILIKE '%@example%' OR u.email ILIKE 'test@%' OR u.email ILIKE 'demo@%' OR u.email ILIKE '%test.com' OR u.email ILIKE '%example.com'))
)
UNION ALL
SELECT 'votes', COUNT(*) FROM votes WHERE org_id IN (
  SELECT o.id FROM orgs o WHERE 
    o.name ILIKE '%test%' OR o.name ILIKE '%demo%' OR
    o.slug ILIKE '%test%' OR o.slug ILIKE '%demo%' OR
    o.id IN (SELECT m.org_id FROM memberships m JOIN auth.users u ON u.id = m.user_id WHERE m.role = 'OWNER' AND (u.email ILIKE '%@test%' OR u.email ILIKE '%@example%' OR u.email ILIKE 'test@%' OR u.email ILIKE 'demo@%' OR u.email ILIKE '%test.com' OR u.email ILIKE '%example.com'))
)
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE membership_id IN (
  SELECT m.id FROM memberships m WHERE m.org_id IN (
    SELECT o.id FROM orgs o WHERE 
      o.name ILIKE '%test%' OR o.name ILIKE '%demo%' OR
      o.slug ILIKE '%test%' OR o.slug ILIKE '%demo%' OR
      o.id IN (SELECT m2.org_id FROM memberships m2 JOIN auth.users u ON u.id = m2.user_id WHERE m2.role = 'OWNER' AND (u.email ILIKE '%@test%' OR u.email ILIKE '%@example%' OR u.email ILIKE 'test@%' OR u.email ILIKE 'demo@%' OR u.email ILIKE '%test.com' OR u.email ILIKE '%example.com'))
  )
);

-- ==================================================
-- STEP 2: DELETE - Run these only after reviewing
-- ==================================================

-- IMPORTANT: Run in a transaction so you can rollback if needed
BEGIN;

-- ==================================================
-- PART A: Delete test organizations first
-- ==================================================
-- Note: Most tables have ON DELETE CASCADE, so deleting orgs
-- will automatically delete related data (memberships, resolutions, 
-- meetings, votes, invoices, etc.)

DELETE FROM orgs
WHERE 
  -- By name pattern
  name ILIKE '%test%' OR
  name ILIKE '%demo%' OR
  name ILIKE '%Test%' OR
  name ILIKE '%Demo%' OR
  -- By slug pattern
  slug ILIKE '%test%' OR
  slug ILIKE '%demo%' OR
  -- By owner email (if owner is a test user)
  id IN (
    SELECT m.org_id
    FROM memberships m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.role = 'OWNER' AND (
      u.email ILIKE '%@test%' OR
      u.email ILIKE '%@example%' OR
      u.email ILIKE 'test@%' OR
      u.email ILIKE 'demo@%' OR
      u.email ILIKE '%test.com' OR
      u.email ILIKE '%example.com'
    )
  );

-- ==================================================
-- PART B: Delete test users (after orgs are deleted)
-- ==================================================

-- Delete memberships for test users (that weren't deleted by org CASCADE)
DELETE FROM memberships
WHERE user_id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE 
    u.email ILIKE '%@test%' OR
    u.email ILIKE '%@example%' OR
    u.email ILIKE 'test@%' OR
    u.email ILIKE 'demo@%' OR
    u.email ILIKE '%test.com' OR
    u.email ILIKE '%example.com' OR
    p.full_name ILIKE '%test%' OR
    p.first_name ILIKE '%test%' OR
    p.last_name ILIKE '%test%'
);

-- Delete profiles
DELETE FROM profiles
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE 
    u.email ILIKE '%@test%' OR
    u.email ILIKE '%@example%' OR
    u.email ILIKE 'test@%' OR
    u.email ILIKE 'demo@%' OR
    u.email ILIKE '%test.com' OR
    u.email ILIKE '%example.com' OR
    p.full_name ILIKE '%test%' OR
    p.first_name ILIKE '%test%' OR
    p.last_name ILIKE '%test%'
);

-- Delete from auth.users (Supabase auth)
-- Note: This requires admin access to auth schema
DELETE FROM auth.users
WHERE 
  email ILIKE '%@test%' OR
  email ILIKE '%@example%' OR
  email ILIKE 'test@%' OR
  email ILIKE 'demo@%' OR
  email ILIKE '%test.com' OR
  email ILIKE '%example.com' OR
  id IN (
    SELECT p.id
    FROM profiles p
    WHERE 
      p.full_name ILIKE '%test%' OR
      p.first_name ILIKE '%test%' OR
      p.last_name ILIKE '%test%'
  );

-- Review the changes before committing
-- If everything looks good, run: COMMIT;
-- If something is wrong, run: ROLLBACK;

-- COMMIT;  -- Uncomment to commit the changes
-- ROLLBACK;  -- Uncomment to rollback the changes

-- ==================================================
-- ALTERNATIVE: Delete by specific email/org list
-- ==================================================
-- If you have a specific list of test user emails and org slugs:

/*
BEGIN;

-- Delete specific organizations
DELETE FROM orgs
WHERE slug IN (
  'test-org-1',
  'test-org-2',
  'demo-org'
);

-- Delete specific users
DELETE FROM memberships
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN (
    'test1@example.com',
    'test2@example.com',
    'demo@test.com'
  )
);

DELETE FROM profiles
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN (
    'test1@example.com',
    'test2@example.com',
    'demo@test.com'
  )
);

DELETE FROM auth.users
WHERE email IN (
  'test1@example.com',
  'test2@example.com',
  'demo@test.com'
);

COMMIT;
*/

-- ==================================================
-- ALTERNATIVE: Delete by date range (recent test data)
-- ==================================================
-- If test users and organizations were created recently:

/*
BEGIN;

-- Delete organizations created in the last 7 days (adjust as needed)
DELETE FROM orgs
WHERE created_at > NOW() - INTERVAL '7 days';

-- Delete users created in the last 7 days
DELETE FROM memberships
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE created_at > NOW() - INTERVAL '7 days'
);

DELETE FROM profiles
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE created_at > NOW() - INTERVAL '7 days'
);

DELETE FROM auth.users
WHERE created_at > NOW() - INTERVAL '7 days';

COMMIT;
*/

-- ==================================================
-- ALTERNATIVE: Delete only organizations (keep users)
-- ==================================================
-- If you want to delete test organizations but keep the users:

/*
BEGIN;

-- This will delete orgs and cascade delete memberships,
-- but users will remain (they just won't have memberships)
DELETE FROM orgs
WHERE 
  name ILIKE '%test%' OR
  name ILIKE '%demo%' OR
  slug ILIKE '%test%' OR
  slug ILIKE '%demo%';

COMMIT;
*/

