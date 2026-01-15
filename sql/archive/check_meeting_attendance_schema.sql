-- Check meeting_attendance table schema
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'meeting_attendance'
ORDER BY ordinal_position;

