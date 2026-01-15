-- ============================================
-- CREATE MULTIPLE TEST USERS (Batch)
-- ============================================
--
-- Purpose: Quickly create multiple test users for testing
-- Usage: Run after test org is created
-- Cleanup: Use markTestUsersAsLeft() function
-- ============================================

-- Get test org ID
SELECT id FROM orgs WHERE slug = 'test-dev';
-- Save as: TEST_ORG_ID

-- ============================================
-- OPTION 1: Create Test Users (5 common roles)
-- ============================================

BEGIN;

-- Create users
WITH new_users AS (
  INSERT INTO users (email, first_name, last_name, created_at)
  VALUES 
    ('test.chairman@example.com', 'Test', 'Chairman', NOW()),
    ('test.voter.1@example.com', 'Test', 'Voter #1', NOW()),
    ('test.voter.2@example.com', 'Test', 'Voter #2', NOW()),
    ('test.member.1@example.com', 'Test', 'Member #1', NOW()),
    ('test.member.2@example.com', 'Test', 'Member #2', NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email, first_name, last_name
),
-- Add as members to test org
new_memberships AS (
  INSERT INTO memberships (org_id, user_id, role, status, member_status)
  SELECT 
    '{TEST_ORG_ID}', -- Replace with test org ID
    id,
    'MEMBER', -- All as MEMBER role for now
    'ACTIVE',
    'ACTIVE'
  FROM new_users
  RETURNING org_id, user_id
)
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  m.role,
  m.member_status
FROM new_users u
JOIN new_memberships m ON m.user_id = u.id;

COMMIT;

-- ============================================
-- OPTION 2: Create 10 Test Voters (Loop)
-- ============================================

-- For bulk testing (e.g., voting scenarios)

BEGIN;

WITH new_users AS (
  INSERT INTO users (email, first_name, last_name)
  SELECT 
    'test.voter.' || n || '@example.com',
    'Test',
    'Voter #' || n
  FROM generate_series(1, 10) n
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
),
new_memberships AS (
  INSERT INTO memberships (org_id, user_id, role, status, member_status)
  SELECT 
    '{TEST_ORG_ID}',
    id,
    'MEMBER',
    'ACTIVE',
    'ACTIVE'
  FROM new_users
  RETURNING user_id
)
SELECT COUNT(*) as created_count FROM new_memberships;

COMMIT;

-- ============================================
-- OPTION 3: Create Custom Set
-- ============================================

-- Customize as needed for your testing scenario

BEGIN;

WITH new_users AS (
  INSERT INTO users (email, first_name, last_name)
  VALUES 
    ('test.owner@example.com', 'Test', 'Owner'),
    ('test.admin@example.com', 'Test', 'Admin'),
    ('test.treasurer@example.com', 'Test', 'Treasurer'),
    ('test.secretary@example.com', 'Test', 'Secretary')
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email, last_name
),
new_memberships AS (
  INSERT INTO memberships (org_id, user_id, role, status, member_status)
  SELECT 
    '{TEST_ORG_ID}',
    id,
    CASE 
      WHEN email = 'test.owner@example.com' THEN 'OWNER'
      ELSE 'MEMBER'
    END,
    'ACTIVE',
    'ACTIVE'
  FROM new_users
  RETURNING user_id
)
SELECT u.email, u.last_name, 'created' as status
FROM new_users u;

COMMIT;

-- ============================================
-- VERIFY CREATED USERS
-- ============================================

-- Check test users in test org
SELECT 
  u.email,
  u.first_name,
  u.last_name,
  m.role,
  m.member_status
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.org_id = '{TEST_ORG_ID}'
  AND (u.email LIKE 'test.%' OR u.first_name = 'Test')
ORDER BY u.email;

-- Count by role
SELECT 
  m.role,
  m.member_status,
  COUNT(*) as count
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.org_id = '{TEST_ORG_ID}'
  AND (u.email LIKE 'test.%' OR u.first_name = 'Test')
GROUP BY m.role, m.member_status;

-- ============================================
-- CLEANUP (When Done Testing)
-- ============================================

-- Mark all test users as LEFT
UPDATE memberships m
SET member_status = 'LEFT',
    status_reason = 'Test session completed',
    updated_at = NOW()
FROM users u
WHERE m.user_id = u.id
  AND m.org_id = '{TEST_ORG_ID}'
  AND (u.email LIKE 'test.%' OR u.first_name = 'Test')
  AND m.member_status != 'LEFT';

-- Verify cleanup
SELECT 
  m.member_status,
  COUNT(*) as count
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.org_id = '{TEST_ORG_ID}'
  AND (u.email LIKE 'test.%' OR u.first_name = 'Test')
GROUP BY m.member_status;

-- Expected: All should be 'LEFT'

-- ============================================
-- QUICK TEMPLATES
-- ============================================

-- Single test voter:
-- INSERT INTO users (email, first_name, last_name)
-- VALUES ('test.voter.N@example.com', 'Test', 'Voter #N')
-- ON CONFLICT (email) DO NOTHING;

-- Add to org:
-- INSERT INTO memberships (org_id, user_id, role, status, member_status)
-- VALUES ('{TEST_ORG_ID}', (SELECT id FROM users WHERE email = 'test.voter.N@example.com'), 'MEMBER', 'ACTIVE', 'ACTIVE');

-- ============================================
-- END OF SCRIPT
-- ============================================

