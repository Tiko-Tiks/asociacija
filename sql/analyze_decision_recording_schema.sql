-- ==================================================
-- SPRENDIMŲ REGISTRAVIMO SCHEMOS ANALIZĖ
-- ==================================================
-- Analizuoja esamą schemą: meetings, events, 
-- event_attendance, resolutions ir jų ryšius
-- ==================================================

-- ==================================================
-- 1. LENTELIŲ EGZISTAVIMO PATIKRA
-- ==================================================

SELECT 
  'Table Existence Check' as check_type,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (VALUES 
  ('meetings'),
  ('events'),
  ('event_attendance'),
  ('resolutions'),
  ('business_events')
) AS t(table_name);

-- ==================================================
-- 2. MEETINGS LENTELĖS STRUKTŪRA
-- ==================================================

SELECT 
  'Meetings Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meetings'
ORDER BY ordinal_position;

-- ==================================================
-- 3. EVENTS LENTELĖS STRUKTŪRA
-- ==================================================

SELECT 
  'Events Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'events'
ORDER BY ordinal_position;

-- ==================================================
-- 4. EVENT_ATTENDANCE LENTELĖS STRUKTŪRA
-- ==================================================

SELECT 
  'Event Attendance Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'event_attendance'
ORDER BY ordinal_position;

-- ==================================================
-- 5. RESOLUTIONS LENTELĖS STRUKTŪRA (jau turime)
-- ==================================================

SELECT 
  'Resolutions Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resolutions'
ORDER BY ordinal_position;

-- ==================================================
-- 6. RYŠIAI TARP LENTELIŲ
-- ==================================================

-- Check foreign keys from resolutions to meetings/events
SELECT 
  'Resolutions Foreign Keys' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'resolutions'
  AND ccu.table_name IN ('meetings', 'events');

-- Check foreign keys from event_attendance
SELECT 
  'Event Attendance Foreign Keys' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'event_attendance';

-- ==================================================
-- 7. KVORUMO SKAIČIAVIMAS
-- ==================================================

-- Check for quorum calculation in meetings
SELECT 
  'Quorum Calculation in Meetings' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meetings'
  AND column_name LIKE '%quorum%';

-- Check for quorum calculation function
SELECT 
  'Quorum Calculation Function' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%quorum%';

-- ==================================================
-- 8. DALYVIŲ SKAIČIAVIMAS (procedural facts)
-- ==================================================

-- Check how attendance is tracked
SELECT 
  'Attendance Tracking' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'event_attendance'
  AND column_name IN ('present', 'attended', 'status', 'attendance_status');

-- ==================================================
-- 9. RESOLUTION LIFECYCLE
-- ==================================================

-- Check resolution status and adoption fields
SELECT 
  'Resolution Lifecycle Fields' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resolutions'
  AND column_name IN ('status', 'adopted_at', 'adopted_by', 'meeting_id', 'event_id');

-- Check resolution status distribution
SELECT 
  'Resolution Status Distribution' as check_type,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE adopted_at IS NOT NULL) as with_adoption_date,
  COUNT(*) FILTER (WHERE adopted_by IS NOT NULL) as with_adoption_by
FROM public.resolutions
GROUP BY status
ORDER BY count DESC;

-- ==================================================
-- 10. MEETING-RESOLUTION RELATIONSHIP
-- ==================================================

-- Check if resolutions reference meetings
SELECT 
  'Resolution-Meeting Relationship' as check_type,
  COUNT(*) FILTER (WHERE meeting_id IS NOT NULL) as resolutions_with_meeting_id,
  COUNT(*) FILTER (WHERE event_id IS NOT NULL) as resolutions_with_event_id,
  COUNT(*) as total_resolutions
FROM public.resolutions;

-- Sample resolutions with meeting links
SELECT 
  'Sample Resolution-Meeting Links' as check_type,
  r.id as resolution_id,
  r.title as resolution_title,
  r.status as resolution_status,
  r.meeting_id,
  r.event_id,
  m.title as meeting_title,
  m.scheduled_at as meeting_date
FROM public.resolutions r
LEFT JOIN public.meetings m ON m.id = r.meeting_id
LIMIT 10;

-- ==================================================
-- 11. ATTENDANCE-QUORUM RELATIONSHIP
-- ==================================================

-- Check attendance records
SELECT 
  'Attendance Records Summary' as check_type,
  COUNT(DISTINCT event_id) as events_with_attendance,
  COUNT(DISTINCT membership_id) as unique_attendees,
  COUNT(*) FILTER (WHERE present = true OR attended = true) as present_count,
  COUNT(*) as total_attendance_records
FROM public.event_attendance;

-- ==================================================
-- 12. IMMUTABILITY CHECKS
-- ==================================================

-- Check if finalized meetings can be modified
SELECT 
  'Meeting Immutability' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE event_object_schema = 'public'
      AND event_object_table = 'meetings'
      AND trigger_name LIKE '%finalized%' OR trigger_name LIKE '%immutable%'
    ) THEN '✓ Immutability trigger EXISTS'
    ELSE '✗ Immutability trigger MISSING'
  END as immutability_status;

-- Check if finalized resolutions can be modified (already checked in voting audit)
SELECT 
  'Resolution Immutability' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE event_object_schema = 'public'
      AND event_object_table = 'resolutions'
      AND (trigger_name LIKE '%approved%' OR trigger_name LIKE '%immutable%')
    ) THEN '✓ Immutability trigger EXISTS'
    ELSE '✗ Immutability trigger MISSING'
  END as immutability_status;

-- ==================================================
-- 13. SUMMARY
-- ==================================================

SELECT 
  '=== SCHEMA ANALYSIS SUMMARY ===' as summary;

-- Count tables
SELECT 
  'Existing Tables' as metric,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('meetings', 'events', 'event_attendance', 'resolutions');

-- Count relationships
SELECT 
  'Foreign Key Relationships' as metric,
  COUNT(*) as count
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'
  AND (
    (table_name = 'resolutions' AND constraint_name LIKE '%meeting%' OR constraint_name LIKE '%event%')
    OR (table_name = 'event_attendance')
  );

