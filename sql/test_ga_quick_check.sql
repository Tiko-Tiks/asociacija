-- ==================================================
-- GA MODULIO GREITA PATIKRA (Quick Check)
-- ==================================================
-- Patikrinti ar viskas veikia po publikavimo
-- ==================================================

-- PAKEISTI MEETING_ID pagal savo susirinkimo ID
-- meeting_id: '4baafb4e-4c76-4317-8bf9-f4c10e011766'

-- Supabase SQL Editor: Pašalinkite komentarus ir įdėkite tikrą meeting_id
-- ARBA tiesiog pakeiskite UUID žemiau


-- ==================================================
-- 1. SUSIRINKIMO STATUSAS
-- ==================================================
-- NOTE: metadata stulpelio nėra schema (Code Freeze)
-- Governance snapshot turėtų būti išsaugotas per RPC arba kitaip
-- Kol kas tikriname tik meeting status
SELECT 
  id,
  title,
  status,
  meeting_type,
  scheduled_at,
  published_at,
  CASE 
    WHEN status = 'PUBLISHED' THEN '✅ Published'
    ELSE '⚠️ ' || status
  END AS status_check
FROM meetings
WHERE id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- ==================================================
-- 2. PROCEDŪRINIAI KLAUSIMAI (1-3)
-- ==================================================
SELECT 
  item_no,
  title,
  CASE 
    WHEN resolution_id IS NOT NULL THEN '✅ Resolution'
    ELSE '❌ No resolution'
  END AS resolution_status
FROM meeting_agenda_items
WHERE meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND item_no IN (1, 2, 3)
ORDER BY item_no;

-- Expected: 3 rows with resolutions

-- ==================================================
-- 3. VOTES (BALSAVIMAI)
-- ==================================================
SELECT 
  v.id,
  v.kind,
  v.status,
  mai.item_no,
  mai.title AS agenda_title,
  CASE 
    WHEN v.kind = 'GA' AND v.status = 'OPEN' THEN '✅ GA Vote Ready'
    ELSE '⚠️ Check needed'
  END AS vote_status
FROM votes v
LEFT JOIN resolutions r ON r.id = v.resolution_id
LEFT JOIN meeting_agenda_items mai ON mai.resolution_id = r.id
WHERE v.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no NULLS LAST;

-- Expected: Votes su kind='GA', status='OPEN'

-- ==================================================
-- 4. GOVERNANCE SNAPSHOT DETAILS
-- ==================================================
-- NOTE: metadata stulpelio nėra schema (Code Freeze)
-- Governance snapshot turėtų būti išsaugotas per RPC arba kitaip
-- Kol kas tikriname tik meeting scheduled_at (freeze_at = scheduled_at)
SELECT 
  id,
  title,
  scheduled_at,
  published_at,
  CASE 
    WHEN scheduled_at IS NOT NULL THEN '✅ Scheduled (freeze_at = scheduled_at)'
    ELSE '❌ Not scheduled'
  END AS snapshot_note
FROM meetings
WHERE id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- Expected: scheduled_at išsaugotas (freeze_at = scheduled_at per GA HARD MODE logika)

-- ==================================================
-- 5. AGENDA ITEMS COUNT
-- ==================================================
SELECT 
  COUNT(*) FILTER (WHERE item_no IN (1, 2, 3)) AS procedural_items,
  COUNT(*) FILTER (WHERE item_no > 3) AS substantive_items,
  COUNT(*) AS total_items
FROM meeting_agenda_items
WHERE meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- Expected: procedural_items = 3, substantive_items >= 0, total_items >= 3

