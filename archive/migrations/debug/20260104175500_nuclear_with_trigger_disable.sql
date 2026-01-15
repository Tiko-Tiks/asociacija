-- FINAL NUCLEAR: Disable trigger, cleanup, ensure admin, re-enable
ALTER TABLE memberships DISABLE TRIGGER trg_prevent_orphan_org;

-- Mark as LEFT
UPDATE memberships SET member_status = 'LEFT', left_at = NOW(), status_reason = 'Multi-org cleanup'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'owner1@test.lt')
  AND org_id != '5865535b-494c-461c-89c5-2463c08cdeae';

UPDATE memberships SET member_status = 'LEFT', left_at = NOW(), status_reason = 'Multi-org cleanup'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'owner2@test.lt')
  AND org_id != '678b0788-b544-4bf8-8cf5-44dfb2185a52';

UPDATE memberships SET member_status = 'LEFT', left_at = NOW(), status_reason = 'Multi-org cleanup'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'owner3@test.lt')
  AND org_id != 'bb97da33-0ee2-4be6-82e6-86158b83ac37';

UPDATE memberships SET member_status = 'LEFT', left_at = NOW(), status_reason = 'Multi-org cleanup'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'info@kruminiai.lt')
  AND org_id != '318e7970-782d-4006-863f-33e3c5e809a3';

-- Ensure admin is OWNER in orgs without OWNER
INSERT INTO memberships (org_id, user_id, role, status, member_status, joined_at)
SELECT o.id, '64ceab66-d6b8-4142-a1ff-87f63739b029'::uuid, 'OWNER', 'ACTIVE', 'ACTIVE', NOW()
FROM orgs o
WHERE NOT EXISTS (
  SELECT 1 FROM memberships m
  WHERE m.org_id = o.id AND m.role = 'OWNER' AND m.member_status = 'ACTIVE'
)
ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'OWNER', member_status = 'ACTIVE';

ALTER TABLE memberships ENABLE TRIGGER trg_prevent_orphan_org;

-- Verify
SELECT 
  p.email,
  COUNT(*) FILTER (WHERE m.member_status = 'ACTIVE') as active_orgs,
  array_agg(o.name ORDER BY o.name) FILTER (WHERE m.member_status = 'ACTIVE') as orgs
FROM profiles p
LEFT JOIN memberships m ON m.user_id = p.id
LEFT JOIN orgs o ON o.id = m.org_id
WHERE p.email IN ('owner1@test.lt', 'owner2@test.lt', 'owner3@test.lt', 'info@kruminiai.lt')
GROUP BY p.email
ORDER BY p.email;

