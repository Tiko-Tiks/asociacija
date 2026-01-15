-- ==================================================
-- CHECK: Procedural Agenda Items
-- ==================================================
-- Patikrinti ar susirinkimas turi procedūrinius klausimus (1, 2, 3)
-- ==================================================

-- PAKEISTI MEETING_ID pagal savo susirinkimo ID
-- meeting_id: '4baafb4e-4c76-4317-8bf9-f4c10e011766'

SELECT 
  mai.id,
  mai.meeting_id,
  mai.item_no,
  mai.title,
  mai.summary,
  mai.details,
  mai.resolution_id,
  r.status AS resolution_status,
  mai.created_at
FROM meeting_agenda_items mai
LEFT JOIN resolutions r ON r.id = mai.resolution_id
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no IN (1, 2, 3)
ORDER BY mai.item_no;

-- Tikrinti ar egzistuoja VISI procedūriniai klausimai
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN 'OK - Visi 3 procedūriniai klausimai egzistuoja'
    ELSE 'MISSING - Trūksta ' || (3 - COUNT(*))::text || ' procedūrinių klausimų'
  END AS status,
  COUNT(*) AS found_count,
  array_agg(item_no ORDER BY item_no) AS found_item_nos,
  CASE 
    WHEN COUNT(*) < 3 THEN 
      array_agg(DISTINCT unnest(ARRAY[1,2,3]) - unnest(array_agg(item_no)))
    ELSE NULL
  END AS missing_item_nos
FROM meeting_agenda_items
WHERE meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND item_no IN (1, 2, 3);

