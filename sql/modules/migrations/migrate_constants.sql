-- ==================================================
-- DATA MIGRATION - CONSTANTS UPDATE
-- ==================================================
-- Purpose: Migrate data to match new constants
-- Date: 2026-01-04
-- Related: COMPREHENSIVE_CODE_AUDIT.md, MIGRATION_GUIDE.md
-- ==================================================

-- ==================================================
-- STEP 1: BACKUP (RECOMMENDED)
-- ==================================================
-- Before running any updates, create backups:
-- pg_dump -h HOST -U USER -d DATABASE -t memberships > memberships_backup.sql
-- pg_dump -h HOST -U USER -d DATABASE -t invoices > invoices_backup.sql

-- ==================================================
-- STEP 2: VALIDATE CURRENT STATE
-- ==================================================
-- Run validation scripts first:
-- \i sql/validate_membership_status.sql
-- \i sql/validate_invoice_status.sql

-- ==================================================
-- STEP 3: MEMBERSHIP STATUS MIGRATION
-- ==================================================

-- Check for any non-standard member_status values
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM memberships
  WHERE member_status NOT IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT')
    AND member_status IS NOT NULL;
  
  IF invalid_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % memberships with invalid member_status', invalid_count;
    RAISE NOTICE 'Review these records before proceeding:';
    RAISE NOTICE 'SELECT id, user_id, org_id, member_status FROM memberships WHERE member_status NOT IN (''PENDING'', ''ACTIVE'', ''SUSPENDED'', ''LEFT'');';
  ELSE
    RAISE NOTICE '✅ All member_status values are valid';
  END IF;
END $$;

-- Migration: Update any legacy status values (CUSTOMIZE AS NEEDED)
-- UNCOMMENT AND MODIFY AFTER REVIEW:

-- Example 1: If you have 'APPROVED' status, map to 'ACTIVE'
-- UPDATE memberships 
-- SET member_status = 'ACTIVE' 
-- WHERE member_status = 'APPROVED';

-- Example 2: If you have 'WAITING' status, map to 'PENDING'
-- UPDATE memberships 
-- SET member_status = 'PENDING' 
-- WHERE member_status = 'WAITING';

-- Example 3: If you have 'DELETED' status, map to 'LEFT'
-- UPDATE memberships 
-- SET member_status = 'LEFT' 
-- WHERE member_status = 'DELETED';

-- ==================================================
-- STEP 4: INVOICE STATUS MIGRATION
-- ==================================================

-- Check for any non-standard status values
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM invoices
  WHERE status NOT IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE')
    AND status IS NOT NULL;
  
  IF invalid_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % invoices with invalid status', invalid_count;
    RAISE NOTICE 'Review these records before proceeding:';
    RAISE NOTICE 'SELECT id, org_id, amount, status FROM invoices WHERE status NOT IN (''DRAFT'', ''SENT'', ''PAID'', ''OVERDUE'');';
  ELSE
    RAISE NOTICE '✅ All invoice status values are valid';
  END IF;
END $$;

-- Migration: Update any legacy status values (CUSTOMIZE AS NEEDED)
-- UNCOMMENT AND MODIFY AFTER REVIEW:

-- Example 1: If you have 'PENDING' status for invoices, map to 'DRAFT'
-- UPDATE invoices 
-- SET status = 'DRAFT' 
-- WHERE status = 'PENDING';

-- Example 2: If you have 'CANCELLED' status, decide on mapping
-- Option A: Delete cancelled invoices
-- DELETE FROM invoices WHERE status = 'CANCELLED';
-- Option B: Keep as DRAFT with note in description
-- UPDATE invoices 
-- SET status = 'DRAFT', 
--     description = CONCAT('[CANCELLED] ', COALESCE(description, ''))
-- WHERE status = 'CANCELLED';

