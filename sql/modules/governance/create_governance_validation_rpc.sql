-- ==================================================
-- Governance Validation RPC Functions
-- ==================================================
-- Validuoja organizacijų compliance su schema
-- ==================================================

-- Main validation function
CREATE OR REPLACE FUNCTION public.validate_governance_for_org(
  p_org_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  status TEXT,
  schema_version_no INTEGER,
  missing_required TEXT[],
  invalid_types JSONB,
  inactive_answered TEXT[],
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_version INTEGER;
  v_org_version INTEGER;
  v_answers JSONB;
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_invalid JSONB := '[]'::JSONB;
  v_inactive TEXT[] := ARRAY[]::TEXT[];
  v_status TEXT := 'OK';
  v_question RECORD;
  v_answer_value TEXT;
  v_answer_json JSONB;
  v_option_values TEXT[];
  v_details JSONB;
BEGIN
  -- Get active schema version
  v_schema_version := public.get_active_schema_version();
  
  -- Get org's config
  SELECT 
    gc.schema_version_no,
    gc.answers
  INTO 
    v_org_version,
    v_answers
  FROM public.governance_configs gc
  WHERE gc.org_id = p_org_id;
  
  -- If no config exists, all required questions are missing
  IF v_answers IS NULL THEN
    SELECT array_agg(question_key) INTO v_missing
    FROM public.governance_questions
    WHERE is_required = true 
      AND is_active = true;
    
    RETURN QUERY SELECT 
      false AS ok,
      'INVALID'::TEXT AS status,
      v_schema_version::INTEGER AS schema_version_no,
      v_missing AS missing_required,
      '[]'::JSONB AS invalid_types,
      ARRAY[]::TEXT[] AS inactive_answered,
      jsonb_build_object('reason', 'NO_CONFIG') AS details;
    RETURN;
  END IF;
  
  -- Check each active required question
  FOR v_question IN 
    SELECT * FROM public.governance_questions
    WHERE is_active = true
    ORDER BY question_key
  LOOP
    -- Check if answer exists
    IF NOT (v_answers ? v_question.question_key) THEN
      IF v_question.is_required THEN
        v_missing := array_append(v_missing, v_question.question_key);
      END IF;
      CONTINUE;
    END IF;
    
    -- Get answer value
    v_answer_value := v_answers->>v_question.question_key;
    
    -- For required questions, check if value is null, empty string, or empty after trim
    IF v_question.is_required THEN
      IF v_answer_value IS NULL OR v_answer_value = '' OR trim(v_answer_value) = '' THEN
        v_missing := array_append(v_missing, v_question.question_key);
        CONTINUE;
      END IF;
    ELSE
      -- Skip null/empty values for non-required
      IF (v_answer_value IS NULL OR v_answer_value = '' OR trim(v_answer_value) = '') THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Validate type
    BEGIN
      v_answer_json := v_answers->v_question.question_key;
    EXCEPTION
      WHEN OTHERS THEN
        v_answer_json := to_jsonb(v_answer_value);
    END;
    
    -- Type validation based on question_type
    CASE v_question.question_type
      WHEN 'checkbox' THEN
        -- Must be boolean
        IF jsonb_typeof(v_answer_json) != 'boolean' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'boolean',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        END IF;
        
      WHEN 'number' THEN
        -- Must be number (or string that can be converted to number)
        IF jsonb_typeof(v_answer_json) = 'number' THEN
          -- Valid number type
          NULL;
        ELSIF jsonb_typeof(v_answer_json) = 'string' THEN
          -- Try to parse as number
          BEGIN
            -- Check if string is a valid number
            IF v_answer_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
              -- Valid number string - this is acceptable
              NULL;
            ELSE
              -- Invalid number string
              v_invalid := v_invalid || jsonb_build_object(
                'question_key', v_question.question_key,
                'expected', 'number',
                'actual_type', 'string (not a number)',
                'value', v_answer_value
              );
            END IF;
          EXCEPTION
            WHEN OTHERS THEN
              v_invalid := v_invalid || jsonb_build_object(
                'question_key', v_question.question_key,
                'expected', 'number',
                'actual_type', 'string (invalid)',
                'value', v_answer_value
              );
          END;
        ELSE
          -- Invalid type
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'number',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        END IF;
        
      WHEN 'radio' THEN
        -- Must be string and value must be in options
        IF jsonb_typeof(v_answer_json) != 'string' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'string',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        ELSE
          -- Check if value is in options
          IF v_question.options IS NOT NULL THEN
            SELECT array_agg((option->>'value')) INTO v_option_values
            FROM jsonb_array_elements(v_question.options) AS option;
            
            IF NOT (v_answer_value = ANY(v_option_values)) THEN
              v_invalid := v_invalid || jsonb_build_object(
                'question_key', v_question.question_key,
                'expected', 'one of: ' || array_to_string(v_option_values, ', '),
                'actual_type', 'string',
                'value', v_answer_value
              );
            END IF;
          END IF;
        END IF;
        
      WHEN 'text' THEN
        -- Must be string
        IF jsonb_typeof(v_answer_json) != 'string' THEN
          v_invalid := v_invalid || jsonb_build_object(
            'question_key', v_question.question_key,
            'expected', 'string',
            'actual_type', jsonb_typeof(v_answer_json),
            'value', v_answer_value
          );
        END IF;
        
      ELSE
        -- Unknown type - warning
        NULL;
    END CASE;
  END LOOP;
  
  -- Check for inactive questions that are answered
  SELECT array_agg(question_key) INTO v_inactive
  FROM (
    SELECT key AS question_key
    FROM jsonb_each_text(v_answers)
  ) AS answered_keys
  WHERE NOT EXISTS (
    SELECT 1 FROM public.governance_questions q
    WHERE q.question_key = answered_keys.question_key
      AND q.is_active = true
  );
  
  -- Determine status
  -- Priority: INVALID > NEEDS_UPDATE > OK
  IF array_length(v_missing, 1) > 0 OR jsonb_array_length(v_invalid) > 0 THEN
    v_status := 'INVALID';
  ELSIF v_org_version IS NULL OR v_org_version < v_schema_version THEN
    -- Version mismatch - organization needs to update to new schema
    -- Even if all required are answered, they need to review new questions
    v_status := 'NEEDS_UPDATE';
  ELSIF array_length(v_inactive, 1) > 0 THEN
    -- Inactive answered questions are warnings, not errors
    -- If no missing/invalid and version matches, inactive answered alone is OK
    v_status := 'OK';
  ELSE
    v_status := 'OK';
  END IF;
  
  -- Build details
  v_details := jsonb_build_object(
    'org_version', v_org_version,
    'schema_version', v_schema_version,
    'version_mismatch', (v_org_version IS NULL OR v_org_version < v_schema_version)
  );
  
  RETURN QUERY SELECT 
    (v_status = 'OK') AS ok,
    v_status::TEXT AS status,
    v_schema_version::INTEGER AS schema_version_no,
    COALESCE(v_missing, ARRAY[]::TEXT[]) AS missing_required,
    COALESCE(v_invalid, '[]'::JSONB) AS invalid_types,
    COALESCE(v_inactive, ARRAY[]::TEXT[]) AS inactive_answered,
    v_details::JSONB AS details;
END;
$$;

COMMENT ON FUNCTION public.validate_governance_for_org IS 'Validuoja organizacijos compliance su schema';

-- Function to set compliance status after update
CREATE OR REPLACE FUNCTION public.set_governance_schema_version_for_org(
  p_org_id UUID,
  p_schema_version_no INTEGER
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'AUTH_REQUIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Update config
  UPDATE public.governance_configs
  SET 
    schema_version_no = p_schema_version_no,
    last_validated_at = now(),
    compliance_status = 'OK'
  WHERE org_id = p_org_id;
  
  -- Resolve compliance issues for this version
  UPDATE public.governance_compliance_issues
  SET resolved_at = now()
  WHERE org_id = p_org_id
    AND schema_version_no = p_schema_version_no
    AND resolved_at IS NULL;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.set_governance_schema_version_for_org IS 'Pažymi organizaciją kaip compliant su schema versija';

-- Function to upsert compliance issues
CREATE OR REPLACE FUNCTION public.upsert_compliance_issues(
  p_org_id UUID,
  p_schema_version_no INTEGER,
  p_missing_required TEXT[],
  p_invalid_types JSONB,
  p_inactive_answered TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issue_code TEXT;
  v_severity TEXT;
  v_message TEXT;
  v_question_key TEXT;
  v_invalid_item JSONB;
BEGIN
  -- Resolve all existing issues for this org and version
  UPDATE public.governance_compliance_issues
  SET resolved_at = now()
  WHERE org_id = p_org_id
    AND schema_version_no = p_schema_version_no
    AND resolved_at IS NULL;
  
  -- Insert missing required issues
  IF array_length(p_missing_required, 1) > 0 THEN
    FOREACH v_question_key IN ARRAY p_missing_required
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id,
        schema_version_no,
        issue_code,
        severity,
        question_key,
        message
      ) VALUES (
        p_org_id,
        p_schema_version_no,
        'MISSING_REQUIRED',
        'error',
        v_question_key,
        'Trūksta privalomo atsakymo: ' || v_question_key
      );
    END LOOP;
  END IF;
  
  -- Insert invalid type issues
  IF jsonb_array_length(p_invalid_types) > 0 THEN
    FOR v_invalid_item IN SELECT * FROM jsonb_array_elements(p_invalid_types)
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id,
        schema_version_no,
        issue_code,
        severity,
        question_key,
        message,
        details
      ) VALUES (
        p_org_id,
        p_schema_version_no,
        'INVALID_TYPE',
        'error',
        v_invalid_item->>'question_key',
        'Netinkamas tipas: ' || (v_invalid_item->>'question_key') || 
        ' (tikėtasi: ' || (v_invalid_item->>'expected') || 
        ', gauta: ' || (v_invalid_item->>'actual_type') || ')',
        v_invalid_item
      );
    END LOOP;
  END IF;
  
  -- Insert inactive answered issues (warnings)
  IF array_length(p_inactive_answered, 1) > 0 THEN
    FOREACH v_question_key IN ARRAY p_inactive_answered
    LOOP
      INSERT INTO public.governance_compliance_issues (
        org_id,
        schema_version_no,
        issue_code,
        severity,
        question_key,
        message
      ) VALUES (
        p_org_id,
        p_schema_version_no,
        'INACTIVE_ANSWERED',
        'warning',
        v_question_key,
        'Atsakyta į neaktyvų klausimą: ' || v_question_key
      );
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.upsert_compliance_issues IS 'Upsert compliance issues į lentelę';

