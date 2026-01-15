-- FINAL NUCLEAR OPTION: Mark ALL as LEFT, then reactivate target org only

BEGIN;

-- Step 1: Mark ALL user1/2/3 memberships as LEFT
UPDATE memberships
SET member_status = 'LEFT', left_at = NOW(), status_reason = 'NUCLEAR CLEANUP'
WHERE user_id IN (
  SELECT id FROM profiles WHERE email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
)
AND member_status = 'ACTIVE';

-- Step 2: Reactivate ONLY target org memberships
UPDATE memberships
SET member_status = 'ACTIVE', left_at = NULL
WHERE user_id IN (
  SELECT id FROM profiles WHERE email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
)
AND org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52';

COMMIT;

-- Verify
SELECT 
  p.email,
  o.name as org_name,
  m.member_status
FROM profiles p
JOIN memberships m ON m.user_id = p.id
JOIN orgs o ON o.id = m.org_id
WHERE p.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
ORDER BY p.email, m.member_status, o.name;

