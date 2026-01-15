-- ==================================================
-- CLEANUP: Delete TEST meetings safely
-- ==================================================

-- First, let's see what we're about to delete
SELECT id, title, status, scheduled_at, created_at
FROM meetings 
WHERE title ILIKE 'TEST:%'
ORDER BY created_at DESC;

-- Delete related data for TEST meetings
DO $$
DECLARE
  v_meeting record;
  v_deleted_count integer := 0;
BEGIN
  -- Loop through all TEST meetings
  FOR v_meeting IN 
    SELECT id, title FROM meetings WHERE title ILIKE 'TEST:%'
  LOOP
    -- Delete meeting attendees
    DELETE FROM meeting_attendees WHERE meeting_id = v_meeting.id;
    
    -- Delete meeting agenda items
    DELETE FROM meeting_agenda_items WHERE meeting_id = v_meeting.id;
    
    -- Delete meeting protocols
    DELETE FROM meeting_protocols WHERE meeting_id = v_meeting.id;
    
    -- Delete votes and ballots for resolutions linked to this meeting
    DELETE FROM vote_ballots WHERE vote_id IN (
      SELECT v.id FROM votes v
      JOIN resolutions r ON v.resolution_id = r.id
      WHERE r.meeting_id = v_meeting.id
    );
    
    DELETE FROM votes WHERE resolution_id IN (
      SELECT id FROM resolutions WHERE meeting_id = v_meeting.id
    );
    
    -- Delete resolutions (need to disable trigger temporarily for APPROVED ones)
    DELETE FROM resolutions WHERE meeting_id = v_meeting.id;
    
    -- Delete the meeting itself
    DELETE FROM meetings WHERE id = v_meeting.id;
    
    v_deleted_count := v_deleted_count + 1;
    RAISE NOTICE 'Deleted: % (ID: %)', v_meeting.title, v_meeting.id;
  END LOOP;
  
  RAISE NOTICE 'Total deleted: % TEST meetings', v_deleted_count;
END $$;

-- Verify deletion
SELECT COUNT(*) as remaining_test_meetings 
FROM meetings 
WHERE title ILIKE 'TEST:%';
