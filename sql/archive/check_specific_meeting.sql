-- Patikrinti konkretų susirinkimą ea20becb-b925-4306-a758-734c0064bfd1
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id IS NOT NULL as has_resolution
FROM meeting_agenda_items mai
WHERE mai.meeting_id = 'ea20becb-b925-4306-a758-734c0064bfd1'
ORDER BY mai.item_no;

-- Patikrinti kitą susirinkimą a9f4c7a5-2dc1-40af-bc14-ae80c6cc4b6f
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id IS NOT NULL as has_resolution
FROM meeting_agenda_items mai
WHERE mai.meeting_id = 'a9f4c7a5-2dc1-40af-bc14-ae80c6cc4b6f'
ORDER BY mai.item_no;

