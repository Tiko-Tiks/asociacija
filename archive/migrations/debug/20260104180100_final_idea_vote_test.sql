DO $$
DECLARE
  v_owner_id uuid;
  v_idea_vote_id uuid := 'dbb56d1c-dd1f-4b72-9db5-87907f3c1e83'; -- Correct vote ID
  rec RECORD;
BEGIN
  SELECT id INTO v_owner_id FROM profiles WHERE email = 'owner1@test.lt';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 TESTING can_cast_idea_vote FOR owner1@test.lt';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
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
    RAISE NOTICE '';
    RAISE NOTICE '🎉 IDEA VOTING IS FIXED!';
  ELSE
    RAISE NOTICE '❌ FAILED! Owner1 CANNOT vote on idea';
    RAISE NOTICE '   Reason: %', rec.reason;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

