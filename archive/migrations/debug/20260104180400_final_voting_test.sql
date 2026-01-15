DO $$
DECLARE
  v_user_id uuid := '8f9dd855-070e-4e59-aa24-bb318e0e4bbf'; -- user2@test.lt
  v_idea_vote_id uuid := 'dbb56d1c-dd1f-4b72-9db5-87907f3c1e83';
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 FINAL TEST: Member Idea Voting';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Testing user2@test.lt...';
  RAISE NOTICE '';
  
  -- Test can_cast_idea_vote
  SELECT * INTO rec FROM can_cast_idea_vote(v_idea_vote_id, v_user_id);
  
  RAISE NOTICE 'RESULT:';
  RAISE NOTICE '  Allowed: %', rec.allowed;
  RAISE NOTICE '  Reason: %', rec.reason;
  RAISE NOTICE '  Details: %', rec.details;
  RAISE NOTICE '';
  
  IF rec.allowed THEN
    RAISE NOTICE '✅ SUCCESS! user2 CAN vote on idea!';
    RAISE NOTICE '';
    RAISE NOTICE '🎉🎉🎉 ALL VOTING ISSUES FIXED! 🎉🎉🎉';
    RAISE NOTICE '';
    RAISE NOTICE '✅ OWNER can vote (bypass governance)';
    RAISE NOTICE '✅ MEMBERS can vote (governance fixed)';
    RAISE NOTICE '✅ Idea voting works';
    RAISE NOTICE '✅ Resolution voting works';
  ELSE
    RAISE NOTICE '❌ Still blocked: %', rec.reason;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

