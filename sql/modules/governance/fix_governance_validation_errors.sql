-- ============================================
-- FIX GOVERNANCE VALIDATION ERRORS
-- ============================================
--
-- Problem: Boolean values (true/false) should be strings ("yes"/"no")
-- Org: 5865535b-494c-461c-89c5-2463c08cdeae
--
-- This script converts all boolean answers to string format
-- ============================================

DO $$
DECLARE
  v_org_id uuid := '5865535b-494c-461c-89c5-2463c08cdeae';
  v_current_answers jsonb;
  v_fixed_answers jsonb;
BEGIN
  -- Get current answers
  SELECT answers INTO v_current_answers
  FROM governance_configs
  WHERE org_id = v_org_id;

  IF v_current_answers IS NULL THEN
    RAISE EXCEPTION 'No governance config found for org %', v_org_id;
  END IF;

  -- Convert boolean values to "yes"/"no" strings
  v_fixed_answers := v_current_answers;

  -- List of keys that should be "yes"/"no" instead of boolean
  -- Convert true → "yes", false → "no"
  
  -- has_board: true → "yes"
  IF (v_current_answers->>'has_board')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{has_board}', 
      to_jsonb(CASE WHEN (v_current_answers->>'has_board')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- has_auditor: false → "no"
  IF (v_current_answers->>'has_auditor')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{has_auditor}', 
      to_jsonb(CASE WHEN (v_current_answers->>'has_auditor')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- track_fees: true → "yes"
  IF (v_current_answers->>'track_fees')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{track_fees}', 
      to_jsonb(CASE WHEN (v_current_answers->>'track_fees')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- ga_repeat_meeting_allowed: true → "yes"
  IF (v_current_answers->>'ga_repeat_meeting_allowed')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{ga_repeat_meeting_allowed}', 
      to_jsonb(CASE WHEN (v_current_answers->>'ga_repeat_meeting_allowed')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- agenda_public_summary: true → "yes"
  IF (v_current_answers->>'agenda_public_summary')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{agenda_public_summary}', 
      to_jsonb(CASE WHEN (v_current_answers->>'agenda_public_summary')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- send_agenda_email_notifications: true → "yes"
  IF (v_current_answers->>'send_agenda_email_notifications')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{send_agenda_email_notifications}', 
      to_jsonb(CASE WHEN (v_current_answers->>'send_agenda_email_notifications')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- protocol_signed_required: true → "yes"
  IF (v_current_answers->>'protocol_signed_required')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{protocol_signed_required}', 
      to_jsonb(CASE WHEN (v_current_answers->>'protocol_signed_required')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- idea_public_default: true → "yes"
  IF (v_current_answers->>'idea_public_default')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{idea_public_default}', 
      to_jsonb(CASE WHEN (v_current_answers->>'idea_public_default')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- idea_auto_create_project_on_pass: true → "yes"
  IF (v_current_answers->>'idea_auto_create_project_on_pass')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{idea_auto_create_project_on_pass}', 
      to_jsonb(CASE WHEN (v_current_answers->>'idea_auto_create_project_on_pass')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- project_support_money_enabled: true → "yes"
  IF (v_current_answers->>'project_support_money_enabled')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{project_support_money_enabled}', 
      to_jsonb(CASE WHEN (v_current_answers->>'project_support_money_enabled')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- project_support_in_kind_enabled: true → "yes"
  IF (v_current_answers->>'project_support_in_kind_enabled')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{project_support_in_kind_enabled}', 
      to_jsonb(CASE WHEN (v_current_answers->>'project_support_in_kind_enabled')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- project_support_work_enabled: true → "yes"
  IF (v_current_answers->>'project_support_work_enabled')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{project_support_work_enabled}', 
      to_jsonb(CASE WHEN (v_current_answers->>'project_support_work_enabled')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- project_support_live_visibility: true → "yes"
  IF (v_current_answers->>'project_support_live_visibility')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{project_support_live_visibility}', 
      to_jsonb(CASE WHEN (v_current_answers->>'project_support_live_visibility')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- expense_approval_required: false → "no"
  IF (v_current_answers->>'expense_approval_required')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{expense_approval_required}', 
      to_jsonb(CASE WHEN (v_current_answers->>'expense_approval_required')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- is_social_business: true → "yes"
  IF (v_current_answers->>'is_social_business')::text IN ('true', 'false') THEN
    v_fixed_answers := jsonb_set(v_fixed_answers, '{is_social_business}', 
      to_jsonb(CASE WHEN (v_current_answers->>'is_social_business')::boolean THEN 'yes' ELSE 'no' END));
  END IF;

  -- Update governance_configs with fixed answers
  UPDATE governance_configs
  SET answers = v_fixed_answers
  WHERE org_id = v_org_id;

  RAISE NOTICE 'Fixed governance answers: converted boolean to yes/no strings';
END $$;

-- Verify - should show 0 errors
SELECT 
  'ERRORS AFTER FIX' as check_type,
  COUNT(*) as error_count
FROM governance_config_validation
WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae'
  AND severity = 'error';

-- Show sample fixed values
SELECT 
  'SAMPLE FIXED VALUES' as check_type,
  answers->>'has_board' as has_board,
  answers->>'track_fees' as track_fees,
  answers->>'has_auditor' as has_auditor
FROM governance_configs
WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae';

