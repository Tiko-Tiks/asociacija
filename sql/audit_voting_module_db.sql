-- ==================================================
-- BALSAVIMO MODULIO DB AUDITAS
-- ==================================================
-- Patikrina, kas egzistuoja ir ko trūksta
-- ==================================================

-- ==================================================
-- 1. ENUM PATIKRA
-- ==================================================

SELECT 
  'ENUM Check' as check_type,
  t.typname as enum_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_type 
      WHERE typname = t.typname
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (VALUES 
  ('vote_kind'),
  ('vote_choice'),
  ('vote_channel')
) AS t(typname);

-- Check enum values if they exist
SELECT 
  'vote_kind values' as enum_name,
  string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'vote_kind';

SELECT 
  'vote_choice values' as enum_name,
  string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'vote_choice';

SELECT 
  'vote_channel values' as enum_name,
  string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'vote_channel';

-- ==================================================
-- 2. LENTELIŲ PATIKRA
-- ==================================================

SELECT 
  'Table Existence' as check_type,
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
  ('votes'),
  ('vote_ballots'),
  ('meeting_attendance'),
  ('resolutions')
) AS t(table_name);

-- ==================================================
-- 3. MEETING_ATTENDANCE STRUKTŪRA
-- ==================================================

SELECT 
  'meeting_attendance Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meeting_attendance'
ORDER BY ordinal_position;

-- Check if mode column exists
SELECT 
  'meeting_attendance.mode' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'meeting_attendance'
      AND column_name = 'mode'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- ==================================================
-- 4. RESOLUTIONS STRUKTŪRA
-- ==================================================

SELECT 
  'resolutions Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resolutions'
ORDER BY ordinal_position;

-- Check if recommended_at/recommended_by exist
SELECT 
  'resolutions.recommended_at' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'resolutions'
      AND column_name = 'recommended_at'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
UNION ALL
SELECT 
  'resolutions.recommended_by',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'resolutions'
      AND column_name = 'recommended_by'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END;

-- Check status constraint
SELECT 
  'resolutions.status CHECK constraint' as check_type,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'resolutions'
  AND tc.constraint_type = 'CHECK'
  AND cc.check_clause LIKE '%status%';

-- ==================================================
-- 5. VOTES LENTELĖS STRUKTŪRA
-- ==================================================

SELECT 
  'votes Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'votes'
ORDER BY ordinal_position;

-- ==================================================
-- 6. VOTE_BALLOTS LENTELĖS STRUKTŪRA
-- ==================================================

SELECT 
  'vote_ballots Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vote_ballots'
ORDER BY ordinal_position;

-- ==================================================
-- 7. VIEW PATIKRA
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
  ('vote_tallies')
) AS t(table_name);

-- ==================================================
-- 8. RPC FUNKCIJŲ PATIKRA
-- ==================================================

SELECT 
  'RPC Functions' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_membership_id',
    'can_cast_vote',
    'cast_vote',
    'close_vote',
    'approve_resolution_if_passed',
    'apply_vote_outcome'
  )
ORDER BY routine_name;

-- ==================================================
-- 9. INDEXES PATIKRA
-- ==================================================

SELECT 
  'Indexes on votes' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'votes'
ORDER BY indexname;

SELECT 
  'Indexes on vote_ballots' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'vote_ballots'
ORDER BY indexname;

-- ==================================================
-- 10. UNIQUE CONSTRAINTS PATIKRA
-- ==================================================

SELECT 
  'Unique Constraints' as check_type,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('votes', 'vote_ballots')
ORDER BY tc.table_name, tc.constraint_name;

