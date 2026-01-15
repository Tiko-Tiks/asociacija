-- Direct test of member_debts view
-- Run this in Supabase SQL Editor to see if view works

-- Test 1: Does view exist and return data?
SELECT * FROM member_debts 
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
LIMIT 1;

-- Test 2: Count total
SELECT COUNT(*) as total FROM member_debts 
WHERE org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52';

-- Test 3: Check underlying data
SELECT 
  m.id as membership_id,
  m.org_id,
  m.user_id,
  m.member_status,
  p.full_name,
  p.email
FROM memberships m
LEFT JOIN profiles p ON p.id = m.user_id
WHERE m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52'
  AND m.member_status = 'ACTIVE'
LIMIT 5;

-- Test 4: Check if invoices table accessible
SELECT COUNT(*) as invoice_count
FROM invoices i
JOIN memberships m ON m.id = i.membership_id
WHERE m.org_id = '678b0788-b544-4bf8-8cf5-44dfb2185a52';

