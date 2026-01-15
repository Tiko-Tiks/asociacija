-- Check if can_vote function exists and what it returns
SELECT 
  routine_schema,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'can_vote';

-- If exists, check its definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'can_vote';

-- Test call (if function exists)
-- SELECT * FROM can_vote('5865535b-494c-461c-89c5-2463c08cdeae', auth.uid());

