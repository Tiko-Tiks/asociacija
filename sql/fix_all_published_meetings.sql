-- ==================================================
-- FIX: Sukurti resolutions ir votes VISIEMS PUBLISHED GA susirinkimams
-- ==================================================
-- Vykdyti vieną kartą - sutvarko visus esamus susirinkimus
-- ==================================================

DO $$
DECLARE
  v_meeting record;
  v_item record;
  v_resolution_id uuid;
  v_fixed_count int := 0;
BEGIN
  -- Išjungti trigger'ius
  ALTER TABLE resolutions DISABLE TRIGGER ensure_approved_resolution_adoption_trigger;
  ALTER TABLE resolutions DISABLE TRIGGER trg_enforce_resolution_rules;
  ALTER TABLE resolutions DISABLE TRIGGER prevent_approved_resolution_update_trigger;
  
  -- Loop per visus PUBLISHED GA susirinkimus
  FOR v_meeting IN 
    SELECT id, org_id, title
    FROM meetings
    WHERE meeting_type = 'GA' 
      AND status = 'PUBLISHED'
  LOOP
    RAISE NOTICE 'Processing meeting: % (%)', v_meeting.title, v_meeting.id;
    
    -- Loop per visus agenda items be resolution_id
    FOR v_item IN 
      SELECT id, item_no, title 
      FROM meeting_agenda_items 
      WHERE meeting_id = v_meeting.id 
        AND resolution_id IS NULL
      ORDER BY item_no
    LOOP
      -- Sukurti resolution
      INSERT INTO resolutions (org_id, title, content, status, meeting_id)
      VALUES (v_meeting.org_id, v_item.title, 'NUTARTA: Tvirtinti.', 'PROPOSED', v_meeting.id)
      RETURNING id INTO v_resolution_id;
      
      -- Susieti su agenda item
      UPDATE meeting_agenda_items 
      SET resolution_id = v_resolution_id
      WHERE id = v_item.id;
      
      -- Sukurti vote (jei neegzistuoja)
      IF NOT EXISTS (
        SELECT 1 FROM votes 
        WHERE meeting_id = v_meeting.id 
          AND resolution_id = v_resolution_id
      ) THEN
        INSERT INTO votes (org_id, resolution_id, meeting_id, kind, status, opens_at)
        VALUES (v_meeting.org_id, v_resolution_id, v_meeting.id, 'GA', 'OPEN', NOW());
      END IF;
      
      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE '  Fixed item #% (%)', v_item.item_no, v_item.title;
    END LOOP;
  END LOOP;
  
  -- Įjungti trigger'ius
  ALTER TABLE resolutions ENABLE TRIGGER ensure_approved_resolution_adoption_trigger;
  ALTER TABLE resolutions ENABLE TRIGGER trg_enforce_resolution_rules;
  ALTER TABLE resolutions ENABLE TRIGGER prevent_approved_resolution_update_trigger;
  
  RAISE NOTICE 'Total fixed: % items', v_fixed_count;
END $$;

-- Patikrinti rezultatą
SELECT 
  m.title AS meeting,
  mai.item_no,
  mai.title AS item,
  mai.resolution_id,
  v.id AS vote_id,
  CASE 
    WHEN mai.resolution_id IS NOT NULL AND v.id IS NOT NULL THEN '✅'
    ELSE '❌'
  END AS status
FROM meetings m
JOIN meeting_agenda_items mai ON mai.meeting_id = m.id
LEFT JOIN votes v ON v.resolution_id = mai.resolution_id AND v.meeting_id = m.id
WHERE m.meeting_type = 'GA' AND m.status = 'PUBLISHED'
ORDER BY m.created_at DESC, mai.item_no
LIMIT 20;

