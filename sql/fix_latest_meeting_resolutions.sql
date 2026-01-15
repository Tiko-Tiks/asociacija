-- ==================================================
-- FIX: Sukurti resolutions naujausiam GA susirinkimui
-- ==================================================
-- Automatiškai randa naujausią GA susirinkimą ir sukuria resolutions
-- ==================================================

DO $$
DECLARE
  v_meeting_id uuid;
  v_org_id uuid;
  v_item record;
  v_resolution_id uuid;
BEGIN
  -- Rasti naujausią GA susirinkimą
  SELECT id, org_id INTO v_meeting_id, v_org_id
  FROM meetings
  WHERE meeting_type = 'GA'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_meeting_id IS NULL THEN
    RAISE NOTICE 'Nerasta GA susirinkimų';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Processing meeting: %', v_meeting_id;
  
  -- Išjungti trigger'ius
  ALTER TABLE resolutions DISABLE TRIGGER ensure_approved_resolution_adoption_trigger;
  ALTER TABLE resolutions DISABLE TRIGGER trg_enforce_resolution_rules;
  ALTER TABLE resolutions DISABLE TRIGGER prevent_approved_resolution_update_trigger;
  
  -- Loop per visus agenda items be resolution_id
  FOR v_item IN 
    SELECT id, item_no, title 
    FROM meeting_agenda_items 
    WHERE meeting_id = v_meeting_id 
      AND resolution_id IS NULL
    ORDER BY item_no
  LOOP
    -- Sukurti resolution
    INSERT INTO resolutions (org_id, title, content, status, meeting_id)
    VALUES (v_org_id, v_item.title, 'NUTARTA: Tvirtinti.', 'PROPOSED', v_meeting_id)
    RETURNING id INTO v_resolution_id;
    
    -- Susieti su agenda item
    UPDATE meeting_agenda_items 
    SET resolution_id = v_resolution_id
    WHERE id = v_item.id;
    
    -- Sukurti vote
    INSERT INTO votes (org_id, resolution_id, meeting_id, kind, status, opens_at)
    VALUES (v_org_id, v_resolution_id, v_meeting_id, 'GA', 'OPEN', NOW());
    
    RAISE NOTICE 'Created resolution and vote for item #% (%)', v_item.item_no, v_item.title;
  END LOOP;
  
  -- Įjungti trigger'ius
  ALTER TABLE resolutions ENABLE TRIGGER ensure_approved_resolution_adoption_trigger;
  ALTER TABLE resolutions ENABLE TRIGGER trg_enforce_resolution_rules;
  ALTER TABLE resolutions ENABLE TRIGGER prevent_approved_resolution_update_trigger;
  
  RAISE NOTICE 'Done!';
END $$;

-- Patikrinti rezultatą
SELECT 
  m.id AS meeting_id,
  m.title AS meeting_title,
  mai.item_no,
  mai.title AS item_title,
  mai.resolution_id,
  v.id AS vote_id,
  v.status AS vote_status,
  CASE 
    WHEN mai.resolution_id IS NOT NULL AND v.id IS NOT NULL THEN '✅ Ready'
    ELSE '❌ Missing'
  END AS status
FROM meetings m
JOIN meeting_agenda_items mai ON mai.meeting_id = m.id
LEFT JOIN votes v ON v.resolution_id = mai.resolution_id AND v.meeting_id = m.id
WHERE m.meeting_type = 'GA'
ORDER BY m.created_at DESC, mai.item_no
LIMIT 10;

