-- ============================================
-- FIX LATEST PUBLISHED MEETING
-- ============================================

DO $$
DECLARE
  v_meeting_id uuid;
  v_org_id uuid;
  v_item RECORD;
  v_resolution_id uuid;
  v_vote_id uuid;
BEGIN
  -- Get the LATEST published meeting
  SELECT id, org_id INTO v_meeting_id, v_org_id
  FROM meetings
  WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae'
  AND status = 'PUBLISHED'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_meeting_id IS NULL THEN
    RAISE NOTICE 'No published meeting found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Processing meeting: % (org: %)', v_meeting_id, v_org_id;
  
  -- Process each agenda item
  FOR v_item IN 
    SELECT id, item_no, title, details, resolution_id
    FROM meeting_agenda_items
    WHERE meeting_id = v_meeting_id
    ORDER BY item_no
  LOOP
    RAISE NOTICE 'Item #%: % (resolution: %)', v_item.item_no, v_item.title, COALESCE(v_item.resolution_id::text, 'NULL');
    
    v_resolution_id := v_item.resolution_id;
    
    -- Create resolution if missing
    IF v_resolution_id IS NULL THEN
      INSERT INTO resolutions (org_id, title, content, status, meeting_id)
      VALUES (
        v_org_id,
        v_item.item_no || '. ' || v_item.title,
        COALESCE(v_item.details, 'Klausimas #' || v_item.item_no),
        'PROPOSED',
        v_meeting_id
      )
      RETURNING id INTO v_resolution_id;
      
      UPDATE meeting_agenda_items
      SET resolution_id = v_resolution_id
      WHERE id = v_item.id;
      
      RAISE NOTICE '  ✓ Created resolution: %', v_resolution_id;
    ELSE
      RAISE NOTICE '  ✓ Resolution exists: %', v_resolution_id;
    END IF;
    
    -- Create vote if missing
    SELECT id INTO v_vote_id
    FROM votes
    WHERE meeting_id = v_meeting_id
    AND resolution_id = v_resolution_id
    AND kind = 'GA';
    
    IF v_vote_id IS NULL THEN
      INSERT INTO votes (org_id, resolution_id, meeting_id, kind, status, opens_at)
      VALUES (v_org_id, v_resolution_id, v_meeting_id, 'GA', 'OPEN', NOW())
      RETURNING id INTO v_vote_id;
      
      RAISE NOTICE '  ✓ Created vote: %', v_vote_id;
    ELSE
      RAISE NOTICE '  ✓ Vote exists: %', v_vote_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Done! All agenda items have resolutions and votes.';
END $$;

-- Verify
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id IS NOT NULL as has_resolution,
  v.id IS NOT NULL as has_vote
FROM meeting_agenda_items mai
LEFT JOIN votes v ON v.resolution_id = mai.resolution_id AND v.meeting_id = mai.meeting_id
WHERE mai.meeting_id IN (
  SELECT id FROM meetings 
  WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae' 
  AND status = 'PUBLISHED'
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY mai.item_no;

