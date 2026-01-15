-- ==================================================
-- VALIDATE MEMBERSHIP STATUS VALUES
-- ==================================================
-- Purpose: Check if database has any invalid membership statuses
-- After constants update: PENDING, ACTIVE, SUSPENDED, LEFT are valid
-- ==================================================

-- Check current member_status values in memberships table
SELECT 
  member_status,
  COUNT(*) as count,
  CASE 
    WHEN member_status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT') THEN '✅ VALID'
    ELSE '❌ INVALID'
  END as validation_status
FROM memberships
GROUP BY member_status
ORDER BY count DESC;

-- Check for NULL member_status values
SELECT 
  COUNT(*) as null_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ WARNING: NULL values found'
    ELSE '✅ OK: No NULL values'
  END as status
FROM memberships
WHERE member_status IS NULL;

-- Check status field (technical field for RLS)
SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT') THEN '✅ VALID'
    ELSE '❌ INVALID'
  END as validation_status
FROM memberships
GROUP BY status
ORDER BY count DESC;

-- ==================================================
-- ANALYSIS: member_status vs status usage
-- ==================================================
-- Check if there's any mismatch between member_status and status
SELECT 
  member_status,
  status,
  COUNT(*) as count,
  CASE 
    WHEN member_status = status THEN '✅ MATCH'
    WHEN member_status IS NULL OR status IS NULL THEN '⚠️ NULL VALUE'
    ELSE '❌ MISMATCH'
  END as match_status
FROM memberships
GROUP BY member_status, status
ORDER BY count DESC;

-- ==================================================
-- RECOMMENDATIONS
-- ==================================================
-- If you see any invalid values, you need to:
-- 1. Investigate why they exist
-- 2. Map them to valid statuses
-- 3. Update the data before deploying new code
--
-- Example update (DO NOT RUN WITHOUT REVIEW):
-- UPDATE memberships 
-- SET member_status = 'PENDING' 
-- WHERE member_status NOT IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT')
-- AND member_status IS NOT NULL;
-- ==================================================

