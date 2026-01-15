-- Check app_role enum values
SELECT 
  e.enumlabel as allowed_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'app_role'
ORDER BY e.enumsortorder;

