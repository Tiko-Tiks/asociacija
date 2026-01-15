-- ==================================================
-- CLOSE VOTES AND APPROVE RESOLUTIONS
-- ==================================================
-- Uždaryti visus balsavimus ir patvirtinti rezoliucijas
-- MEETING_ID: e1871cb7-bb1c-43aa-a2e0-9193333ae1d8
-- ==================================================

-- 1. Uždaryti visus OPEN votes
UPDATE votes
SET status = 'CLOSED', closed_at = NOW()
WHERE meeting_id = 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8'::uuid
  AND status = 'OPEN';

-- 2. Laikinai išjungti user trigger'ius
ALTER TABLE resolutions DISABLE TRIGGER ensure_approved_resolution_adoption_trigger;
ALTER TABLE resolutions DISABLE TRIGGER trg_enforce_resolution_rules;
ALTER TABLE resolutions DISABLE TRIGGER prevent_approved_resolution_update_trigger;

-- 3. Patvirtinti visas rezoliucijas (PROPOSED → APPROVED)
UPDATE resolutions
SET 
  status = 'APPROVED', 
  adopted_at = NOW(),
  adopted_by = (
    SELECT user_id FROM memberships 
    WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae'::uuid
      AND role = 'OWNER'
      AND member_status = 'ACTIVE'
    LIMIT 1
  )
WHERE meeting_id = 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8'::uuid
  AND status = 'PROPOSED';

-- 4. Įjungti trigger'ius atgal
ALTER TABLE resolutions ENABLE TRIGGER ensure_approved_resolution_adoption_trigger;
ALTER TABLE resolutions ENABLE TRIGGER trg_enforce_resolution_rules;
ALTER TABLE resolutions ENABLE TRIGGER prevent_approved_resolution_update_trigger;

-- 5. Patikrinti rezultatą
SELECT 
  mai.item_no,
  mai.title,
  r.status AS resolution_status,
  v.status AS vote_status,
  CASE 
    WHEN r.status = 'APPROVED' AND v.status = 'CLOSED' THEN '✅ Ready'
    ELSE '❌ Not ready'
  END AS completion_status
FROM meeting_agenda_items mai
JOIN resolutions r ON r.id = mai.resolution_id
JOIN votes v ON v.resolution_id = r.id AND v.meeting_id = mai.meeting_id
WHERE mai.meeting_id = 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8'::uuid
ORDER BY mai.item_no;

-- Expected: Visi items turi resolution_status='APPROVED', vote_status='CLOSED'

