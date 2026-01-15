DO $$
DECLARE
  v_owner_id uuid;
  v_vote_id uuid := '680589fb-d1e3-4709-9163-ba0bd69a34bd'; -- From earlier diagnosis
  rec RECORD;
BEGIN
  SELECT id INTO v_owner_id FROM profiles WHERE email = 'owner1@test.lt';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 TESTING can_cast_vote FOR owner1@test.lt';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Vote ID: %', v_vote_id;
  RAISE NOTICE 'User ID: %', v_owner_id;
  RAISE NOTICE '';
  
  -- Test function
  SELECT * INTO rec FROM can_cast_vote(v_vote_id, v_owner_id); -- Use default channel
  
  RAISE NOTICE 'RESULT:';
  RAISE NOTICE '  Allowed: %', rec.allowed;
  RAISE NOTICE '  Reason: %', rec.reason;
  RAISE NOTICE '  Details: %', rec.details;
  RAISE NOTICE '';
  
  IF rec.allowed THEN
    RAISE NOTICE '✅ SUCCESS! Owner1 CAN vote!';
  ELSE
    RAISE NOTICE '❌ FAILED! Owner1 CANNOT vote';
    RAISE NOTICE '   Reason: %', rec.reason;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

