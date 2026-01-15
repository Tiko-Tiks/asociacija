SELECT 
  p.email,
  COUNT(*) FILTER (WHERE m.member_status = 'ACTIVE') as active_orgs,
  array_agg(o.name ORDER BY o.name) FILTER (WHERE m.member_status = 'ACTIVE') as org_names,
  array_agg(m.role ORDER BY o.name) FILTER (WHERE m.member_status = 'ACTIVE') as roles
FROM profiles p
LEFT JOIN memberships m ON m.user_id = p.id
LEFT JOIN orgs o ON o.id = m.org_id
WHERE p.email IN ('owner1@test.lt', 'owner2@test.lt', 'owner3@test.lt', 'info@kruminiai.lt',
                  'user1@test.lt', 'user2@test.lt', 'user3@test.lt')
GROUP BY p.email
ORDER BY p.email;

