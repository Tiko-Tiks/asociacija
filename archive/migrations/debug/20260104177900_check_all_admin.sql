-- Check ALL admin memberships (including LEFT)
SELECT 
  p.email,
  o.name,
  o.status as org_status,
  m.role,
  m.member_status,
  m.left_at
FROM memberships m
JOIN profiles p ON p.id = m.user_id
JOIN orgs o ON o.id = m.org_id
WHERE p.email = 'admin@pastas.email'
ORDER BY m.member_status, o.name;

