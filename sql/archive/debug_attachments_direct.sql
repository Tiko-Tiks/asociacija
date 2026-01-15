-- ============================================
-- CHECK ATTACHMENTS DIRECTLY
-- ============================================
-- 
-- Run this in Supabase SQL Editor
--
-- ============================================

-- Check ALL attachments in DB (no RLS)
SELECT 
  'ALL_ATTACHMENTS' as query_type,
  COUNT(*) as total
FROM meeting_agenda_attachments;

-- Check attachments with meeting info
SELECT 
  maa.id as attachment_id,
  maa.file_name,
  maa.mime_type,
  maa.size_bytes,
  maa.storage_bucket,
  maa.storage_path,
  maa.uploaded_at,
  maa.agenda_item_id,
  mai.item_no,
  mai.title as agenda_item_title,
  m.id as meeting_id,
  m.title as meeting_title,
  m.status as meeting_status
FROM meeting_agenda_attachments maa
INNER JOIN meeting_agenda_items mai ON mai.id = maa.agenda_item_id
INNER JOIN meetings m ON m.id = mai.meeting_id
ORDER BY maa.uploaded_at DESC
LIMIT 20;

-- Check RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) as qual_preview
FROM pg_policies
WHERE tablename = 'meeting_agenda_attachments';

