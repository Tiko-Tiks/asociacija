DO $$
DECLARE
  v_owner_id uuid;
  v_idea_vote_id uuid := 'c6256542-b03d-4139-b959-02696e27a1bc'; -- From logs
  rec RECORD;
BEGIN
  SELECT id INTO v_owner_id FROM profiles WHERE email = 'owner1@test.lt';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 TESTING can_cast_idea_vote FOR owner1@test.lt';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Idea Vote ID: %', v_idea_vote_id;
  RAISE NOTICE 'User ID: %', v_owner_id;
  RAISE NOTICE '';
  
  -- Check if idea vote exists
  SELECT status, closes_at INTO rec FROM idea_votes WHERE id = v_idea_vote_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Idea vote found:';
    RAISE NOTICE '  Status: %', rec.status;
    RAISE NOTICE '  Closes at: %', rec.closes_at;
    RAISE NOTICE '  Current time: %', NOW();
    RAISE NOTICE '';
    
    -- Test function
    SELECT * INTO rec FROM can_cast_idea_vote(v_idea_vote_id, v_owner_id);
    
    RAISE NOTICE 'RESULT:';
    RAISE NOTICE '  Allowed: %', rec.allowed;
    RAISE NOTICE '  Reason: %', rec.reason;
    RAISE NOTICE '  Details: %', rec.details;
    RAISE NOTICE '';
    
    IF rec.allowed THEN
      RAISE NOTICE '✅ SUCCESS! Owner1 CAN vote on idea!';
    ELSE
      RAISE NOTICE '❌ FAILED! Owner1 CANNOT vote on idea';
      RAISE NOTICE '   Reason: %', rec.reason;
    END IF;
  ELSE
    RAISE NOTICE '❌ Idea vote not found!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

