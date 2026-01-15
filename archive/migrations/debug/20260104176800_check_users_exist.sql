-- Check if these users even exist in profiles
SELECT email, id FROM profiles 
WHERE email IN ('owner2@test.lt', 'owner3@test.lt', 'info@kruminiai.lt')
ORDER BY email;

-- Check their memberships
SELECT 
  p.email,
  COUNT(*) as membership_count,
  array_agg(o.name || ' (' || m.member_status || ')') as info
FROM profiles p
LEFT JOIN memberships m ON m.user_id = p.id
LEFT JOIN orgs o ON o.id = m.org_id
WHERE p.email IN ('owner2@test.lt', 'owner3@test.lt', 'info@kruminiai.lt')
GROUP BY p.email
ORDER BY p.email;

