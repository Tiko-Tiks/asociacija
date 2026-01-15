-- ==================================================
-- FIX: Set search_path for validate_ideas_metadata functions
-- ==================================================
-- Security Issue: Functions have mutable search_path (security vulnerability)
-- Solution: Add SET search_path = public, pg_temp to functions
-- Governance: Audit-safe - no schema changes, only security fix
-- ==================================================
-- 
-- IMPORTANT: This migration fixes the security vulnerability where
-- validate_ideas_metadata and trigger_validate_ideas_metadata functions
-- don't have an explicit search_path set, which can lead to search path
-- manipulation attacks.
-- ==================================================

-- ==================================================
-- 1) Fix validate_ideas_metadata function
-- ==================================================

CREATE OR REPLACE FUNCTION validate_ideas_metadata(metadata_value jsonb)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    key_name text;
    allowed_prefixes text[] := ARRAY['fact.', 'project.', 'ui.', 'ai.'];
    allowed_ai_keys text[] := ARRAY['ai.summary', 'ai.risks', 'ai.suggestions'];
    forbidden_keywords text[] := ARRAY[
        'approved', 'adopted', 'decision', 'vote', 'quorum',
        'project_status', 'budget_spent'
    ];
    has_valid_prefix boolean;
    keyword text;
BEGIN
    -- Skip validation if metadata is empty
    IF metadata_value IS NULL OR metadata_value = '{}'::jsonb THEN
        RETURN;
    END IF;

    -- Validate each top-level key
    FOR key_name IN SELECT jsonb_object_keys(metadata_value)
    LOOP
        -- Check 1: All keys must be namespaced with allowed prefix
        has_valid_prefix := false;
        FOREACH keyword IN ARRAY allowed_prefixes
        LOOP
            IF key_name LIKE keyword || '%' THEN
                has_valid_prefix := true;
                EXIT;
            END IF;
        END LOOP;

        IF NOT has_valid_prefix THEN
            RAISE EXCEPTION 'Metadata key "%" must be namespaced with one of: fact.*, project.*, ui.*, ai.*', key_name;
        END IF;

        -- Check 2: ai.* keys are strictly limited
        IF key_name LIKE 'ai.%' THEN
            IF key_name != ALL(allowed_ai_keys) THEN
                RAISE EXCEPTION 'Metadata key "%" is not allowed. Allowed ai.* keys: ai.summary, ai.risks, ai.suggestions', key_name;
            END IF;
        END IF;

        -- Check 3: Forbidden keywords in any key
        FOREACH keyword IN ARRAY forbidden_keywords
        LOOP
            IF LOWER(key_name) LIKE '%' || keyword || '%' THEN
                RAISE EXCEPTION 'Metadata key "%" contains forbidden keyword: "%"', key_name, keyword;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION validate_ideas_metadata IS 
'Governance: Validates metadata according to Registry v1.0 rules. Raises EXCEPTION on any violation. Security: search_path is set to prevent injection attacks.';

-- ==================================================
-- 2) Fix trigger_validate_ideas_metadata function
-- ==================================================

CREATE OR REPLACE FUNCTION trigger_validate_ideas_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM validate_ideas_metadata(NEW.metadata);
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_validate_ideas_metadata IS 
'Governance: Wrapper function for trigger context (NEW.metadata). Security: search_path is set to prevent injection attacks.';

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Verify search_path is set correctly
DO $$
DECLARE
    v_search_path text;
    v_func_name text;
BEGIN
    -- Check validate_ideas_metadata
    SELECT pg_get_functiondef(oid) INTO v_search_path
    FROM pg_proc
    WHERE proname = 'validate_ideas_metadata'
    AND pronamespace = 'public'::regnamespace;
    
    IF v_search_path LIKE '%SET search_path%' THEN
        RAISE NOTICE 'SUCCESS: validate_ideas_metadata has search_path set';
    ELSE
        RAISE WARNING 'validate_ideas_metadata does not have search_path set';
    END IF;
    
    -- Check trigger_validate_ideas_metadata
    SELECT pg_get_functiondef(oid) INTO v_search_path
    FROM pg_proc
    WHERE proname = 'trigger_validate_ideas_metadata'
    AND pronamespace = 'public'::regnamespace;
    
    IF v_search_path LIKE '%SET search_path%' THEN
        RAISE NOTICE 'SUCCESS: trigger_validate_ideas_metadata has search_path set';
    ELSE
        RAISE WARNING 'trigger_validate_ideas_metadata does not have search_path set';
    END IF;
END $$;
