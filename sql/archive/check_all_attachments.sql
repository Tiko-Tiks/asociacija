-- ============================================
-- CHECK ALL AGENDA ATTACHMENTS
-- ============================================
-- 
-- Run this in Supabase SQL Editor to check
-- if attachment was saved to DB
--
-- ============================================

-- 1. Check all attachments in the system (newest first)
SELECT 
  maa.id,
  maa.file_name,
  maa.mime_type,
  maa.size_bytes,
  maa.storage_bucket,
  maa.storage_path,
  maa.uploaded_at,
  mai.item_no,
  mai.title as agenda_item_title,
  m.title as meeting_title,
  m.id as meeting_id
FROM meeting_agenda_attachments maa
INNER JOIN meeting_agenda_items mai ON mai.id = maa.agenda_item_id
INNER JOIN meetings m ON m.id = mai.meeting_id
ORDER BY maa.uploaded_at DESC
LIMIT 20;

