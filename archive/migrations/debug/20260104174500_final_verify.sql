SELECT 
  p.email,
  COUNT(*) FILTER (WHERE m.member_status = 'ACTIVE') as active_orgs,
  array_agg(o.name) FILTER (WHERE m.member_status = 'ACTIVE') as org_names
FROM profiles p
LEFT JOIN memberships m ON m.user_id = p.id
LEFT JOIN orgs o ON o.id = m.org_id
WHERE p.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
GROUP BY p.email
ORDER BY p.email;

