-- ============================================
-- AUTO-ABSTAIN FOR REMOTE VOTERS
-- ============================================
-- 
-- Function to automatically register ABSTAIN votes
-- for members who registered remote intent but didn't vote
-- 
-- Called when meeting is completed/closed
-- ============================================

CREATE OR REPLACE FUNCTION auto_abstain_for_remote_voters(
  p_meeting_id uuid
)
RETURNS TABLE(
  ok boolean,
  abstain_count int,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_remote_voter RECORD;
  v_vote RECORD;
  v_abstain_count int := 0;
  v_existing_ballot uuid;
BEGIN
  -- Get meeting org_id
  SELECT org_id INTO v_org_id
  FROM meetings
  WHERE id = p_meeting_id;
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Meeting not found';
    RETURN;
  END IF;
  
  -- Get all remote voters for this meeting
  FOR v_remote_voter IN
    SELECT DISTINCT membership_id
    FROM meeting_remote_voters
    WHERE meeting_id = p_meeting_id
  LOOP
    -- Get all votes for this meeting
    FOR v_vote IN
      SELECT id
      FROM votes
      WHERE meeting_id = p_meeting_id
      AND kind = 'GA'
      AND status IN ('OPEN', 'CLOSED')
    LOOP
      -- Check if member already voted
      SELECT id INTO v_existing_ballot
      FROM vote_ballots
      WHERE vote_id = v_vote.id
      AND membership_id = v_remote_voter.membership_id
      LIMIT 1;
      
      -- If no ballot exists, create ABSTAIN
      IF v_existing_ballot IS NULL THEN
        INSERT INTO vote_ballots (
          vote_id,
          membership_id,
          choice,
          channel,
          cast_at
        )
        VALUES (
          v_vote.id,
          v_remote_voter.membership_id,
          'ABSTAIN',
          'REMOTE',
          NOW()
        );
        
        v_abstain_count := v_abstain_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT true, v_abstain_count, 'Auto-abstain completed';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION auto_abstain_for_remote_voters TO authenticated;

-- Test comment
COMMENT ON FUNCTION auto_abstain_for_remote_voters IS 
'Automatically registers ABSTAIN votes for remote voters who did not vote on all questions';

