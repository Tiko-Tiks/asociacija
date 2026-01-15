-- ============================================
-- TEST ORGANIZATION SETUP SCRIPT
-- ============================================
-- 
-- Purpose: Create a dedicated test organization for safe experimentation
-- Usage: Run once to set up test environment
-- Cleanup: Can be marked INACTIVE or kept for future testing
--
-- GOVERNANCE COMPLIANT:
-- - No data deletion
-- - Proper audit trail
-- - Valid organization lifecycle
-- ============================================

-- ============================================
-- STEP 1: Create Test Organization
-- ============================================

-- Insert test organization
-- Returns: org_id (save this for later steps)
INSERT INTO orgs (
  name,
  slug,
  org_type,
  status,
  description,
  created_at,
  updated_at
)
VALUES (
  'TEST - Development Environment',
  'test-dev',
  'COMMUNITY',
  'DRAFT', -- Start as DRAFT, will activate later
  '⚠️ TEST ENVIRONMENT - Safe to experiment. This organization is for development and testing purposes only.',
  NOW(),
  NOW()
)
RETURNING id, slug;

-- Save the returned ID as: TEST_ORG_ID
-- Example output: id = '123e4567-e89b-12d3-a456-426614174000', slug = 'test-dev'

-- ============================================
-- STEP 2: Create Test Ruleset (Required for ACTIVE status)
-- ============================================

-- First, get the test org ID from Step 1
-- Replace {TEST_ORG_ID} with actual ID

INSERT INTO org_rulesets (
  org_id,
  name,
  description,
  version,
  is_active,
  created_at
)
VALUES (
  '{TEST_ORG_ID}', -- Replace with actual org_id from Step 1
  'Test Ruleset v1.0',
  'Basic ruleset for test environment',
  '1.0',
  true,
  NOW()
)
RETURNING id;

-- Save the returned ID as: TEST_RULESET_ID

-- ============================================
-- STEP 3: Create Governance Config (Optional but recommended)
-- ============================================

INSERT INTO governance_configs (
  org_id,
  config_key,
  config_value,
  description,
  created_at
)
VALUES 
  -- Member approval settings
  (
    '{TEST_ORG_ID}',
    'require_owner_approval',
    'false', -- Auto-approve for faster testing
    'Test environment - auto approve members',
    NOW()
  ),
  -- Voting settings
  (
    '{TEST_ORG_ID}',
    'default_voting_duration_days',
    '7',
    'Test voting duration',
    NOW()
  ),
  -- Early voting
  (
    '{TEST_ORG_ID}',
    'early_voting_days',
    '2',
    'Test early voting period',
    NOW()
  );

-- ============================================
-- STEP 4: Link Ruleset to Organization
-- ============================================

UPDATE orgs
SET active_ruleset = '{TEST_RULESET_ID}' -- Replace with actual ruleset_id from Step 2
WHERE id = '{TEST_ORG_ID}';

-- ============================================
-- STEP 5: Activate Test Organization
-- ============================================

UPDATE orgs
SET status = 'ACTIVE',
    updated_at = NOW()
WHERE id = '{TEST_ORG_ID}';

-- ============================================
-- STEP 6: Add Your User as OWNER (Required)
-- ============================================

-- Get your user_id first:
-- SELECT id, email FROM users WHERE email = 'your.email@example.com';

-- Replace {YOUR_USER_ID} with your actual user ID
INSERT INTO memberships (
  org_id,
  user_id,
  role,
  status,
  member_status,
  created_at
)
VALUES (
  '{TEST_ORG_ID}',
  '{YOUR_USER_ID}', -- Replace with your user_id
  'OWNER',
  'ACTIVE',
  'ACTIVE',
  NOW()
)
RETURNING id;

-- ============================================
-- STEP 7: Verify Setup
-- ============================================

-- Check organization
SELECT 
  id,
  name,
  slug,
  org_type,
  status,
  active_ruleset
FROM orgs
WHERE slug = 'test-dev';

-- Should show:
-- - status = 'ACTIVE'
-- - active_ruleset = (UUID)

-- Check your membership
SELECT 
  m.role,
  m.status,
  m.member_status,
  u.email
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.org_id = '{TEST_ORG_ID}';

-- Should show:
-- - role = 'OWNER'
-- - status = 'ACTIVE'
-- - member_status = 'ACTIVE'

-- Check governance config
SELECT 
  config_key,
  config_value
FROM governance_configs
WHERE org_id = '{TEST_ORG_ID}'
ORDER BY config_key;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Quick check - everything in one query
SELECT 
  o.slug,
  o.status AS org_status,
  o.active_ruleset IS NOT NULL AS has_ruleset,
  COUNT(DISTINCT m.id) AS member_count,
  COUNT(DISTINCT gc.id) AS config_count
FROM orgs o
LEFT JOIN memberships m ON m.org_id = o.id AND m.status = 'ACTIVE'
LEFT JOIN governance_configs gc ON gc.org_id = o.id
WHERE o.slug = 'test-dev'
GROUP BY o.id, o.slug, o.status, o.active_ruleset;

-- Expected output:
-- slug: test-dev
-- org_status: ACTIVE
-- has_ruleset: true
-- member_count: 1 (you)
-- config_count: 3

-- ============================================
-- SUCCESS!
-- ============================================
-- Your test organization is ready at:
-- /dashboard/test-dev
--
-- Next steps:
-- 1. Navigate to /dashboard/test-dev/admin/test-users
-- 2. Create test users
-- 3. Start testing your features!
-- ============================================

-- ============================================
-- CLEANUP (Optional - for later)
-- ============================================

-- When you're done with test org (months later):
-- Option 1: Mark as INACTIVE (keeps all data)
-- UPDATE orgs 
-- SET status = 'INACTIVE',
--     updated_at = NOW()
-- WHERE slug = 'test-dev';

-- Option 2: Keep it for future testing
-- (Do nothing - it's isolated and harmless)

-- ============================================
-- ROLLBACK (If something went wrong)
-- ============================================

-- Only use if setup failed and you want to start over
-- WARNING: This will remove the test org and all related data

-- Step 1: Mark all memberships as LEFT
-- UPDATE memberships
-- SET member_status = 'LEFT',
--     status_reason = 'Test org rollback'
-- WHERE org_id = '{TEST_ORG_ID}';

-- Step 2: Mark org as INACTIVE
-- UPDATE orgs
-- SET status = 'INACTIVE'
-- WHERE id = '{TEST_ORG_ID}';

-- Note: We don't DELETE - Constitution Rule #5
-- Instead, the org is marked INACTIVE and can be ignored

-- ============================================
-- END OF SCRIPT
-- ============================================

