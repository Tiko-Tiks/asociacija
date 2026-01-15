DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52';
  v_track_fees text;
  v_restrict_debtors text;
  v_error_count int;
BEGIN
  -- Get current settings
  SELECT 
    answers->>'track_fees',
    answers->>'restrict_debtors'
  INTO v_track_fees, v_restrict_debtors
  FROM governance_configs
  WHERE org_id = v_org_id;

  RAISE NOTICE '=== CURRENT GOVERNANCE SETTINGS ===';
  RAISE NOTICE 'track_fees: %', v_track_fees;
  RAISE NOTICE 'restrict_debtors: %', v_restrict_debtors;

  -- Check validation errors
  SELECT COUNT(*) INTO v_error_count
  FROM governance_config_validation
  WHERE org_id = v_org_id AND severity = 'error';

  RAISE NOTICE '';
  RAISE NOTICE '=== VALIDATION ERRORS ===';
  RAISE NOTICE 'Error count: %', v_error_count;

  IF v_track_fees = 'no' THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ track_fees is "no" - voting should work';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ track_fees is "%", should be "no"', v_track_fees;
  END IF;
END $$;

