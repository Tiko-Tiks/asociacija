-- ============================================
-- DEBUG: Test member_debts view
-- ============================================

-- Replace with your org_id:
\set org_id '678b0788-b544-4bf8-8cf5-44dfb2185a52'

-- Test 1: Does view exist?
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.views 
  WHERE table_name = 'member_debts'
);

-- Test 2: Can we query it?
SELECT 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE debt_status = 'DEBTOR') as debtors,
  COUNT(*) FILTER (WHERE debt_status = 'PENDING') as pending,
  COUNT(*) FILTER (WHERE debt_status = 'PAID_UP') as paid_up
FROM member_debts
WHERE org_id = :'org_id';

-- Test 3: Show sample data
SELECT 
  membership_id,
  full_name,
  email,
  debt_status,
  overdue_count,
  pending_count,
  total_debt
FROM member_debts
WHERE org_id = :'org_id'
LIMIT 5;

-- Test 4: Check underlying tables
SELECT 
  COUNT(*) as active_members
FROM memberships
WHERE org_id = :'org_id'
  AND member_status = 'ACTIVE';

SELECT 
  COUNT(*) as total_invoices,
  COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue,
  COUNT(*) FILTER (WHERE status = 'SENT') as sent,
  COUNT(*) FILTER (WHERE status = 'PAID') as paid
FROM invoices i
JOIN memberships m ON m.id = i.membership_id
WHERE m.org_id = :'org_id';

