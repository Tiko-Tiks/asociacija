-- ============================================
-- DIAGNOSE GOVERNANCE CONFIGURATION
-- ============================================
--
-- Check why voting is blocked due to invalid governance config
-- Org ID: 5865535b-494c-461c-89c5-2463c08cdeae
--
-- ============================================

-- Organization info
SELECT 
  'ORG INFO' as check_type,
  o.id,
  o.slug,
  o.name,
  o.status,
  o.org_type,
  o.active_ruleset IS NOT NULL as has_active_ruleset,
  o.active_ruleset
FROM orgs o
WHERE o.id = '5865535b-494c-461c-89c5-2463c08cdeae';

-- Active ruleset info
SELECT 
  'RULESET INFO' as check_type,
  r.id,
  r.name,
  r.version,
  r.is_active,
  r.created_at
FROM org_rulesets r
JOIN orgs o ON o.active_ruleset = r.id
WHERE o.id = '5865535b-494c-461c-89c5-2463c08cdeae';

-- Governance configs
SELECT 
  'GOVERNANCE CONFIGS' as check_type,
  gc.config_key,
  gc.config_value,
  gc.description
FROM governance_configs gc
WHERE gc.org_id = '5865535b-494c-461c-89c5-2463c08cdeae'
ORDER BY gc.config_key;

-- Check critical governance settings
SELECT 
  'CRITICAL SETTINGS' as check_type,
  (SELECT config_value FROM governance_configs WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae' AND config_key = 'default_voting_duration_days') as voting_duration,
  (SELECT config_value FROM governance_configs WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae' AND config_key = 'early_voting_days') as early_voting_days,
  (SELECT config_value FROM governance_configs WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae' AND config_key = 'quorum_percentage') as quorum_percentage,
  (SELECT config_value FROM governance_configs WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae' AND config_key = 'new_member_approval') as new_member_approval;

-- Memberships count
SELECT 
  'MEMBERS COUNT' as check_type,
  COUNT(*) as total_members,
  COUNT(*) FILTER (WHERE member_status = 'ACTIVE') as active_members,
  COUNT(*) FILTER (WHERE role = 'OWNER') as owners
FROM memberships
WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae';

-- ============================================
-- DIAGNOSIS
-- ============================================
-- Common issues:
-- 1. active_ruleset is NULL → Need to run onboarding/governance setup
-- 2. No governance_configs → Need to submit governance answers
-- 3. Org status is not ACTIVE → Need to activate org
-- 4. Missing critical config (voting_duration, quorum, etc)
-- ============================================

