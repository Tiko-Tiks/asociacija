-- ==================================================
-- DEBUG: Governance Compliance Check
-- ==================================================
-- Patikrinti governance_configs ir validate_governance_for_org rezultatą
-- ==================================================

-- 1. Patikrinti governance_configs lentelę (visos orgs)
SELECT 
  org_id,
  status,
  compliance_status,
  schema_version_no,
  last_validated_at,
  jsonb_object_keys(answers) AS answered_keys,
  answers
FROM governance_configs
ORDER BY updated_at DESC;

-- 2. Patikrinti validate_governance_for_org rezultatą (automatiškai pagal paskutinę org)
DO $$
DECLARE
  v_org_id UUID;
  v_result RECORD;
BEGIN
  -- Rasti paskutinę org su configs
  SELECT org_id INTO v_org_id
  FROM governance_configs
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Nerasta jokių governance_configs įrašų!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Tikrinama org_id: %', v_org_id;
  
  -- Patikrinti validate_governance_for_org rezultatą
  SELECT * INTO v_result
  FROM validate_governance_for_org(v_org_id);
  
  RAISE NOTICE 'Validation result:';
  RAISE NOTICE '  ok: %', v_result.ok;
  RAISE NOTICE '  status: %', v_result.status;
  RAISE NOTICE '  schema_version_no: %', v_result.schema_version_no;
  RAISE NOTICE '  missing_required: %', v_result.missing_required;
  RAISE NOTICE '  invalid_types: %', v_result.invalid_types;
  RAISE NOTICE '  inactive_answered: %', v_result.inactive_answered;
  RAISE NOTICE '  details: %', v_result.details;
END $$;

-- 3. Patikrinti privalomus klausimus
SELECT 
  question_key,
  question_type,
  is_required,
  is_active,
  options
FROM governance_questions
WHERE is_active = true
ORDER BY question_key;

-- 4. Patikrinti compliance issues
SELECT 
  org_id,
  issue_code,
  severity,
  question_key,
  message,
  details,
  created_at,
  resolved_at
FROM governance_compliance_issues
WHERE resolved_at IS NULL
ORDER BY created_at DESC;

