-- Quick governance check for org: 5865535b-494c-461c-89c5-2463c08cdeae

SELECT 
  o.slug,
  o.status as org_status,
  o.active_ruleset IS NOT NULL as has_ruleset,
  (SELECT COUNT(*) FROM governance_configs WHERE org_id = o.id) as config_count,
  (SELECT COUNT(*) FROM memberships WHERE org_id = o.id AND member_status = 'ACTIVE') as active_members
FROM orgs o
WHERE o.id = '5865535b-494c-461c-89c5-2463c08cdeae';

