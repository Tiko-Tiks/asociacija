-- ============================================
-- TEST: member_debts view
-- ============================================

-- Test 1: View exists?
SELECT 
  'member_debts view exists' as test,
  EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_name = 'member_debts'
  ) as result;

-- Test 2: Query with your org_id
SELECT 
  'Total members' as metric,
  COUNT(*) as value
FROM member_debts
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52';

SELECT 
  'Debtors' as metric,
  COUNT(*) as value
FROM member_debts
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
  AND debt_status = 'DEBTOR';

-- Test 3: Sample data
SELECT 
  full_name,
  email,
  debt_status,
  overdue_count,
  pending_count,
  total_debt::numeric(10,2) as total_debt_eur
FROM member_debts
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
ORDER BY total_debt DESC
LIMIT 10;

