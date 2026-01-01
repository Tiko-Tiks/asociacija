-- ==================================================
-- SIMPLE VOTE MODULIO READ-ONLY AUDITAS
-- ==================================================
-- Patikrina esamą struktūrą prieš kurdami naują modulį
-- ==================================================

-- ==================================================
-- 1. VOTE_CHOICE ENUM EGZISTAVIMAS
-- ==================================================

SELECT 
  'vote_choice Enum' as check_type,
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'vote_choice'
GROUP BY t.typname;

-- Check if enum exists
SELECT 
  'vote_choice Enum Existence' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'vote_choice'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING - Need to create enum'
  END as status;

-- ==================================================
-- 2. MEMBERSHIPS SCHEMA
-- ==================================================

SELECT 
  'memberships Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'memberships'
ORDER BY ordinal_position;

-- Check key columns
SELECT 
  'memberships Key Columns' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'memberships'
      AND column_name = 'id'
    ) THEN '✓ id'
    ELSE '✗ id MISSING'
  END as id_column
UNION ALL
SELECT 
  'memberships Key Columns',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'memberships'
      AND column_name = 'org_id'
    ) THEN '✓ org_id'
    ELSE '✗ org_id MISSING'
  END
UNION ALL
SELECT 
  'memberships Key Columns',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'memberships'
      AND column_name = 'user_id'
    ) THEN '✓ user_id'
    ELSE '✗ user_id MISSING'
  END
UNION ALL
SELECT 
  'memberships Key Columns',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'memberships'
      AND column_name = 'member_status'
    ) THEN '✓ member_status'
    ELSE '✗ member_status MISSING'
  END;

-- ==================================================
-- 3. CAN_VOTE FUNCTION EGZISTAVIMAS
-- ==================================================

SELECT 
  'can_vote Function' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'can_vote';

-- Check function parameters
SELECT 
  'can_vote Function Parameters' as check_type,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.parameters p
JOIN information_schema.routines r ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'can_vote'
ORDER BY p.ordinal_position;

-- ==================================================
-- 4. SIMPLE_VOTES LENTELIŲ EGZISTAVIMAS
-- ==================================================

SELECT 
  'Simple Vote Tables Existence' as check_type,
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
  ('simple_votes'),
  ('simple_vote_ballots'),
  ('simple_vote_attachments')
) AS t(table_name);

-- ==================================================
-- 5. SIMPLE_VOTE_TALLIES VIEW EGZISTAVIMAS
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
  ('simple_vote_tallies')
) AS t(table_name);

-- ==================================================
-- 6. RPC FUNKCIJŲ EGZISTAVIMAS
-- ==================================================

SELECT 
  'RPC Functions' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'can_cast_simple_vote',
    'cast_simple_vote',
    'close_simple_vote',
    'create_simple_vote',
    'attach_simple_vote_file_metadata'
  )
ORDER BY routine_name;

-- ==================================================
-- 7. SUPABASE STORAGE BUCKET
-- ==================================================

-- Note: Storage bucket check requires Supabase dashboard or API
SELECT 
  'Storage Bucket Check' as check_type,
  'vote-documents bucket should exist in Supabase Storage' as note,
  'Check via Supabase Dashboard: Storage > Buckets' as instruction;

