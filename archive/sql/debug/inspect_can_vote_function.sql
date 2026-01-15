-- Check can_vote function definition
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'can_vote';

-- Alternative: get function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'can_vote';

