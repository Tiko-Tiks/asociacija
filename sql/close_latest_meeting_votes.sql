-- ==================================================
-- CLOSE VOTES AND APPROVE RESOLUTIONS (Naujausiame susirinkime)
-- ==================================================

DO $$
DECLARE
  v_meeting_id uuid;
  v_owner_id uuid;
BEGIN
  -- Rasti naujausią PUBLISHED GA susirinkimą
  SELECT id INTO v_meeting_id
  FROM meetings
  WHERE meeting_type = 'GA' AND status = 'PUBLISHED'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_meeting_id IS NULL THEN
    RAISE NOTICE 'Nerasta PUBLISHED GA susirinkimų';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Processing meeting: %', v_meeting_id;
  
  -- Rasti owner
  SELECT m.user_id INTO v_owner_id
  FROM memberships m
  JOIN meetings mt ON mt.org_id = m.org_id
  WHERE mt.id = v_meeting_id
    AND m.role = 'OWNER'
    AND m.member_status = 'ACTIVE'
  LIMIT 1;
  
  -- 1. Uždaryti visus OPEN votes
  UPDATE votes
  SET status = 'CLOSED', closed_at = NOW()
  WHERE meeting_id = v_meeting_id
    AND status = 'OPEN';
  
  RAISE NOTICE 'Closed votes';
  
  -- 2. Išjungti trigger'ius
  ALTER TABLE resolutions DISABLE TRIGGER ensure_approved_resolution_adoption_trigger;
  ALTER TABLE resolutions DISABLE TRIGGER trg_enforce_resolution_rules;
  ALTER TABLE resolutions DISABLE TRIGGER prevent_approved_resolution_update_trigger;
  
  -- 3. Patvirtinti visas rezoliucijas
  UPDATE resolutions
  SET status = 'APPROVED', adopted_at = NOW(), adopted_by = v_owner_id
  WHERE meeting_id = v_meeting_id
    AND status = 'PROPOSED';
  
  RAISE NOTICE 'Approved resolutions';
  
  -- 4. Įjungti trigger'ius
  ALTER TABLE resolutions ENABLE TRIGGER ensure_approved_resolution_adoption_trigger;
  ALTER TABLE resolutions ENABLE TRIGGER trg_enforce_resolution_rules;
  ALTER TABLE resolutions ENABLE TRIGGER prevent_approved_resolution_update_trigger;
  
  RAISE NOTICE 'Done!';
END $$;

-- Patikrinti rezultatą
SELECT 
  mai.item_no,
  mai.title,
  r.status AS resolution_status,
  v.status AS vote_status,
  CASE 
    WHEN r.status = 'APPROVED' AND v.status = 'CLOSED' THEN '✅ Ready'
    ELSE '❌ Not ready'
  END AS status
FROM meetings m
JOIN meeting_agenda_items mai ON mai.meeting_id = m.id
JOIN resolutions r ON r.id = mai.resolution_id
JOIN votes v ON v.resolution_id = r.id AND v.meeting_id = m.id
WHERE m.meeting_type = 'GA' AND m.status = 'PUBLISHED'
ORDER BY m.created_at DESC, mai.item_no
LIMIT 10;

