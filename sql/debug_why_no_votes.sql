-- ==================================================
-- DEBUG: Kodėl votes nebuvo sukurti?
-- ==================================================

-- PAKEISTI MEETING_ID
-- meeting_id: '4baafb4e-4c76-4317-8bf9-f4c10e011766'

-- ==================================================
-- 1. PATIKRINTI MEETING STATUSĄ
-- ==================================================
SELECT 
  id,
  title,
  status,
  meeting_type,
  published_at,
  scheduled_at
FROM meetings
WHERE id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- Expected: status = 'PUBLISHED', published_at IS NOT NULL

-- ==================================================
-- 2. PATIKRINTI AGENDA ITEMS SU RESOLUTION_ID
-- ==================================================
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id,
  CASE 
    WHEN mai.resolution_id IS NOT NULL THEN '✅ Has resolution'
    ELSE '❌ NO resolution_id'
  END AS resolution_status
FROM meeting_agenda_items mai
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no;

-- Expected: Visi items turi resolution_id

-- ==================================================
-- 3. PATIKRINTI RESOLUTIONS STATUSĄ
-- ==================================================
SELECT 
  r.id,
  r.title,
  r.status,
  r.meeting_id,
  mai.item_no
FROM resolutions r
LEFT JOIN meeting_agenda_items mai ON mai.resolution_id = r.id
WHERE r.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no NULLS LAST;

-- Expected: Resolutions su status='PROPOSED'

-- ==================================================
-- 4. PATIKRINTI AR YRA VOTES KITŲ SUSIRINKIMŲ
-- ==================================================
SELECT 
  v.meeting_id,
  m.title AS meeting_title,
  m.status AS meeting_status,
  COUNT(*) AS votes_count
FROM votes v
JOIN meetings m ON m.id = v.meeting_id
WHERE v.meeting_id IS NOT NULL
GROUP BY v.meeting_id, m.title, m.status
ORDER BY votes_count DESC
LIMIT 5;

-- Expected: Rodo ar yra votes kitiems susirinkimams

-- ==================================================
-- 5. PATIKRINTI AR ORG_ID TINKAMAS
-- ==================================================
SELECT 
  m.id AS meeting_id,
  m.org_id,
  o.name AS org_name,
  m.title AS meeting_title
FROM meetings m
JOIN orgs o ON o.id = m.org_id
WHERE m.id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- Expected: org_id egzistuoja ir tinkamas

