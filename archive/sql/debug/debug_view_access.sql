-- Direct test of member_debts view with org_id
SELECT COUNT(*) as total_rows
FROM member_debts
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52';

-- Test if view returns any data
SELECT *
FROM member_debts
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
LIMIT 3;

-- Test underlying memberships
SELECT COUNT(*) as active_members
FROM memberships
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
  AND member_status = 'ACTIVE';

-- Test if profiles join works
SELECT 
  m.id,
  m.user_id,
  p.full_name,
  p.email
FROM memberships m
LEFT JOIN profiles p ON p.id = m.user_id
WHERE m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
  AND m.member_status = 'ACTIVE'
LIMIT 3;

