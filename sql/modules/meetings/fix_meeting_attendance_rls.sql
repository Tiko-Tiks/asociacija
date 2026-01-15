-- ============================================
-- FIX MEETING_ATTENDANCE RLS POLICIES
-- ============================================

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'meeting_attendance';

-- Drop old policies if they exist
DROP POLICY IF EXISTS "OWNER can manage meeting attendance" ON meeting_attendance;
DROP POLICY IF EXISTS "OWNER can manage attendance" ON meeting_attendance;
DROP POLICY IF EXISTS "BOARD can manage meeting attendance" ON meeting_attendance;
DROP POLICY IF EXISTS "Members can view attendance" ON meeting_attendance;

-- Create new policies

-- OWNER can insert/update/delete attendance
CREATE POLICY "OWNER can manage attendance"
ON meeting_attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    INNER JOIN meetings mt ON mt.org_id = m.org_id
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE mt.id = meeting_attendance.meeting_id
    AND m.user_id = auth.uid()
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    INNER JOIN meetings mt ON mt.org_id = m.org_id
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE mt.id = meeting_attendance.meeting_id
    AND m.user_id = auth.uid()
    AND m.member_status = 'ACTIVE'
    AND m.role = 'OWNER'
    AND o.status = 'ACTIVE'
  )
);

-- Members can view attendance for their org's meetings
CREATE POLICY "Members can view attendance"
ON meeting_attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    INNER JOIN meetings mt ON mt.org_id = m.org_id
    INNER JOIN orgs o ON o.id = m.org_id
    WHERE mt.id = meeting_attendance.meeting_id
    AND m.user_id = auth.uid()
    AND m.member_status = 'ACTIVE'
    AND o.status = 'ACTIVE'
  )
);

-- Verify
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'meeting_attendance'
ORDER BY cmd, policyname;

