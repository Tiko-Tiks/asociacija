-- Check "Mano Bendruomenė" org ID
SELECT 
  name,
  slug,
  id,
  CASE 
    WHEN id = '678b0788-b544-4bf8-8cf5-44dfb2185a52' THEN 'TARGET'
    ELSE 'NOT TARGET'
  END as is_target
FROM orgs
WHERE name IN ('Mano Bendruomenė', 'Mano Bendrija')
ORDER BY name;

-- Check memberships in this org
SELECT 
  m.org_id,
  o.name,
  p.email,
  m.member_status
FROM memberships m
JOIN profiles p ON p.id = m.user_id
JOIN orgs o ON o.id = m.org_id
WHERE o.name = 'Mano Bendruomenė'
ORDER BY m.member_status, p.email;

