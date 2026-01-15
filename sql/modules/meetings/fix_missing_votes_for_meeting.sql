-- ============================================
-- FIX MISSING VOTES FOR EXISTING MEETING
-- ============================================
-- 
-- Run this in Supabase SQL Editor to create 
-- missing resolutions and votes for already
-- published meetings
--
-- ============================================

DO $$
DECLARE
  v_meeting_id uuid;
  v_org_id uuid;
  v_item RECORD;
  v_resolution_id uuid;
  v_vote_id uuid;
  v_early_voting_days int;
  v_opens_at timestamp with time zone;
BEGIN
  -- Find the meeting "Visuotinis susirinkimas"
  SELECT id, org_id INTO v_meeting_id, v_org_id
  FROM meetings
  WHERE title ILIKE '%Visuotinis%'
  AND status = 'PUBLISHED'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_meeting_id IS NULL THEN
    RAISE NOTICE 'No published meeting found matching "Visuotinis"';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found meeting: % (org: %)', v_meeting_id, v_org_id;
  
  -- Get early voting days
  SELECT COALESCE(
    (SELECT (answers->>'early_voting_days')::int 
     FROM governance_configs 
     WHERE org_id = v_org_id 
     AND status = 'ACTIVE'
     LIMIT 1), 
    0
  ) INTO v_early_voting_days;
  
  RAISE NOTICE 'Early voting days: %', v_early_voting_days;
  
  -- Iterate through agenda items
  FOR v_item IN 
    SELECT mai.id, mai.item_no, mai.title, mai.details, mai.resolution_id
    FROM meeting_agenda_items mai
    WHERE mai.meeting_id = v_meeting_id
    ORDER BY mai.item_no
  LOOP
    RAISE NOTICE 'Processing agenda item #%: % (resolution: %)', 
      v_item.item_no, v_item.title, COALESCE(v_item.resolution_id::text, 'NULL');
    
    v_resolution_id := v_item.resolution_id;
    
    -- Create resolution if not exists
    IF v_resolution_id IS NULL THEN
      INSERT INTO resolutions (org_id, title, body, status, meeting_id)
      VALUES (
        v_org_id,
        v_item.item_no || '. ' || v_item.title,
        COALESCE(v_item.details, 'Darbotvarkės klausimas #' || v_item.item_no || ': ' || v_item.title),
        'PROPOSED',
        v_meeting_id
      )
      RETURNING id INTO v_resolution_id;
      
      -- Link resolution to agenda item
      UPDATE meeting_agenda_items
      SET resolution_id = v_resolution_id
      WHERE id = v_item.id;
      
      RAISE NOTICE '  Created resolution: %', v_resolution_id;
    ELSE
      RAISE NOTICE '  Resolution already exists: %', v_resolution_id;
    END IF;
    
    -- Check if vote exists
    SELECT id INTO v_vote_id
    FROM votes
    WHERE meeting_id = v_meeting_id
    AND resolution_id = v_resolution_id
    AND kind = 'GA'
    LIMIT 1;
    
    IF v_vote_id IS NULL THEN
      -- Calculate opens_at
      SELECT 
        CASE 
          WHEN v_early_voting_days > 0 THEN 
            m.scheduled_at - (v_early_voting_days || ' days')::interval
          ELSE 
            NOW()
        END
      INTO v_opens_at
      FROM meetings m
      WHERE m.id = v_meeting_id;
      
      -- Create vote
      INSERT INTO votes (
        org_id, 
        resolution_id, 
        meeting_id, 
        kind, 
        status,
        opens_at,
        channel
      )
      VALUES (
        v_org_id,
        v_resolution_id,
        v_meeting_id,
        'GA',
        'OPEN',
        v_opens_at,
        'REMOTE'
      )
      RETURNING id INTO v_vote_id;
      
      RAISE NOTICE '  Created vote: % (opens_at: %)', v_vote_id, v_opens_at;
    ELSE
      RAISE NOTICE '  Vote already exists: %', v_vote_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Done!';
END $$;

-- Verify results
SELECT 
  mai.item_no,
  mai.title,
  mai.resolution_id,
  r.title as resolution_title,
  v.id as vote_id,
  v.status as vote_status,
  v.opens_at
FROM meeting_agenda_items mai
LEFT JOIN resolutions r ON r.id = mai.resolution_id
LEFT JOIN votes v ON v.resolution_id = mai.resolution_id AND v.meeting_id = mai.meeting_id
WHERE mai.meeting_id IN (
  SELECT id FROM meetings 
  WHERE title ILIKE '%Visuotinis%' 
  AND status = 'PUBLISHED'
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY mai.item_no;

