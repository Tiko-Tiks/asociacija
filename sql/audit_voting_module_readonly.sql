-- ==================================================
-- BALSAVIMO MODULIO READ-ONLY AUDITAS
-- ==================================================
-- Tikrina esamus DB objektus be jokių keitimų
-- ==================================================

-- ==================================================
-- 1. LENTELIŲ EGZISTAVIMAS
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
  ('vote_ballots')
) AS t(table_name);

-- ==================================================
-- 2. VIEW EGZISTAVIMAS
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
-- 3. RPC FUNKCIJŲ EGZISTAVIMAS
-- ==================================================

SELECT 
  'RPC Functions' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'can_cast_vote',
    'cast_vote',
    'close_vote',
    'apply_vote_outcome'
  )
ORDER BY routine_name;

-- ==================================================
-- 4. VOTES LENTELĖS STRUKTŪRA
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
-- 5. VOTE_BALLOTS LENTELĖS STRUKTŪRA
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
-- 6. RESOLUTIONS.STATUS CHECK CONSTRAINT
-- ==================================================

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
-- 7. RESOLUTIONS RECOMMENDED STULPELIAI
-- ==================================================

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

-- ==================================================
-- 8. MEETING_ATTENDANCE.MODE STULPELIS
-- ==================================================

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
-- 9. RPC FUNKCIJŲ PARAMETRAI
-- ==================================================

SELECT 
  'RPC Function Parameters' as check_type,
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.parameters p
JOIN information_schema.routines r 
  ON p.specific_schema = r.specific_schema 
  AND p.specific_name = r.specific_name
WHERE p.specific_schema = 'public'
  AND r.routine_name IN (
    'can_cast_vote',
    'cast_vote',
    'close_vote',
    'apply_vote_outcome'
  )
ORDER BY r.routine_name, p.ordinal_position;

