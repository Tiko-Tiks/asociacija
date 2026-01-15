-- ============================================================================
-- IDEAS / PLANNING MODULE - METADATA VALIDATION
-- ============================================================================
-- 
-- PURPOSE: Enforce metadata discipline for PRE-GOVERNANCE tables
-- CONSTRAINTS:
--   - All keys must be namespaced (fact.*, project.*, ui.*, ai.*)
--   - ai.* keys limited to: ai.summary, ai.risks, ai.suggestions
--   - Forbidden keywords: approved, adopted, decision, vote, quorum,
--     project_status, budget_spent
--   - Fail hard on violations (no auto-correction)
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: validate_ideas_metadata()
-- ----------------------------------------------------------------------------
-- Validates metadata according to Registry v1.0 rules.
-- Raises EXCEPTION on any violation.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validate_ideas_metadata(metadata_value jsonb)
RETURNS void
LANGUAGE plpgsql
STABLE
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

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: trigger_validate_ideas_metadata()
-- ----------------------------------------------------------------------------
-- Wrapper function for trigger context (NEW.metadata)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_validate_ideas_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM validate_ideas_metadata(NEW.metadata);
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger for ideas table
DROP TRIGGER IF EXISTS ideas_validate_metadata ON ideas;
CREATE TRIGGER ideas_validate_metadata
    BEFORE INSERT OR UPDATE ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validate_ideas_metadata();

-- Trigger for idea_comments table
DROP TRIGGER IF EXISTS idea_comments_validate_metadata ON idea_comments;
CREATE TRIGGER idea_comments_validate_metadata
    BEFORE INSERT OR UPDATE ON idea_comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validate_ideas_metadata();

-- ----------------------------------------------------------------------------
-- NOTES:
-- ----------------------------------------------------------------------------
-- 1. Function is IMMUTABLE to allow use in CHECK constraints if needed
--    (though we use triggers for better error messages).
--
-- 2. Validation fails hard - no automatic corrections or warnings.
--
-- 3. Empty metadata ({}) passes validation (no keys to validate).
--
-- 4. Case-insensitive check for forbidden keywords (LOWER comparison).
--
-- 5. ai.* keys must match exactly (ai.summary, ai.risks, ai.suggestions),
--    not just start with those prefixes.
-- ----------------------------------------------------------------------------
