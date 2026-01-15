-- Check organization status and slug
-- Replace 'kruminiai' with your actual slug

SELECT 
  id,
  name,
  slug,
  status,
  created_at,
  activated_at,
  -- Check if metadata exists (may not be in schema)
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'metadata'
    ) THEN 'metadata column exists'
    ELSE 'metadata column does NOT exist'
  END as metadata_column_status
FROM orgs
WHERE slug = 'kruminiai';

-- Check membership for this org
SELECT 
  m.id,
  m.org_id,
  m.user_id,
  m.role,
  m.member_status,
  m.joined_at,
  o.name as org_name,
  o.slug as org_slug,
  o.status as org_status
FROM memberships m
INNER JOIN orgs o ON o.id = m.org_id
WHERE o.slug = 'kruminiai'
AND m.role = 'OWNER';

-- Check if org is returned by getUserOrgs logic
-- (This simulates what getUserOrgs does)
SELECT 
  o.id,
  o.name,
  o.slug,
  o.status,
  m.id as membership_id,
  m.role,
  m.member_status
FROM memberships m
INNER JOIN orgs o ON o.id = m.org_id
WHERE m.user_id = '8a6fb6b8-31b1-416f-9ab3-522cfc839c38' -- Replace with your user_id
AND m.member_status = 'ACTIVE'
AND o.id = '562478e1-bb0e-4d0d-bac9-c1ab00ccca56'; -- Replace with your org_id
