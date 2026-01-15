SELECT 
  p.email,
  o.name as org_name,
  o.id as org_id,
  m.role,
  m.member_status
FROM memberships m
JOIN profiles p ON p.id = m.user_id
JOIN orgs o ON o.id = m.org_id
ORDER BY o.name, m.member_status, p.email;

