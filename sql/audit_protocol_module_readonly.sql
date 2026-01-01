-- ==================================================
-- GA PROTOKOLŲ MODULIO READ-ONLY AUDITAS
-- ==================================================
-- Patikrina esamą struktūrą prieš kurdami naują modulį
-- ==================================================

-- ==================================================
-- 1. MEETINGS STRUKTŪRA
-- ==================================================

SELECT 
  'meetings Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meetings'
  AND column_name IN ('id', 'org_id', 'title', 'scheduled_at', 'location', 'meeting_type', 'status', 'published_at', 'notice_days')
ORDER BY ordinal_position;

-- Check meeting_type column
SELECT 
  'meetings.meeting_type' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'meeting_type'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- ==================================================
-- 2. MEETING_ATTENDANCE STRUKTŪRA
-- ==================================================

SELECT 
  'meeting_attendance Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meeting_attendance'
ORDER BY ordinal_position;

-- Check mode column (IN_PERSON/WRITTEN/REMOTE)
SELECT 
  'meeting_attendance.mode values' as check_type,
  mode,
  COUNT(*) as count
FROM public.meeting_attendance
GROUP BY mode
LIMIT 10;

-- ==================================================
-- 3. MEETING_AGENDA_ITEMS STRUKTŪRA
-- ==================================================

SELECT 
  'meeting_agenda_items Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meeting_agenda_items'
ORDER BY ordinal_position;

-- Check resolution_id column
SELECT 
  'meeting_agenda_items.resolution_id' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meeting_agenda_items'
      AND column_name = 'resolution_id'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- ==================================================
-- 4. VOTES STRUKTŪRA
-- ==================================================

SELECT 
  'votes Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'votes'
  AND column_name IN ('id', 'org_id', 'resolution_id', 'meeting_id', 'kind', 'status', 'opens_at', 'closes_at', 'closed_at')
ORDER BY ordinal_position;

-- Check kind column (GA/OPINION)
SELECT 
  'votes.kind values' as check_type,
  kind,
  COUNT(*) as count
FROM public.votes
GROUP BY kind
LIMIT 10;

-- ==================================================
-- 5. VOTE_TALLIES VIEW
-- ==================================================

SELECT 
  'vote_tallies View Existence' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name = 'vote_tallies'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- Check vote_tallies structure
SELECT 
  'vote_tallies View Structure' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vote_tallies'
ORDER BY ordinal_position;

-- ==================================================
-- 6. MEETING_QUORUM_STATUS FUNCTION
-- ==================================================

SELECT 
  'meeting_quorum_status Function' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'meeting_quorum_status';

-- Check function parameters
SELECT 
  'meeting_quorum_status Parameters' as check_type,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.parameters p
JOIN information_schema.routines r ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'meeting_quorum_status'
ORDER BY p.ordinal_position;

-- ==================================================
-- 7. APPLY_VOTE_OUTCOME FUNCTION
-- ==================================================

SELECT 
  'apply_vote_outcome Function' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'apply_vote_outcome';

-- ==================================================
-- 8. RESOLUTIONS STRUKTŪRA
-- ==================================================

SELECT 
  'resolutions Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resolutions'
  AND column_name IN ('id', 'org_id', 'title', 'status', 'adopted_at', 'adopted_by', 'recommended_at', 'recommended_by')
ORDER BY ordinal_position;

-- ==================================================
-- 9. MEETING_PROTOCOLS LENTELIŲ EGZISTAVIMAS
-- ==================================================

SELECT 
  'Protocol Tables Existence' as check_type,
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
  ('meeting_protocols'),
  ('meeting_protocol_signatures')
) AS t(table_name);

-- ==================================================
-- 10. RPC FUNKCIJŲ EGZISTAVIMAS
-- ==================================================

SELECT 
  'RPC Functions' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'build_meeting_protocol_snapshot',
    'preview_meeting_protocol',
    'finalize_meeting_protocol',
    'get_meeting_protocol'
  )
ORDER BY routine_name;

