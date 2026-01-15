-- ==================================================
-- FIX: Sukurti resolutions ir votes NAUJAM susirinkimui
-- ==================================================
-- MEETING_ID: e1871cb7-bb1c-43aa-a2e0-9193333ae1d8
-- ==================================================

-- 1. Gauti org_id
SELECT org_id FROM meetings WHERE id = 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8'::uuid;

-- 2. Sukurti resolutions visiems items be resolution_id
DO $$
DECLARE
  v_org_id uuid;
  v_meeting_id uuid := 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8';
  v_item record;
  v_resolution_id uuid;
BEGIN
  -- Get org_id
  SELECT org_id INTO v_org_id FROM meetings WHERE id = v_meeting_id;
  
  RAISE NOTICE 'Processing meeting % for org %', v_meeting_id, v_org_id;
  
  -- Loop through all agenda items without resolution_id
  FOR v_item IN 
    SELECT id, item_no, title 
    FROM meeting_agenda_items 
    WHERE meeting_id = v_meeting_id 
      AND resolution_id IS NULL
    ORDER BY item_no
  LOOP
    -- Create resolution
    INSERT INTO resolutions (org_id, title, content, status, meeting_id)
    VALUES (v_org_id, v_item.title, 'NUTARTA: Tvirtinti.', 'PROPOSED', v_meeting_id)
    RETURNING id INTO v_resolution_id;
    
    -- Link resolution to agenda item
    UPDATE meeting_agenda_items 
    SET resolution_id = v_resolution_id
    WHERE id = v_item.id;
    
    -- Create GA vote
    INSERT INTO votes (org_id, resolution_id, meeting_id, kind, status, opens_at)
    VALUES (v_org_id, v_resolution_id, v_meeting_id, 'GA', 'OPEN', NOW());
    
    RAISE NOTICE 'Created resolution and vote for item #% (%)', v_item.item_no, v_item.title;
  END LOOP;
END $$;

-- 3. Patikrinti rezultatą
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id,
  v.id AS vote_id,
  v.status AS vote_status,
  CASE 
    WHEN mai.resolution_id IS NOT NULL AND v.id IS NOT NULL THEN '✅ Ready'
    ELSE '❌ Missing'
  END AS status
FROM meeting_agenda_items mai
LEFT JOIN votes v ON v.resolution_id = mai.resolution_id AND v.meeting_id = mai.meeting_id
WHERE mai.meeting_id = 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8'::uuid
ORDER BY mai.item_no;

