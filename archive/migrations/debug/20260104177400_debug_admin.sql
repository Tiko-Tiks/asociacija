-- Debug admin memberships
SELECT 
  m.id,
  p.email,
  o.name,
  o.status as org_status,
  m.role,
  m.member_status
FROM memberships m
JOIN profiles p ON p.id = m.user_id
JOIN orgs o ON o.id = m.org_id
WHERE p.email = 'admin@pastas.email'
ORDER BY o.name;

