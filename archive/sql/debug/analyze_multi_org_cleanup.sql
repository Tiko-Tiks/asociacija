-- ============================================
-- ANALYZE: Multi-org situation
-- ============================================

-- Target org to keep all users
\set target_org_id '678b0788-b544-4bf8-8cf5-44dfb2185a52'

-- 1. Show all orgs with member counts
SELECT 
  o.id,
  o.name,
  o.slug,
  COUNT(m.id) FILTER (WHERE m.member_status = 'ACTIVE') as active_members,
  COUNT(m.id) as total_memberships,
  CASE 
    WHEN o.id = :'target_org_id' THEN '✅ TARGET ORG'
    ELSE '❌ Will be cleaned'
  END as status
FROM orgs o
LEFT JOIN memberships m ON m.org_id = o.id
GROUP BY o.id, o.name, o.slug
ORDER BY active_members DESC;

-- 2. Show users with multiple orgs
SELECT 
  p.email,
  COUNT(DISTINCT m.org_id) as org_count,
  array_agg(DISTINCT o.name) as org_names,
  array_agg(DISTINCT m.org_id) as org_ids
FROM profiles p
JOIN memberships m ON m.user_id = p.id
JOIN orgs o ON o.id = m.org_id
WHERE m.member_status = 'ACTIVE'
GROUP BY p.id, p.email
HAVING COUNT(DISTINCT m.org_id) > 1
ORDER BY org_count DESC;

-- 3. Show what will be removed
SELECT 
  'Memberships to remove/mark as LEFT' as action,
  COUNT(*) as count
FROM memberships
WHERE org_id != :'target_org_id'
  AND member_status = 'ACTIVE';

-- 4. Show target org status
SELECT 
  'Target org' as info,
  o.name,
  o.slug,
  COUNT(m.id) as current_members
FROM orgs o
LEFT JOIN memberships m ON m.org_id = o.id AND m.member_status = 'ACTIVE'
WHERE o.id = :'target_org_id'
GROUP BY o.id, o.name, o.slug;

