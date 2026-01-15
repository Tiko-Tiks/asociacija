-- Show current multi-org users in detail
SELECT 
  p.email,
  o.name as org_name,
  o.id as org_id,
  m.role,
  m.member_status,
  CASE 
    WHEN o.id = '678b0788-b544-4bf8-8cf5-44dfb2185a52' THEN '✅ TARGET (keep)'
    ELSE '❌ SHOULD BE LEFT'
  END as expected
FROM profiles p
JOIN memberships m ON m.user_id = p.id
JOIN orgs o ON o.id = m.org_id
WHERE m.member_status = 'ACTIVE'
  AND p.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt', 'admin@pastas.email')
ORDER BY p.email, o.name;

