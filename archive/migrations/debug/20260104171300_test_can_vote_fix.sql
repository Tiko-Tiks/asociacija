-- Test can_vote with user3@test.lt in BOTH orgs

-- Get user ID
DO $$
DECLARE
  v_user_id uuid;
  v_org1_id uuid := '5865535b-494c-461c-89c5-2463c08cdeae'; -- Mano Bendruomenė (track_fees=yes)
  v_org2_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52'; -- Mano Bendrija (track_fees=no)
  rec RECORD;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE email = 'user3@test.lt';

  RAISE NOTICE '=== Testing can_vote for user3@test.lt ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE '';

  -- Test Org 1 (should fail - track_fees=yes)
  RAISE NOTICE '1️⃣  Mano Bendruomenė (track_fees=yes):';
  FOR rec IN SELECT * FROM can_vote(v_org1_id, v_user_id)
  LOOP
    RAISE NOTICE '   Allowed: %, Reason: %', rec.allowed, rec.reason;
    RAISE NOTICE '   Details: %', rec.details;
  END LOOP;

  RAISE NOTICE '';

  -- Test Org 2 (should succeed - track_fees=no)
  RAISE NOTICE '2️⃣  Mano Bendrija (track_fees=no):';
  FOR rec IN SELECT * FROM can_vote(v_org2_id, v_user_id)
  LOOP
    RAISE NOTICE '   Allowed: %, Reason: %', rec.allowed, rec.reason;
    RAISE NOTICE '   Details: %', rec.details;
  END LOOP;
END $$;