-- ==================================================
-- STEP 5: AUTO-MARK OVERDUE INVOICES
-- ==================================================
-- This is a one-time migration to mark overdue invoices
-- After this, you should implement a scheduled job to auto-update

-- Count invoices that should be marked OVERDUE
SELECT 
  COUNT(*) as should_be_overdue,
  STRING_AGG(id::text, ', ') as invoice_ids
FROM invoices
WHERE status = 'SENT' 
  AND due_date < CURRENT_DATE;

-- Update SENT invoices past due date to OVERDUE
-- UNCOMMENT AFTER REVIEW:
-- UPDATE invoices
-- SET status = 'OVERDUE',
--     updated_at = CURRENT_TIMESTAMP
-- WHERE status = 'SENT'
--   AND due_date < CURRENT_DATE
-- RETURNING id, amount, due_date, status;

-- ==================================================
-- STEP 6: ADD CONSTRAINTS (OPTIONAL)
-- ==================================================
-- Add CHECK constraints to enforce valid status values
-- This prevents invalid values from being inserted in the future

-- Add constraint to memberships.member_status
-- ALTER TABLE memberships
-- DROP CONSTRAINT IF EXISTS memberships_member_status_check;
-- 
-- ALTER TABLE memberships
-- ADD CONSTRAINT memberships_member_status_check
-- CHECK (member_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT'));

-- Add constraint to invoices.status
-- ALTER TABLE invoices
-- DROP CONSTRAINT IF EXISTS invoices_status_check;
-- 
-- ALTER TABLE invoices
-- ADD CONSTRAINT invoices_status_check
-- CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE'));

-- ==================================================
-- STEP 7: VERIFY MIGRATION
-- ==================================================

-- Verify memberships
SELECT 
  'Memberships' as table_name,
  member_status,
  COUNT(*) as count
FROM memberships
GROUP BY member_status
ORDER BY member_status;

-- Verify invoices
SELECT 
  'Invoices' as table_name,
  status,
  COUNT(*) as count
FROM invoices
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'DRAFT' THEN 1
    WHEN 'SENT' THEN 2
    WHEN 'OVERDUE' THEN 3
    WHEN 'PAID' THEN 4
    ELSE 5
  END;

-- ==================================================
-- STEP 8: AUDIT LOG
-- ==================================================
-- Log this migration in audit_logs (if table exists)

-- INSERT INTO audit_logs (
--   org_id,
--   user_id,
--   action,
--   target_table,
--   target_id,
--   old_value,
--   new_value,
--   metadata
-- )
-- SELECT 
--   NULL as org_id,  -- System-level migration
--   NULL as user_id,  -- System action
--   'DATA_MIGRATION' as action,
--   'memberships,invoices' as target_table,
--   NULL as target_id,
--   NULL as old_value,
--   jsonb_build_object(
--     'migration', 'constants_update',
--     'date', CURRENT_TIMESTAMP,
--     'description', 'Updated status constants to match code: PENDING, ACTIVE, SUSPENDED, LEFT for memberships; DRAFT, SENT, PAID, OVERDUE for invoices'
--   ) as new_value,
--   jsonb_build_object(
--     'script', 'sql/migrate_constants.sql',
--     'version', '2026-01-04'
--   ) as metadata;

-- ==================================================
-- ROLLBACK PLAN
-- ==================================================
-- If something goes wrong, restore from backup:
-- psql -h HOST -U USER -d DATABASE < memberships_backup.sql
-- psql -h HOST -U USER -d DATABASE < invoices_backup.sql
-- ==================================================

-- ==================================================
-- POST-MIGRATION CHECKLIST
-- ==================================================
-- [ ] Backup completed
-- [ ] Validation scripts run
-- [ ] Invalid values reviewed
-- [ ] Migration executed
-- [ ] Constraints added (optional)
-- [ ] Verification queries run
-- [ ] Audit log created
-- [ ] Application deployed with new constants
-- [ ] Smoke tests passed
-- ==================================================

