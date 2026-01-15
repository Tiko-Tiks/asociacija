-- Check final state
SELECT 
  o.name as org_name,
  o.id as org_id,
  p.email,
  m.role,
  m.member_status,
  CASE 
    WHEN o.id = '678b0788-b544-4bf8-8cf5-44dfb2185a52' THEN '✅ TARGET'
    ELSE '❌ SHOULD BE EMPTY'
  END as expected
FROM orgs o
LEFT JOIN memberships m ON m.org_id = o.id AND m.member_status = 'ACTIVE'
LEFT JOIN profiles p ON p.id = m.user_id
WHERE m.id IS NOT NULL
ORDER BY o.name, m.role DESC, p.email;

