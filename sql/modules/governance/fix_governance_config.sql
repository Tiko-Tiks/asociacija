-- ============================================
-- FIX GOVERNANCE CONFIGURATION (v3 - Correct Schema)
-- ============================================
--
-- Fix org: 5865535b-494c-461c-89c5-2463c08cdeae
-- Issue: GOVERNANCE_CONFIG_INVALID blocks voting
--
-- Correct schema:
-- - org_rulesets with status='ACTIVE'
-- - governance_configs with JSONB 'answers' field
--
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '5865535b-494c-461c-89c5-2463c08cdeae';
  v_ruleset_id uuid;
  v_has_ruleset boolean;
  v_has_config boolean;
  v_governance_answers jsonb;
BEGIN
  -- Check if org has ACTIVE ruleset
  SELECT COUNT(*) > 0 INTO v_has_ruleset
  FROM org_rulesets
  WHERE org_id = v_org_id AND status = 'ACTIVE';

  -- If no active ruleset, create one
  IF NOT v_has_ruleset THEN
    RAISE NOTICE 'Creating ACTIVE ruleset...';
    
    INSERT INTO org_rulesets (org_id, name, version, status, description)
    VALUES (
      v_org_id,
      'Default Ruleset',
      '1.0',
      'ACTIVE',
      'Auto-created governance ruleset'
    )
    RETURNING id INTO v_ruleset_id;

    RAISE NOTICE 'Ruleset created: %', v_ruleset_id;
  ELSE
    RAISE NOTICE 'ACTIVE ruleset already exists';
  END IF;

  -- Check if governance config exists
  SELECT COUNT(*) > 0 INTO v_has_config
  FROM governance_configs
  WHERE org_id = v_org_id;

  -- If no config, create minimal governance answers
  IF NOT v_has_config THEN
    RAISE NOTICE 'Creating governance config...';
    
    -- Create governance answers JSON
    v_governance_answers := jsonb_build_object(
      'default_voting_duration_days', '7',
      'early_voting_days', '2',
      'quorum_percentage', '50',
      'new_member_approval', 'auto',
      'voting_method_ga', 'simple_majority',
      'voting_method_opinion', 'simple_majority',
      'early_voting', 'written_and_remote',
      'meeting_attendance_tracking', 'yes',
      'vote_types_allowed', 'ga_and_opinion'
    );
    
    INSERT INTO governance_configs (org_id, answers)
    VALUES (v_org_id, v_governance_answers);

    RAISE NOTICE 'Governance config created';
  ELSE
    RAISE NOTICE 'Governance config already exists';
  END IF;

  -- Ensure org status is ACTIVE
  UPDATE orgs
  SET status = 'ACTIVE'
  WHERE id = v_org_id AND status != 'ACTIVE';

  RAISE NOTICE 'Fix complete';
END $$;

-- Verify fix
SELECT 
  'VERIFICATION' as check_type,
  o.slug,
  o.status as org_status,
  (SELECT COUNT(*) FROM org_rulesets WHERE org_id = o.id AND status = 'ACTIVE') as active_rulesets,
  (SELECT COUNT(*) FROM governance_configs WHERE org_id = o.id) as has_config,
  (SELECT jsonb_object_keys(answers) FROM governance_configs WHERE org_id = o.id LIMIT 1) as sample_keys
FROM orgs o
WHERE o.id = '5865535b-494c-461c-89c5-2463c08cdeae';
