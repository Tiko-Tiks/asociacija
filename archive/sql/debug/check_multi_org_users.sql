-- Check which orgs user3@test.lt belongs to
SELECT 
  u.email,
  m.org_id,
  o.name as org_name,
  o.slug as org_slug,
  m.role,
  m.member_status,
  gc.answers->>'track_fees' as track_fees,
  gc.answers->>'restrict_debtors' as restrict_debtors
FROM profiles u
JOIN memberships m ON m.user_id = u.id
JOIN orgs o ON o.id = m.org_id
LEFT JOIN governance_configs gc ON gc.org_id = m.org_id
WHERE u.email = 'user3@test.lt'
ORDER BY m.joined_at;

-- Check all users with multiple memberships
SELECT 
  u.email,
  COUNT(DISTINCT m.org_id) as org_count,
  array_agg(DISTINCT o.name) as orgs
FROM profiles u
JOIN memberships m ON m.user_id = u.id
JOIN orgs o ON o.id = m.org_id
WHERE m.member_status = 'ACTIVE'
GROUP BY u.id, u.email
HAVING COUNT(DISTINCT m.org_id) > 1
ORDER BY org_count DESC;

