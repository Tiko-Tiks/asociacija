-- ==================================================
-- CREATE SCHEDULED JOB: AUTO-MARK OVERDUE INVOICES
-- ==================================================
-- Purpose: Automatically update SENT invoices to OVERDUE when past due date
-- Frequency: Daily at 00:00 UTC
-- Requires: pg_cron extension
-- ==================================================

-- ==================================================
-- OPTION 1: Using pg_cron (PostgreSQL extension)
-- ==================================================

-- Install pg_cron if not already installed
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the scheduled job
-- SELECT cron.schedule(
--   'auto-mark-overdue-invoices',  -- Job name
--   '0 0 * * *',                     -- Cron expression: daily at midnight
--   $$
--   UPDATE invoices
--   SET 
--     status = 'OVERDUE',
--     updated_at = CURRENT_TIMESTAMP
--   WHERE status = 'SENT'
--     AND due_date < CURRENT_DATE
--     AND status != 'OVERDUE';
--   $$
-- );

-- Verify the job was created
-- SELECT * FROM cron.job WHERE jobname = 'auto-mark-overdue-invoices';

-- ==================================================
-- OPTION 2: Using Database Function + Trigger (Alternative)
-- ==================================================

-- Create function to check and update overdue invoices
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update SENT invoices that are past due
  UPDATE invoices
  SET 
    status = 'OVERDUE',
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'SENT'
    AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the update (if audit_logs table exists)
  IF updated_count > 0 THEN
    BEGIN
      INSERT INTO audit_logs (
        org_id,
        user_id,
        action,
        target_table,
        target_id,
        old_value,
        new_value,
        metadata
      )
      VALUES (
        NULL,  -- System-level action
        NULL,  -- Automated process
        'AUTO_MARK_OVERDUE',
        'invoices',
        NULL,
        NULL,
        jsonb_build_object(
          'updated_count', updated_count,
          'timestamp', CURRENT_TIMESTAMP
        ),
        jsonb_build_object(
          'automated', true,
          'trigger', 'scheduled_job'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Soft fail: don't block the update if audit logging fails
      RAISE NOTICE 'AUDIT INCIDENT: Failed to log AUTO_MARK_OVERDUE: %', SQLERRM;
    END;
  END IF;
  
  RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users (or specific role)
-- GRANT EXECUTE ON FUNCTION check_overdue_invoices() TO authenticated;

-- ==================================================
-- OPTION 3: Server-Side Cron Job (External)
-- ==================================================

-- If using external cron job (e.g., via Vercel Cron or other scheduler),
-- create an RPC endpoint:

CREATE OR REPLACE FUNCTION mark_overdue_invoices_rpc()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
  invoice_ids TEXT[];
BEGIN
  -- Security check: Only allow system/admin users
  -- IF NOT EXISTS (
  --   SELECT 1 FROM memberships 
  --   WHERE user_id = auth.uid() 
  --   AND role = 'OWNER'
  -- ) THEN
  --   RAISE EXCEPTION 'access_denied';
  -- END IF;
  
  -- Get IDs of invoices to be updated
  SELECT ARRAY_AGG(id::text)
  INTO invoice_ids
  FROM invoices
  WHERE status = 'SENT'
    AND due_date < CURRENT_DATE
  LIMIT 100;  -- Process in batches
  
  -- Update to OVERDUE
  UPDATE invoices
  SET 
    status = 'OVERDUE',
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'SENT'
    AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'invoice_ids', invoice_ids,
    'timestamp', CURRENT_TIMESTAMP
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', CURRENT_TIMESTAMP
    );
END;
$$;

-- Grant execute to service role (for scheduled jobs)
-- GRANT EXECUTE ON FUNCTION mark_overdue_invoices_rpc() TO service_role;

-- ==================================================
-- TESTING
-- ==================================================

-- Test the function manually
-- SELECT check_overdue_invoices();

-- Test the RPC version
-- SELECT mark_overdue_invoices_rpc();

-- Check results
-- SELECT id, status, due_date, updated_at
-- FROM invoices
-- WHERE status = 'OVERDUE'
-- ORDER BY updated_at DESC
-- LIMIT 10;

-- ==================================================
-- MONITORING
-- ==================================================

-- Query to check when job last ran (pg_cron)
-- SELECT 
--   jobid,
--   jobname,
--   last_run_start,
--   last_run_end,
--   last_run_status
-- FROM cron.job_run_details
-- WHERE jobname = 'auto-mark-overdue-invoices'
-- ORDER BY last_run_start DESC
-- LIMIT 5;

-- Query to monitor overdue invoices
CREATE OR REPLACE VIEW overdue_invoices_summary AS
SELECT 
  o.name as org_name,
  o.slug as org_slug,
  COUNT(i.id) as overdue_count,
  SUM(i.amount) as total_overdue_amount,
  MIN(i.due_date) as oldest_due_date,
  MAX(i.due_date) as newest_due_date,
  AVG(CURRENT_DATE - i.due_date) as avg_days_overdue
FROM invoices i
JOIN orgs o ON o.id = i.org_id
WHERE i.status = 'OVERDUE'
  AND o.status = 'ACTIVE'
  AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
GROUP BY o.id, o.name, o.slug
ORDER BY overdue_count DESC;

-- Check the summary
-- SELECT * FROM overdue_invoices_summary;

-- ==================================================
-- CLEANUP
-- ==================================================

-- To remove the scheduled job (pg_cron):
-- SELECT cron.unschedule('auto-mark-overdue-invoices');

-- To drop the function:
-- DROP FUNCTION IF EXISTS check_overdue_invoices();
-- DROP FUNCTION IF EXISTS mark_overdue_invoices_rpc();

-- ==================================================
-- RECOMMENDED APPROACH
-- ==================================================
-- For Supabase:
-- 1. Use mark_overdue_invoices_rpc() function
-- 2. Call it from Vercel Cron or GitHub Actions
-- 3. Set up monitoring dashboard to track overdue invoices
--
-- For self-hosted PostgreSQL:
-- 1. Use pg_cron with check_overdue_invoices()
-- 2. Monitor via cron.job_run_details
-- ==================================================

