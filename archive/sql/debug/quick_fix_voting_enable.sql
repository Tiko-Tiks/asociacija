-- ============================================
-- QUICK FIX: Enable Voting (All-in-One)
-- ============================================
--
-- Purpose: Fix ALL common governance validation issues
-- Use: When you get CAN_VOTE_BLOCKED errors
--
-- This script fixes:
-- 1. Boolean validation errors (true/false → "yes"/"no")
-- 2. Fee tracking issues
-- 3. Debtor restrictions
-- 4. Org activation
-- 5. Ruleset activation
-- ============================================

-- ⚠️  REPLACE THIS with your org_id (line 19):

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 CHANGE THIS!
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🚀 QUICK FIX: Enable Voting (All-in-One)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '   Org ID: %', v_org_id;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 1: Show current problems
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 SAME AS ABOVE!
  v_error_count int;
  rec RECORD;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 STEP 1: Current Validation Errors';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_error_count
  FROM governance_config_validation
  WHERE org_id = v_org_id
    AND severity = 'error';
  
  IF v_error_count > 0 THEN
    RAISE NOTICE '❌ Found % validation errors:', v_error_count;
    
    -- Show error summary (can't return result sets from DO block, so just count)
    FOR rec IN (
      SELECT 
        severity,
        error_code,
        COUNT(*) as count
      FROM governance_config_validation
      WHERE org_id = v_org_id
        AND severity = 'error'
      GROUP BY severity, error_code
      ORDER BY count DESC
    ) LOOP
      RAISE NOTICE '   - %: %', rec.error_code, rec.count;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No validation errors found';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 2: Fix boolean validation errors
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 SAME AS ABOVE!
  v_answers jsonb;
  v_fixed_answers jsonb;
  v_key text;
  v_value jsonb;
  v_fixes_count int := 0;
  rec RECORD;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 STEP 2: Boolean → String conversions';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  -- Get current answers
  SELECT answers INTO v_answers
  FROM governance_configs
  WHERE org_id = v_org_id;

  IF v_answers IS NULL THEN
    RAISE EXCEPTION 'No governance_configs found for org_id: %', v_org_id;
  END IF;

  -- Start with existing answers
  v_fixed_answers := v_answers;

  -- List of keys that should be "yes"/"no" strings
  FOR v_key IN 
    SELECT unnest(ARRAY[
      'require_physical_address',
      'allow_corporate_members',
      'require_approval',
      'allow_self_registration',
      'track_fees',
      'allow_online_payments',
      'require_consent',
      'allow_public_viewing',
      'require_meeting_attendance',
      'allow_proxy_voting',
      'allow_early_voting',
      'public_resolutions',
      'allow_member_proposals'
    ])
  LOOP
    -- Check if key exists and is boolean
    IF v_answers ? v_key THEN
      v_value := v_answers->v_key;
      
      -- Convert true → "yes", false → "no"
      IF v_value = 'true'::jsonb THEN
        v_fixed_answers := jsonb_set(v_fixed_answers, ARRAY[v_key], '"yes"'::jsonb);
        v_fixes_count := v_fixes_count + 1;
        RAISE NOTICE '  ✓ Fixed: % (true → "yes")', v_key;
      ELSIF v_value = 'false'::jsonb THEN
        v_fixed_answers := jsonb_set(v_fixed_answers, ARRAY[v_key], '"no"'::jsonb);
        v_fixes_count := v_fixes_count + 1;
        RAISE NOTICE '  ✓ Fixed: % (false → "no")', v_key;
      END IF;
    END IF;
  END LOOP;

  -- Update if any fixes were made
  IF v_fixes_count > 0 THEN
    UPDATE governance_configs
    SET answers = v_fixed_answers
    WHERE org_id = v_org_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed % boolean values', v_fixes_count;
  ELSE
    RAISE NOTICE '✓ No boolean fixes needed';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: Disable fee tracking (for testing)
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 SAME AS ABOVE!
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 STEP 3: Fee tracking & debtor restrictions';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  UPDATE governance_configs
  SET answers = 
    jsonb_set(
      jsonb_set(answers, '{track_fees}', '"no"'),
      '{restrict_debtors}', '"not_applicable"'
    )
  WHERE org_id = v_org_id;

  RAISE NOTICE '  ✓ track_fees = "no"';
  RAISE NOTICE '  ✓ restrict_debtors = "not_applicable"';
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 4: Ensure org is ACTIVE
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 SAME AS ABOVE!
  v_current_status text;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 STEP 4: Organization status';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  SELECT status INTO v_current_status
  FROM orgs
  WHERE id = v_org_id;

  IF v_current_status != 'ACTIVE' THEN
    UPDATE orgs
    SET status = 'ACTIVE'
    WHERE id = v_org_id;
    
    RAISE NOTICE '  ✓ Changed org status: % → ACTIVE', v_current_status;
  ELSE
    RAISE NOTICE '  ✓ Org already ACTIVE';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 5: Ensure governance_configs is ACTIVE
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 SAME AS ABOVE!
  v_current_status text;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 STEP 5: Governance config status';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  SELECT status INTO v_current_status
  FROM governance_configs
  WHERE org_id = v_org_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'No governance_configs found for org_id: %', v_org_id;
  ELSIF v_current_status != 'ACTIVE' THEN
    UPDATE governance_configs
    SET status = 'ACTIVE'
    WHERE org_id = v_org_id;
    
    RAISE NOTICE '  ✓ Changed governance_configs status: % → ACTIVE', v_current_status;
  ELSE
    RAISE NOTICE '  ✓ Governance config already ACTIVE';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 6: Ensure ruleset is ACTIVE
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 SAME AS ABOVE!
  v_ruleset_id uuid;
  v_current_status text;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 STEP 6: Ruleset activation';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- Check if active ruleset exists
  SELECT id, status INTO v_ruleset_id, v_current_status
  FROM org_rulesets
  WHERE org_id = v_org_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_ruleset_id IS NULL THEN
    -- Create new active ruleset
    INSERT INTO org_rulesets (org_id, status, version)
    VALUES (v_org_id, 'ACTIVE', 1)
    RETURNING id INTO v_ruleset_id;
    
    RAISE NOTICE '  ✓ Created new ACTIVE ruleset (id: %)', v_ruleset_id;
  ELSIF v_current_status != 'ACTIVE' THEN
    -- Just activate the latest one (don't try to deactivate others)
    -- The DB constraint should handle uniqueness if needed
    UPDATE org_rulesets
    SET status = 'ACTIVE'
    WHERE id = v_ruleset_id;
    
    RAISE NOTICE '  ✓ Activated latest ruleset (id: %)', v_ruleset_id;
  ELSE
    RAISE NOTICE '  ✓ Ruleset already ACTIVE (id: %)', v_ruleset_id;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 7: VERIFICATION
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- 👈 SAME AS ABOVE!
  v_error_count int;
  v_org_status text;
  v_org_slug text;
  v_gc_status text;
  v_track_fees text;
  v_restrict_debtors text;
  v_active_rulesets int;
  rec RECORD;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ VERIFICATION RESULTS:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- Check validation errors
  RAISE NOTICE '1️⃣  Validation Errors:';
  
  SELECT COUNT(*) INTO v_error_count
  FROM governance_config_validation
  WHERE org_id = v_org_id
    AND severity = 'error';
  
  IF v_error_count = 0 THEN
    RAISE NOTICE '    ✅ NO ERRORS';
  ELSE
    RAISE NOTICE '    ❌ STILL HAS % ERRORS:', v_error_count;
    FOR rec IN (
      SELECT error_code, field_name
      FROM governance_config_validation
      WHERE org_id = v_org_id AND severity = 'error'
      LIMIT 5
    ) LOOP
      RAISE NOTICE '       - %: %', rec.error_code, rec.field_name;
    END LOOP;
  END IF;

  -- Check org activation
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣  Organization Status:';
  
  SELECT status, slug INTO v_org_status, v_org_slug
  FROM orgs
  WHERE id = v_org_id;
  
  IF v_org_status = 'ACTIVE' THEN
    RAISE NOTICE '    ✅ ACTIVE (slug: %)', v_org_slug;
  ELSE
    RAISE NOTICE '    ❌ NOT ACTIVE: % (slug: %)', v_org_status, v_org_slug;
  END IF;

  -- Check governance config
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣  Governance Config:';
  
  SELECT 
    status,
    answers->>'track_fees',
    answers->>'restrict_debtors'
  INTO v_gc_status, v_track_fees, v_restrict_debtors
  FROM governance_configs
  WHERE org_id = v_org_id;
  
  IF v_gc_status = 'ACTIVE' THEN
    RAISE NOTICE '    ✅ ACTIVE';
    RAISE NOTICE '       track_fees: %', v_track_fees;
    RAISE NOTICE '       restrict_debtors: %', v_restrict_debtors;
  ELSE
    RAISE NOTICE '    ❌ NOT ACTIVE: %', v_gc_status;
  END IF;

  -- Check ruleset
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣  Ruleset:';
  
  SELECT COUNT(*) INTO v_active_rulesets
  FROM org_rulesets
  WHERE org_id = v_org_id AND status = 'ACTIVE';
  
  IF v_active_rulesets > 0 THEN
    RAISE NOTICE '    ✅ HAS ACTIVE RULESET';
  ELSE
    RAISE NOTICE '    ❌ NO ACTIVE RULESET';
  END IF;

  -- Final message
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 FIXES COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Refresh your browser';
  RAISE NOTICE '  2. Try voting again';
  RAISE NOTICE '  3. If still blocked, check the error message';
  RAISE NOTICE '';
  RAISE NOTICE 'Common remaining issues:';
  RAISE NOTICE '  - Member status not ACTIVE';
  RAISE NOTICE '  - Member joined after vote opened';
  RAISE NOTICE '  - Already voted on this resolution';
  RAISE NOTICE '';
END $$;

-- ============================================
-- END OF SCRIPT
-- ============================================

