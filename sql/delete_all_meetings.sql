-- ==================================================
-- CLEANUP: Delete ALL meetings safely
-- ==================================================
-- WARNING: This will permanently delete ALL meetings and related data!
-- This includes:
-- - All meeting attendance records
-- - All meeting agenda items
-- - All meeting protocols
-- - All resolutions linked to meetings
-- - All votes and vote ballots for those resolutions
-- ==================================================

-- First, let's see what we're about to delete
SELECT 
  COUNT(*) as total_meetings,
  COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_meetings,
  COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END) as published_meetings,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_meetings
FROM meetings;

-- Show list of meetings to be deleted
SELECT id, title, status, scheduled_at, created_at, org_id
FROM meetings 
ORDER BY created_at DESC;

-- Delete related data for ALL meetings
DO $$
DECLARE
  v_meeting record;
  v_deleted_count integer := 0;
  v_total_attendance integer := 0;
  v_total_agenda_items integer := 0;
  v_total_protocols integer := 0;
  v_total_resolutions integer := 0;
  v_total_votes integer := 0;
  v_total_ballots integer := 0;
  v_count integer;
BEGIN
  -- Loop through all meetings
  FOR v_meeting IN 
    SELECT id, title FROM meetings ORDER BY created_at DESC
  LOOP
    -- Delete vote ballots for resolutions linked to this meeting
    DELETE FROM vote_ballots WHERE vote_id IN (
      SELECT v.id FROM votes v
      JOIN resolutions r ON v.resolution_id = r.id
      WHERE r.meeting_id = v_meeting.id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_ballots := v_total_ballots + v_count;
    
    -- Delete votes for resolutions linked to this meeting
    DELETE FROM votes WHERE resolution_id IN (
      SELECT id FROM resolutions WHERE meeting_id = v_meeting.id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_votes := v_total_votes + v_count;
    
    -- Delete resolutions linked to this meeting
    DELETE FROM resolutions WHERE meeting_id = v_meeting.id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_resolutions := v_total_resolutions + v_count;
    
    -- Delete meeting attendance
    DELETE FROM meeting_attendance WHERE meeting_id = v_meeting.id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_attendance := v_total_attendance + v_count;
    
    -- Delete meeting agenda items
    DELETE FROM meeting_agenda_items WHERE meeting_id = v_meeting.id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_agenda_items := v_total_agenda_items + v_count;
    
    -- Delete meeting protocols
    DELETE FROM meeting_protocols WHERE meeting_id = v_meeting.id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_protocols := v_total_protocols + v_count;
    
    -- Delete the meeting itself
    DELETE FROM meetings WHERE id = v_meeting.id;
    
    v_deleted_count := v_deleted_count + 1;
    RAISE NOTICE 'Deleted: % (ID: %)', v_meeting.title, v_meeting.id;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total deleted: % meetings', v_deleted_count;
  RAISE NOTICE 'Related records deleted:';
  RAISE NOTICE '  - Meeting attendance: %', v_total_attendance;
  RAISE NOTICE '  - Agenda items: %', v_total_agenda_items;
  RAISE NOTICE '  - Protocols: %', v_total_protocols;
  RAISE NOTICE '  - Resolutions: %', v_total_resolutions;
  RAISE NOTICE '  - Votes: %', v_total_votes;
  RAISE NOTICE '  - Vote ballots: %', v_total_ballots;
  RAISE NOTICE '========================================';
END $$;

-- Verify deletion
SELECT COUNT(*) as remaining_meetings 
FROM meetings;

-- If count is 0, all meetings were successfully deleted
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'All meetings successfully deleted'
    ELSE 'WARNING: ' || COUNT(*) || ' meetings still remain'
  END as deletion_status
FROM meetings;

