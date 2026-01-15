-- ==================================================
-- VALIDATE INVOICE STATUS VALUES
-- ==================================================
-- Purpose: Check if database has any invalid invoice statuses
-- After constants update: DRAFT, SENT, PAID, OVERDUE are valid
-- ==================================================

-- Check current status values in invoices table
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  CASE 
    WHEN status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE') THEN '✅ VALID'
    ELSE '❌ INVALID'
  END as validation_status
FROM invoices
GROUP BY status
ORDER BY count DESC;

-- Check for NULL status values
SELECT 
  COUNT(*) as null_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ WARNING: NULL values found'
    ELSE '✅ OK: No NULL values'
  END as status
FROM invoices
WHERE status IS NULL;

-- ==================================================
-- STATUS TRANSITION ANALYSIS
-- ==================================================
-- Check common status transitions (if updated_at exists)
WITH status_changes AS (
  SELECT 
    i1.id,
    i1.status as current_status,
    i1.created_at,
    i1.updated_at
  FROM invoices i1
)
SELECT 
  current_status,
  COUNT(*) as count,
  CASE 
    WHEN current_status = 'DRAFT' THEN '📝 Draft - needs to be sent'
    WHEN current_status = 'SENT' THEN '📧 Sent - awaiting payment'
    WHEN current_status = 'OVERDUE' THEN '⏰ Overdue - payment late'
    WHEN current_status = 'PAID' THEN '✅ Paid - completed'
    ELSE '❓ Unknown status'
  END as description
FROM status_changes
GROUP BY current_status
ORDER BY 
  CASE current_status
    WHEN 'DRAFT' THEN 1
    WHEN 'SENT' THEN 2
    WHEN 'OVERDUE' THEN 3
    WHEN 'PAID' THEN 4
    ELSE 5
  END;

-- ==================================================
-- OVERDUE ANALYSIS
-- ==================================================
-- Check if there are SENT invoices that should be OVERDUE
SELECT 
  id,
  amount,
  due_date,
  status,
  CASE 
    WHEN due_date < CURRENT_DATE AND status = 'SENT' 
    THEN '⚠️ Should be OVERDUE'
    ELSE '✅ OK'
  END as recommendation,
  CURRENT_DATE - due_date as days_overdue
FROM invoices
WHERE status = 'SENT' 
  AND due_date < CURRENT_DATE
ORDER BY days_overdue DESC
LIMIT 20;

-- ==================================================
-- DRAFT INVOICE ANALYSIS
-- ==================================================
-- Count DRAFT invoices by organization
SELECT 
  o.name as org_name,
  o.slug as org_slug,
  COUNT(i.id) as draft_count,
  MIN(i.created_at) as oldest_draft,
  MAX(i.created_at) as newest_draft
FROM invoices i
JOIN orgs o ON o.id = i.org_id
WHERE i.status = 'DRAFT'
GROUP BY o.id, o.name, o.slug
ORDER BY draft_count DESC;

-- ==================================================
-- RECOMMENDATIONS
-- ==================================================
-- If you see any invalid values:
-- 1. Check if they are typos or legacy values
-- 2. Map them to valid statuses
-- 3. Update the data
--
-- Example: Update invalid statuses to SENT (REVIEW FIRST!)
-- UPDATE invoices 
-- SET status = 'SENT' 
-- WHERE status NOT IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE')
-- AND status IS NOT NULL;
--
-- Example: Auto-mark overdue invoices
-- UPDATE invoices
-- SET status = 'OVERDUE'
-- WHERE status = 'SENT'
--   AND due_date < CURRENT_DATE;
-- ==================================================

