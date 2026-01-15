-- ============================================
-- CHECK AGENDA ATTACHMENTS FOR MEETING
-- ============================================
-- 
-- Check if agenda item #4 has attachments
-- Meeting: "Visuotinis susirinkimas"
--
-- ============================================

-- Find the meeting
SELECT 
  m.id as meeting_id,
  m.title as meeting_title,
  m.status,
  m.org_id
FROM meetings m
WHERE m.title ILIKE '%Visuotinis susirinkimas%'
  OR m.title ILIKE '%visuotinis%'
ORDER BY m.created_at DESC
LIMIT 5;

-- Check agenda items for the meeting
-- Replace {MEETING_ID} with actual meeting ID from above
SELECT 
  mai.id as agenda_item_id,
  mai.item_no,
  mai.title,
  mai.meeting_id,
  (SELECT COUNT(*) 
   FROM meeting_agenda_attachments maa 
   WHERE maa.agenda_item_id = mai.id) as attachment_count
FROM meeting_agenda_items mai
WHERE mai.meeting_id IN (
  SELECT m.id 
  FROM meetings m 
  WHERE m.title ILIKE '%Visuotinis susirinkimas%'
    OR m.title ILIKE '%visuotinis%'
)
ORDER BY mai.item_no;

-- Check attachments for item #4
SELECT 
  maa.id,
  maa.agenda_item_id,
  maa.file_name,
  maa.mime_type,
  maa.size_bytes,
  maa.storage_bucket,
  maa.storage_path,
  mai.item_no,
  mai.title as agenda_item_title
FROM meeting_agenda_attachments maa
INNER JOIN meeting_agenda_items mai ON mai.id = maa.agenda_item_id
WHERE mai.item_no = 4
  AND mai.meeting_id IN (
    SELECT m.id 
    FROM meetings m 
    WHERE m.title ILIKE '%Visuotinis susirinkimas%'
      OR m.title ILIKE '%visuotinis%'
  )
ORDER BY maa.uploaded_at;

