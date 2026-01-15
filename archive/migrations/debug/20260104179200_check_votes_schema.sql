-- Check votes table schema
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'votes'
ORDER BY ordinal_position;

