-- PROJECT INDICATORS AUDIT HARDENING — v19.0
-- Purpose: Ensure all metadata.project.* and metadata.indicator.* changes are audited
-- Governance: v19.0 audit requirements

-- ==================================================
-- ANALYSIS RESULTS
-- ==================================================

-- 1. validate_metadata trigger: NOT FOUND
--    - No trigger named validate_metadata exists
--    - Existing trigger: trg_audit_resolution_changes
--    - This trigger only logs RESOLUTION_CREATED and RESOLUTION_STATUS_CHANGED
--    - It does NOT log metadata changes

-- 2. RPC function: update_project_indicator (assumed to exist from P12)
--    - Needs verification if it logs to audit_logs
--    - If not, audit logging must be added

-- 3. Audit action: PROJECT_INDICATOR_UPDATE
--    - Not currently used in codebase
--    - Needs to be added as string literal in audit_logs.action

-- ==================================================
-- RECOMMENDATION: Update RPC function
-- ==================================================

-- The RPC function update_project_indicator should include audit logging.
-- Since the RPC function exists (P12), it should be updated to include:

-- Pattern for audit logging in RPC:
/*
  -- After updating metadata, log to audit_logs
  INSERT INTO public.audit_logs (
    org_id,
    user_id,
    action,
    target_table,
    target_id,
    old_value,
    new_value
  ) VALUES (
    v_org_id,
    v_user_id,
    'PROJECT_INDICATOR_UPDATE',
    'resolutions',
    p_resolution_id,
    jsonb_build_object('metadata', v_old_metadata),
    jsonb_build_object('metadata', v_new_metadata)
  );
*/

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check if RPC function exists:
-- SELECT proname, prosrc
-- FROM pg_proc
-- WHERE proname = 'update_project_indicator';

-- Check if audit logging exists in RPC:
-- SELECT prosrc
-- FROM pg_proc
-- WHERE proname = 'update_project_indicator'
--   AND prosrc LIKE '%INSERT INTO%audit_logs%';

-- Check existing audit logs for project indicators:
-- SELECT action, COUNT(*)
-- FROM public.audit_logs
-- WHERE target_table = 'resolutions'
--   AND (new_value->>'metadata' IS NOT NULL OR old_value->>'metadata' IS NOT NULL)
-- GROUP BY action;

-- ==================================================
-- NOTES
-- ==================================================

-- 1. audit_logs.action is TEXT (not enum), so 'PROJECT_INDICATOR_UPDATE' can be used directly
-- 2. Both old_value and new_value should contain the full metadata object for audit trail
-- 3. Audit logging should NOT block the main operation (use exception handling)
-- 4. Every metadata.project.* and metadata.indicator.* change must be logged
