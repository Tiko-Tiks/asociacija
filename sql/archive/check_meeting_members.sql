-- Check members for meeting
SELECT 
  m.id as membership_id,
  m.user_id,
  p.first_name,
  p.last_name,
  p.email,
  m.member_status
FROM memberships m
INNER JOIN meetings mt ON mt.org_id = m.org_id
LEFT JOIN profiles p ON p.id = m.user_id
WHERE mt.id = '5a29a21f-0eae-41a3-b6fd-208b68dc9c14'
AND m.member_status = 'ACTIVE'
ORDER BY p.email;

-- Check remote voters
SELECT 
  mrv.membership_id,
  p.email
FROM meeting_remote_voters mrv
LEFT JOIN memberships m ON m.id = mrv.membership_id
LEFT JOIN profiles p ON p.id = m.user_id
WHERE mrv.meeting_id = '5a29a21f-0eae-41a3-b6fd-208b68dc9c14';

