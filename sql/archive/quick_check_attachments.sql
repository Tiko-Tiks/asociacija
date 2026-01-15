-- ============================================
-- QUICK CHECK: AGENDA ATTACHMENTS
-- ============================================
-- 
-- Run this in Supabase SQL Editor to check
-- if attachments exist for item #4
--
-- ============================================

-- Find meeting and item #4
SELECT 
  m.id as meeting_id,
  m.title as meeting_title,
  mai.id as agenda_item_id,
  mai.item_no,
  mai.title as agenda_item_title,
  (SELECT COUNT(*) 
   FROM meeting_agenda_attachments maa 
   WHERE maa.agenda_item_id = mai.id) as attachment_count
FROM meetings m
INNER JOIN meeting_agenda_items mai ON mai.meeting_id = m.id
WHERE m.title ILIKE '%Visuotinis%'
  AND mai.item_no = 4
ORDER BY m.created_at DESC
LIMIT 1;

-- If meeting found, show attachments
-- Replace {AGENDA_ITEM_ID} with actual ID from above
SELECT 
  maa.*,
  mai.item_no,
  mai.title as agenda_item_title
FROM meeting_agenda_attachments maa
INNER JOIN meeting_agenda_items mai ON mai.id = maa.agenda_item_id
WHERE mai.item_no = 4
  AND mai.meeting_id IN (
    SELECT m.id 
    FROM meetings m 
    WHERE m.title ILIKE '%Visuotinis%'
  )
ORDER BY maa.uploaded_at;

