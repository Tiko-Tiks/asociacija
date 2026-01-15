-- Force delete admin memberships in DRAFT orgs
DELETE FROM memberships
WHERE user_id = '64ceab66-d6b8-4142-a1ff-87f63739b029'
  AND org_id IN (
    SELECT id FROM orgs WHERE status = 'DRAFT'
  );

-- Also from Mano Bendruomenė if MEMBER
DELETE FROM memberships
WHERE user_id = '64ceab66-d6b8-4142-a1ff-87f63739b029'
  AND org_id = '5865535b-494c-461c-89c5-2463c08cdeae'
  AND role = 'MEMBER';

-- Final check
SELECT 
  'FINAL' as stage,
  p.email,
  o.name,
  m.role
FROM memberships m
JOIN profiles p ON p.id = m.user_id
JOIN orgs o ON o.id = m.org_id
WHERE m.member_status = 'ACTIVE'
ORDER BY o.name;

