-- ==================================================
-- GA SUSIRINKIMO MODULIO READ-ONLY AUDITAS
-- ==================================================
-- Patikrina esamą struktūrą prieš kurdami naują modulį
-- ==================================================

-- ==================================================
-- 1. MEETINGS LENTELĖS STRUKTŪRA
-- ==================================================

SELECT 
  'meetings Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meetings'
ORDER BY ordinal_position;

-- Check if new columns exist
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
  END as status
UNION ALL
SELECT 
  'meetings.status',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'status'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END
UNION ALL
SELECT 
  'meetings.location',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'location'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END
UNION ALL
SELECT 
  'meetings.published_at',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'published_at'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END
UNION ALL
SELECT 
  'meetings.notice_days',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'notice_days'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END
UNION ALL
SELECT 
  'meetings.notice_sent_at',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'notice_sent_at'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END
UNION ALL
SELECT 
  'meetings.agenda_version',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'agenda_version'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END;

-- ==================================================
-- 2. GOVERNANCE_CONFIGS - meeting_notice_days
-- ==================================================

-- Check if meeting_notice_days exists in governance_configs.answers
SELECT 
  'governance_configs.answers meeting_notice_days' as check_type,
  COUNT(*) as orgs_with_notice_days
FROM public.governance_configs
WHERE answers ? 'meeting_notice_days'
  AND answers->>'meeting_notice_days' IS NOT NULL;

-- Sample values
SELECT 
  'Sample meeting_notice_days values' as check_type,
  org_id,
  answers->>'meeting_notice_days' as notice_days_value,
  (answers->>'meeting_notice_days')::int as notice_days_int
FROM public.governance_configs
WHERE answers ? 'meeting_notice_days'
  AND answers->>'meeting_notice_days' IS NOT NULL
LIMIT 5;

-- ==================================================
-- 3. ROLES MODELIS
-- ==================================================

-- Check memberships.role
SELECT 
  'memberships.role values' as check_type,
  role,
  COUNT(*) as count
FROM public.memberships
WHERE member_status = 'ACTIVE'
GROUP BY role
ORDER BY role;

-- Check positions table
SELECT 
  'positions Table Existence' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'positions'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- Check positions structure if exists
SELECT 
  'positions Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'positions'
ORDER BY ordinal_position;

-- ==================================================
-- 4. MEETING_ATTENDANCE STRUKTŪRA
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

-- ==================================================
-- 5. AGENDA LENTELIŲ EGZISTAVIMAS
-- ==================================================

SELECT 
  'Agenda Tables Existence' as check_type,
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
  ('meeting_agenda_items'),
  ('meeting_agenda_attachments')
) AS t(table_name);

-- ==================================================
-- 6. VIEW EGZISTAVIMAS
-- ==================================================

SELECT 
  'View Existence' as check_type,
  table_name as view_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name = t.table_name
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (VALUES 
  ('meeting_agenda_public')
) AS t(table_name);

-- ==================================================
-- 7. RPC FUNKCIJŲ EGZISTAVIMAS
-- ==================================================

SELECT 
  'RPC Functions' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_governance_int',
    'can_schedule_meeting',
    'create_meeting_ga',
    'update_meeting_schedule',
    'add_agenda_item',
    'update_agenda_item',
    'delete_agenda_item',
    'attach_agenda_file_metadata',
    'publish_meeting'
  )
ORDER BY routine_name;

-- ==================================================
-- 8. SUPABASE STORAGE BUCKET
-- ==================================================

-- Note: Storage bucket check requires Supabase dashboard or API
-- This is informational only
SELECT 
  'Storage Bucket Check' as check_type,
  'meeting-documents bucket should exist in Supabase Storage' as note,
  'Check via Supabase Dashboard: Storage > Buckets' as instruction;

