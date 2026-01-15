-- ==================================================
-- FIX: Sukurti trūkstamas resolutions ir votes
-- ==================================================
-- Procedūriniai klausimai buvo sukurti rankiniu būdu be resolutions
-- ==================================================

-- MEETING_ID: 4baafb4e-4c76-4317-8bf9-f4c10e011766
-- ORG_ID: 5865535b-494c-461c-89c5-2463c08cdeae

-- ==================================================
-- 1. SUKURTI RESOLUTIONS visiems agenda items
-- ==================================================

-- Resolution #1 (Susirinkimo pirmininko rinkimai)
INSERT INTO resolutions (org_id, title, content, status, meeting_id)
SELECT 
  '5865535b-494c-461c-89c5-2463c08cdeae'::uuid,
  mai.title,
  'NUTARTA: Tvirtinti susirinkimo pirmininką.',
  'PROPOSED',
  mai.meeting_id
FROM meeting_agenda_items mai
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no = 1
  AND mai.resolution_id IS NULL;

-- Resolution #2 (Susirinkimo sekretorės rinkimai)
INSERT INTO resolutions (org_id, title, content, status, meeting_id)
SELECT 
  '5865535b-494c-461c-89c5-2463c08cdeae'::uuid,
  mai.title,
  'NUTARTA: Tvirtinti susirinkimo sekretorių.',
  'PROPOSED',
  mai.meeting_id
FROM meeting_agenda_items mai
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no = 2
  AND mai.resolution_id IS NULL;

-- Resolution #3 (Darbotvarkės patvirtinimas)
INSERT INTO resolutions (org_id, title, content, status, meeting_id)
SELECT 
  '5865535b-494c-461c-89c5-2463c08cdeae'::uuid,
  mai.title,
  'NUTARTA: Patvirtinti susirinkimo darbotvarkę.',
  'PROPOSED',
  mai.meeting_id
FROM meeting_agenda_items mai
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no = 3
  AND mai.resolution_id IS NULL;

-- ==================================================
-- 2. SUSIETI RESOLUTIONS SU AGENDA ITEMS
-- ==================================================

-- Link resolution to item #1
UPDATE meeting_agenda_items mai
SET resolution_id = r.id
FROM resolutions r
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no = 1
  AND r.meeting_id = mai.meeting_id
  AND r.title = mai.title
  AND mai.resolution_id IS NULL;

-- Link resolution to item #2
UPDATE meeting_agenda_items mai
SET resolution_id = r.id
FROM resolutions r
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no = 2
  AND r.meeting_id = mai.meeting_id
  AND r.title = mai.title
  AND mai.resolution_id IS NULL;

-- Link resolution to item #3
UPDATE meeting_agenda_items mai
SET resolution_id = r.id
FROM resolutions r
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND mai.item_no = 3
  AND r.meeting_id = mai.meeting_id
  AND r.title = mai.title
  AND mai.resolution_id IS NULL;

-- ==================================================
-- 3. PATIKRINTI AR RESOLUTIONS SUSIETOS
-- ==================================================
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id,
  r.id AS resolution_id_check,
  r.status AS resolution_status,
  CASE 
    WHEN mai.resolution_id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ NOT linked'
  END AS link_status
FROM meeting_agenda_items mai
LEFT JOIN resolutions r ON r.id = mai.resolution_id
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no;

-- ==================================================
-- 4. SUKURTI VOTES (GA tipo)
-- ==================================================
INSERT INTO votes (org_id, resolution_id, meeting_id, kind, status, opens_at)
SELECT 
  r.org_id,
  mai.resolution_id,
  mai.meeting_id,
  'GA'::vote_kind,
  'OPEN',
  NOW()
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

-- ==================================================
-- 5. PATIKRINTI VOTES
-- ==================================================
SELECT 
  v.id AS vote_id,
  v.kind,
  v.status,
  v.opens_at,
  mai.item_no,
  mai.title,
  CASE 
    WHEN v.status = 'OPEN' THEN '✅ Vote Ready'
    ELSE '⚠️ Check status'
  END AS vote_status
FROM votes v
LEFT JOIN resolutions r ON r.id = v.resolution_id
LEFT JOIN meeting_agenda_items mai ON mai.resolution_id = r.id
WHERE v.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no NULLS LAST;

-- Expected: 3 votes (kind='GA', status='OPEN') - po vieną kiekvienam klausimui

