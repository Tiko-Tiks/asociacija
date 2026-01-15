-- Test member_debts view
SELECT 
  membership_id,
  full_name,
  email,
  debt_status,
  overdue_count,
  pending_count,
  total_debt
FROM member_debts
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
ORDER BY total_debt DESC
LIMIT 10;

