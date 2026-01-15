-- Check what memberships exist
SELECT 
  p.email,
  o.name as org_name,
  m.role,
  m.member_status,
  m.left_at
FROM profiles p
JOIN memberships m ON m.user_id = p.id
JOIN orgs o ON o.id = m.org_id
WHERE p.email IN ('owner2@test.lt', 'owner3@test.lt', 'info@kruminiai.lt')
ORDER BY p.email, m.member_status, o.name;

