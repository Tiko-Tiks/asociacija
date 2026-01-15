-- ============================================
-- TEST MEMBERS WITH AUTH (Quick Switch Setup)
-- ============================================
--
-- Purpose: Create test MEMBER users with known passwords for easy switching
-- Security: DEVELOPMENT ONLY - never use in production
-- 
-- What this creates:
-- - 5 test MEMBER users (no OWNER)
-- - Test users in auth.users (can login)
-- - Corresponding users in public.users
-- - Memberships in test org with MEMBER role
-- - Known password: "Test123!" for all
-- ============================================

-- PREREQUISITES:
-- 1. Test org must exist (run quick_test_org_setup.sql first)
-- 2. Get test org ID: SELECT id FROM orgs WHERE slug = 'test-dev';
-- 3. Update v_org_id below with your actual org ID

-- ============================================
-- CONFIGURATION
-- ============================================

-- Test password (same for all test users for easy switching)
-- Password: Test123!
-- ⚠️ NEVER use this in production!

-- Your test org ID
-- Current: 678b0788-b544-4bf8-8cf5-44dfb2185a52

-- ============================================
-- CREATE 5 TEST MEMBERS
-- ============================================

-- Note: This SQL creates public.users and memberships
-- Actual auth.users need to be created via Supabase Dashboard or API

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- ⚠️ Update this with your test org ID
  v_test_users text[] := ARRAY[
    'test.member.1@example.com',
    'test.member.2@example.com',
    'test.member.3@example.com',
    'test.member.4@example.com',
    'test.voter@example.com'
  ];
  v_test_names text[] := ARRAY[
    'Member #1',
    'Member #2',
    'Member #3',
    'Member #4',
    'Voter'
  ];
  v_email text;
  v_name text;
  v_user_id uuid;
BEGIN
  FOR i IN 1..array_length(v_test_users, 1) LOOP
    v_email := v_test_users[i];
    v_name := v_test_names[i];
    
    -- Insert into public.users
    INSERT INTO users (email, first_name, last_name)
    VALUES (
      v_email,
      'Test',
      v_name  -- Full name: "Member #1", "Voter", etc.
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_user_id;
    
    -- Add membership to test org (ALL as MEMBER role)
    IF v_user_id IS NOT NULL THEN
      INSERT INTO memberships (org_id, user_id, role, status, member_status)
      VALUES (
        v_org_id,
        v_user_id,
        'MEMBER',  -- All users are MEMBER role
        'ACTIVE',
        'ACTIVE'
      )
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Created member: % (ID: %)', v_email, v_user_id;
    ELSE
      RAISE NOTICE 'User already exists: %', v_email;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check created users
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  m.role,
  m.member_status
FROM users u
LEFT JOIN memberships m ON m.user_id = u.id
WHERE u.email LIKE 'test.%@example.com'
  AND m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
ORDER BY u.email;

-- ============================================
-- NEXT STEPS: Create Auth Users
-- ============================================

-- These users need to be created via Supabase Auth
-- Options:

-- OPTION A: Use Supabase Dashboard (RECOMMENDED)
-- 1. Go to: Supabase Dashboard → Authentication → Users
-- 2. Click "Add user"
-- 3. For each user below:
--    - Email: test.member.1@example.com
--    - Password: Test123!
--    - ✅ Auto Confirm User = ON
-- 4. Repeat for all 5 users

-- OPTION B: Use signup endpoint
-- POST /auth/v1/signup for each user
-- { "email": "test.member.1@example.com", "password": "Test123!" }

-- ============================================
-- TEST MEMBER CREDENTIALS
-- ============================================

/*
Use these credentials to login and test:

ALL USERS ARE MEMBERS (no OWNER)

1. TEST MEMBER #1
   Email: test.member.1@example.com
   Password: Test123!
   Role: MEMBER
   Purpose: General member actions, create drafts, vote

2. TEST MEMBER #2
   Email: test.member.2@example.com
   Password: Test123!
   Role: MEMBER
   Purpose: Test multiple member interactions, voting

3. TEST MEMBER #3
   Email: test.member.3@example.com
   Password: Test123!
   Role: MEMBER
   Purpose: Additional member for voting scenarios

4. TEST MEMBER #4
   Email: test.member.4@example.com
   Password: Test123!
   Role: MEMBER
   Purpose: Test member permissions, group actions

5. TEST VOTER
   Email: test.voter@example.com
   Password: Test123!
   Role: MEMBER
   Purpose: Focus on voting features, tallying

Note: All users are MEMBER role. You'll need a separate OWNER user
      to approve resolutions and manage the organization.
*/

-- ============================================
-- QUICK REFERENCE CARD (Print This!)
-- ============================================

/*
═══════════════════════════════════════════════
        TEST MEMBERS QUICK REFERENCE
═══════════════════════════════════════════════

All passwords: Test123!
All roles: MEMBER

Member Users:
├─ test.member.1@example.com (MEMBER)
├─ test.member.2@example.com (MEMBER)
├─ test.member.3@example.com (MEMBER)
├─ test.member.4@example.com (MEMBER)
└─ test.voter@example.com (MEMBER)

Member Capabilities:
├─ View resolutions
├─ Vote on proposals
├─ Create draft resolutions
├─ View member dashboard
├─ Participate in meetings
└─ Access member features

Cannot Do (Need OWNER):
├─ Approve resolutions
├─ Manage member status
├─ Access admin features
└─ Change org settings

Organization: test-dev
URL: /dashboard/test-dev

Org ID: 678b0788-b544-4bf8-8cf5-44dfb2185a52

═══════════════════════════════════════════════
*/

-- ============================================
-- CREATE AUTH USERS (Helper SQL for reference)
-- ============================================

-- Note: This needs to be done via Supabase Dashboard or Auth API
-- Cannot be done directly in SQL

/*
Manual steps in Supabase Dashboard:

For each email below:
1. Authentication → Users → Add user
2. Email: [email from list]
3. Password: Test123!
4. Auto Confirm User: YES
5. Click "Create user"

User list:
- test.member.1@example.com
- test.member.2@example.com
- test.member.3@example.com
- test.member.4@example.com
- test.voter@example.com
*/

-- ============================================
-- CLEANUP (When Done)
-- ============================================

-- Mark all test members as LEFT
UPDATE memberships m
SET member_status = 'LEFT',
    status_reason = 'Test session completed',
    updated_at = NOW()
FROM users u
WHERE m.user_id = u.id
  AND m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'  -- Your test org ID
  AND u.email LIKE 'test.%@example.com';

-- Verify cleanup
SELECT 
  u.email,
  m.member_status
FROM users u
JOIN memberships m ON m.user_id = u.id
WHERE m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
  AND u.email LIKE 'test.%@example.com'
ORDER BY u.email;

-- Note: Auth users remain (can reactivate membership later)
-- To fully remove auth users, use Supabase Dashboard

-- ============================================
-- END OF SCRIPT
-- ============================================
