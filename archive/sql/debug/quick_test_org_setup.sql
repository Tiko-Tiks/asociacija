-- ============================================
-- QUICK TEST ORG SETUP (Copy-Paste Ready)
-- ============================================
--
-- INSTRUCTIONS:
-- 1. Replace {YOUR_USER_ID} with your actual user ID
-- 2. Run all commands in order
-- 3. Save the returned IDs for verification
-- ============================================

-- Get your user ID first:
SELECT id, email FROM users WHERE email = 'YOUR_EMAIL@example.com';
-- Copy the returned ID

-- ============================================
-- SINGLE TRANSACTION SETUP
-- ============================================

BEGIN;

-- 1. Create test org
WITH new_org AS (
  INSERT INTO orgs (name, slug, org_type, status, description)
  VALUES (
    'TEST - Development',
    'test-dev',
    'COMMUNITY',
    'DRAFT',
    '⚠️ TEST ENVIRONMENT - Safe to experiment'
  )
  RETURNING id
),
-- 2. Create ruleset
new_ruleset AS (
  INSERT INTO org_rulesets (org_id, name, version, is_active)
  SELECT id, 'Test Ruleset', '1.0', true
  FROM new_org
  RETURNING id, org_id
),
-- 3. Link ruleset to org
updated_org AS (
  UPDATE orgs o
  SET active_ruleset = r.id,
      status = 'ACTIVE'
  FROM new_ruleset r
  WHERE o.id = r.org_id
  RETURNING o.id, o.slug
),
-- 4. Add governance config
new_configs AS (
  INSERT INTO governance_configs (org_id, config_key, config_value)
  SELECT id, 'require_owner_approval', 'false' FROM new_org
  UNION ALL
  SELECT id, 'default_voting_duration_days', '7' FROM new_org
  UNION ALL
  SELECT id, 'early_voting_days', '2' FROM new_org
  RETURNING org_id
),
-- 5. Add you as OWNER
new_membership AS (
  INSERT INTO memberships (org_id, user_id, role, status, member_status)
  SELECT 
    o.id,
    '{YOUR_USER_ID}', -- ⚠️ REPLACE THIS
    'OWNER',
    'ACTIVE',
    'ACTIVE'
  FROM new_org o
  RETURNING org_id, user_id
)
-- 6. Return results
SELECT 
  o.id as org_id,
  o.slug,
  o.status,
  r.id as ruleset_id,
  m.user_id
FROM updated_org o
JOIN new_ruleset r ON r.org_id = o.id
JOIN new_membership m ON m.org_id = o.id;

COMMIT;

-- ============================================
-- Verify (run after commit)
-- ============================================

SELECT 
  o.slug,
  o.status,
  o.active_ruleset IS NOT NULL as has_ruleset,
  COUNT(m.id) as owner_count
FROM orgs o
LEFT JOIN memberships m ON m.org_id = o.id 
  AND m.role = 'OWNER' 
  AND m.status = 'ACTIVE'
WHERE o.slug = 'test-dev'
GROUP BY o.id, o.slug, o.status, o.active_ruleset;

-- Expected: slug='test-dev', status='ACTIVE', has_ruleset=true, owner_count=1

-- ✅ SUCCESS! Navigate to: /dashboard/test-dev

