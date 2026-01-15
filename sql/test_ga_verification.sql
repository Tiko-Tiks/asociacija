-- ==================================================
-- GA MODULIO TESTAVIMO PATIKRA
-- ==================================================
-- Patikrinti ar viskas veikia po publikavimo
-- ==================================================

-- PAKEISTI MEETING_ID pagal savo susirinkimo ID
-- meeting_id: '4baafb4e-4c76-4317-8bf9-f4c10e011766'
-- PAKEISTI UUID ŽEMIAU:

-- ==================================================
-- 1. PATIKRINTI SUSIRINKIMO STATUSĄ
-- ==================================================
SELECT 
  id,
  title,
  status,
  meeting_type,
  scheduled_at,
  published_at,
  created_at
FROM meetings
WHERE id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- ==================================================
-- 2. PATIKRINTI PROCEDŪRINIUS KLAUSIMUS (1-3)
-- ==================================================
SELECT 
  item_no,
  title,
  summary,
  resolution_id,
  created_at
FROM meeting_agenda_items
WHERE meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND item_no IN (1, 2, 3)
ORDER BY item_no;

-- Expected: 3 rows (1, 2, 3)

-- ==================================================
-- 3. PATIKRINTI GOVERNANCE SNAPSHOT
-- ==================================================
-- NOTE: metadata stulpelio nėra schema (Code Freeze)
-- Governance snapshot turėtų būti išsaugotas per RPC arba kitaip
-- Kol kas tikriname tik meeting scheduled_at (freeze_at = scheduled_at per GA HARD MODE)
SELECT 
  id,
  title,
  status,
  scheduled_at,
  published_at,
  'NOTE: Governance snapshot turėtų būti išsaugotas per RPC. freeze_at = scheduled_at per GA HARD MODE logika.' AS snapshot_note
FROM meetings
WHERE id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- Expected: governance_snapshot su freeze_at, quorum_percentage, etc.

-- ==================================================
-- 4. PATIKRINTI REZOLIUCIJAS PROCEDŪRINIAIS KLAUSIMAIS
-- ==================================================
SELECT 
  mai.item_no,
  mai.title AS agenda_title,
  r.id AS resolution_id,
  r.title AS resolution_title,
  r.status AS resolution_status,
  r.body AS resolution_body
FROM meeting_agenda_items mai
LEFT JOIN resolutions r ON r.id = mai.resolution_id
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no IN (1, 2, 3)
ORDER BY mai.item_no;

-- Expected: 3 resolutions (PROPOSED status)

-- ==================================================
-- 5. PATIKRINTI VOTES (BALSAVIMUS)
-- ==================================================
SELECT 
  v.id AS vote_id,
  v.kind,
  v.status,
  v.channel,
  v.meeting_id,
  v.resolution_id,
  mai.item_no,
  mai.title AS agenda_title,
  v.opens_at,
  v.closes_at
FROM votes v
LEFT JOIN resolutions r ON r.id = v.resolution_id
LEFT JOIN meeting_agenda_items mai ON mai.resolution_id = r.id
WHERE v.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no NULLS LAST;

-- Expected: Votes sukurti visiems items (1, 2, 3, ir custom items)

-- ==================================================
-- 6. PATIKRINTI VOTING STATISTICS
-- ==================================================
SELECT 
  COUNT(*) AS total_votes,
  COUNT(*) FILTER (WHERE kind = 'GA') AS ga_votes,
  COUNT(*) FILTER (WHERE status = 'OPEN') AS open_votes,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed_votes
FROM votes
WHERE meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- ==================================================
-- 7. PATIKRINTI AGENDA ITEMS (VISI)
-- ==================================================
SELECT 
  item_no,
  title,
  summary,
  resolution_id,
  CASE 
    WHEN item_no IN (1, 2, 3) THEN 'PROCEDURAL'
    ELSE 'SUBSTANTIVE'
  END AS item_type
FROM meeting_agenda_items
WHERE meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY item_no;

-- Expected: At least 3 procedural + custom items

