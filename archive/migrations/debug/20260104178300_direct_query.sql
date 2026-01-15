-- DIRECT query - bypass cache
SELECT 
  'Direct Query' as source,
  p.email,
  o.name,
  o.status as org_status,
  m.member_status,
  m.left_at
FROM memberships m
JOIN profiles p ON p.id = m.user_id
JOIN orgs o ON o.id = m.org_id
WHERE p.email = 'admin@pastas.email'
ORDER BY m.member_status, o.name;

-- Count
SELECT 
  member_status,
  COUNT(*) as count
FROM memberships m
JOIN profiles p ON p.id = m.user_id
WHERE p.email = 'admin@pastas.email'
GROUP BY member_status;

