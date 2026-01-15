-- ============================================
-- CREATE: member_debts VIEW
-- ============================================
--
-- Purpose: Provide easy access to member debt status
-- Used by: Owner Dashboard - Debtors Management
--
-- Shows:
-- - All ACTIVE members
-- - Count of overdue/pending invoices
-- - Total debt amount
-- - Oldest overdue date
-- - Debt status classification
--
-- SECURITY: Created with SECURITY INVOKER to respect RLS
-- ============================================

CREATE OR REPLACE VIEW member_debts 
WITH (security_invoker = true)
AS
SELECT 
  m.id as membership_id,
  m.org_id,
  m.user_id,
  m.member_status,
  p.full_name,
  p.email,
  COUNT(i.id) FILTER (WHERE i.status = 'OVERDUE') as overdue_count,
  COUNT(i.id) FILTER (WHERE i.status = 'SENT') as pending_count,
  COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('OVERDUE', 'SENT')), 0) as total_debt,
  MAX(i.due_date) FILTER (WHERE i.status = 'OVERDUE') as oldest_overdue_date,
  CASE 
    WHEN COUNT(i.id) FILTER (WHERE i.status = 'OVERDUE') > 0 THEN 'DEBTOR'
    WHEN COUNT(i.id) FILTER (WHERE i.status = 'SENT') > 0 THEN 'PENDING'
    ELSE 'PAID_UP'
  END as debt_status
FROM memberships m
INNER JOIN orgs o ON o.id = m.org_id
LEFT JOIN profiles p ON p.id = m.user_id
LEFT JOIN invoices i ON i.membership_id = m.id
WHERE m.member_status = 'ACTIVE'
  AND o.status = 'ACTIVE'
  AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
GROUP BY m.id, m.org_id, m.user_id, m.member_status, p.full_name, p.email;

-- ============================================
-- ACCESS CONTROL
-- ============================================
--
-- NOTE: Views don't support RLS policies directly.
-- Access is controlled by:
-- 1. Underlying table RLS policies (memberships, profiles, invoices)
-- 2. View is only accessible via server actions with requireOwner() guard
-- 3. Server actions in src/app/actions/debtors.ts enforce OWNER-only access
--
-- The view will respect RLS on underlying tables automatically.
-- Server action explicitly checks: await requireOwner(supabase, user.id, orgId)
--
-- ============================================
-- VERIFICATION
-- ============================================

-- Test query (replace org_id):
/*
SELECT 
  full_name,
  email,
  debt_status,
  overdue_count,
  pending_count,
  total_debt
FROM member_debts
WHERE org_id = 'YOUR_ORG_ID_HERE'
ORDER BY total_debt DESC;
*/

-- ============================================
-- END OF SCRIPT
-- ============================================

