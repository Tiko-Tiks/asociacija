-- ==================================================
-- READ-ONLY AUDIT: Ideas/Projects Module Prerequisites
-- ==================================================
-- This script checks existing infrastructure needed for the Ideas/Projects module
-- NO CHANGES - READ ONLY

-- 1. Check notifications/email mechanism
SELECT 
  'Notifications Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') 
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications')
    THEN (SELECT COUNT(*)::text FROM notifications)
    ELSE 'N/A'
  END as details;

-- 2. Check memberships structure
SELECT 
  'Memberships Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'memberships'
  AND column_name IN ('id', 'org_id', 'user_id', 'status', 'member_status')
ORDER BY ordinal_position;

-- 3. Check if can_vote function exists
SELECT 
  'can_vote Function' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname = 'can_vote'
    )
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname = 'can_vote'
    )
    THEN (
      SELECT pg_get_function_identity_arguments(p.oid)
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname = 'can_vote'
      LIMIT 1
    )
    ELSE 'N/A'
  END as details;

-- 4. Check governance_questions structure
SELECT 
  'Governance Questions' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'governance_questions'
  AND column_name IN ('id', 'question_key', 'question_text', 'question_type', 'options')
ORDER BY ordinal_position;

-- 5. Check governance_configs structure
SELECT 
  'Governance Configs' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'governance_configs'
  AND column_name IN ('id', 'org_id', 'answers', 'active_config')
ORDER BY ordinal_position;

-- 6. Check existing ideas/projects tables (should not exist yet)
SELECT 
  'Ideas Table' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ideas')
    THEN '⚠ EXISTS (may conflict)'
    ELSE '✓ NOT EXISTS'
  END as status;

SELECT 
  'Projects Table' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects')
    THEN '⚠ EXISTS (may conflict)'
    ELSE '✓ NOT EXISTS'
  END as status;

-- 7. Check positions table (for OWNER/BOARD checks)
SELECT 
  'Positions Table' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'positions')
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'positions')
    THEN (
      SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'positions'
    )
    ELSE 'N/A'
  END as details;

-- 8. Summary
SELECT 
  'AUDIT SUMMARY' as section,
  'Check results above' as note;

