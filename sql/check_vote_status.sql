-- Check vote status for latest GA meeting
SELECT 
  m.id as meeting_id,
  m.title,
  m.status as meeting_status,
  m.scheduled_at,
  v.id as vote_id,
  v.status as vote_status,
  v.kind,
  mai.item_no,
  mai.title as item_title
FROM meetings m
JOIN meeting_agenda_items mai ON mai.meeting_id = m.id
LEFT JOIN resolutions r ON r.id = mai.resolution_id
LEFT JOIN votes v ON v.resolution_id = r.id
WHERE m.meeting_type = 'GA'
ORDER BY m.created_at DESC, mai.item_no
LIMIT 20;

