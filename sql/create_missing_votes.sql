-- ==================================================
-- CREATE MISSING VOTES FOR MEETING
-- ==================================================
-- Sukurti votes visiems agenda items su resolution_id
-- ==================================================

-- PAKEISTI MEETING_ID
-- meeting_id: '4baafb4e-4c76-4317-8bf9-f4c10e011766'

-- 1. Patikrinti ar yra agenda items su resolution_id
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id,
  r.org_id
FROM meeting_agenda_items mai
JOIN resolutions r ON r.id = mai.resolution_id
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no;

-- 2. Sukurti votes (jei nėra)
-- NOTE: Jei yra items su resolution_id, šis INSERT sukurs votes

INSERT INTO votes (org_id, resolution_id, meeting_id, kind, status, opens_at)
SELECT 
  r.org_id,
  mai.resolution_id,
  mai.meeting_id,
  'GA'::vote_kind,
  'OPEN',
  NOW()  -- opens immediately
FROM meeting_agenda_items mai
JOIN resolutions r ON r.id = mai.resolution_id
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.resolution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM votes v
    WHERE v.meeting_id = mai.meeting_id
      AND v.resolution_id = mai.resolution_id
      AND v.kind = 'GA'
  );

-- 3. Patikrinti ar votes sukurti
SELECT 
  v.id AS vote_id,
  v.kind,
  v.status,
  v.opens_at,
  mai.item_no,
  mai.title
FROM votes v
LEFT JOIN resolutions r ON r.id = v.resolution_id
LEFT JOIN meeting_agenda_items mai ON mai.resolution_id = r.id
WHERE v.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no NULLS LAST;

-- Expected: Votes sukurti visiems items

