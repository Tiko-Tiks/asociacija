-- Check triggers on memberships table
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as trigger_def
FROM pg_trigger
WHERE tgrelid = 'memberships'::regclass
  AND tgname LIKE '%owner%';

