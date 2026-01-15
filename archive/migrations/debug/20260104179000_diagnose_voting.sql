-- Diagnose why owner1 can't vote
DO $$
DECLARE
  v_owner_id uuid;
  v_org_id uuid := '5865535b-494c-461c-89c5-2463c08cdeae'; -- Mano Bendruomenė
  rec RECORD;
BEGIN
  -- Get owner1 user ID
  SELECT id INTO v_owner_id FROM profiles WHERE email = 'owner1@test.lt';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSING VOTING ISSUE FOR owner1@test.lt';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'User ID: %', v_owner_id;
  RAISE NOTICE 'Org ID: %', v_org_id;
  RAISE NOTICE '';
  
  -- Check 1: Membership status
  RAISE NOTICE '1️⃣ MEMBERSHIP CHECK:';
  SELECT role, member_status, status INTO rec
  FROM memberships
  WHERE user_id = v_owner_id AND org_id = v_org_id;
  
  IF FOUND THEN
    RAISE NOTICE '   ✅ Membership exists';
    RAISE NOTICE '   Role: %', rec.role;
    RAISE NOTICE '   Member Status: %', rec.member_status;
    RAISE NOTICE '   Status: %', rec.status;
  ELSE
    RAISE NOTICE '   ❌ No membership found!';
  END IF;
  
  RAISE NOTICE '';
  
  -- Check 2: Organization status
  RAISE NOTICE '2️⃣ ORGANIZATION CHECK:';
  SELECT status INTO rec FROM orgs WHERE id = v_org_id;
  RAISE NOTICE '   Org Status: %', rec.status;
  
  RAISE NOTICE '';
  
  -- Check 3: Governance config
  RAISE NOTICE '3️⃣ GOVERNANCE CONFIG CHECK:';
  SELECT 
    answers->>'track_fees' as track_fees,
    answers->>'restrict_debtors' as restrict_debtors,
    answers->>'one_member_one_vote' as one_member_one_vote
  INTO rec
  FROM governance_configs
  WHERE org_id = v_org_id;
  
  IF FOUND THEN
    RAISE NOTICE '   track_fees: %', rec.track_fees;
    RAISE NOTICE '   restrict_debtors: %', rec.restrict_debtors;
    RAISE NOTICE '   one_member_one_vote: %', rec.one_member_one_vote;
  ELSE
    RAISE NOTICE '   ❌ No governance config found!';
  END IF;
  
  RAISE NOTICE '';
  
  -- Check 4: Governance validation errors
  RAISE NOTICE '4️⃣ GOVERNANCE VALIDATION:';
  SELECT COUNT(*) INTO rec
  FROM governance_config_validation
  WHERE org_id = v_org_id AND severity = 'error';
  
  RAISE NOTICE '   Validation errors: %', rec.count;
  
  IF rec.count > 0 THEN
    RAISE NOTICE '   ⚠️ Errors found:';
    FOR rec IN
      SELECT field_name, message
      FROM governance_config_validation
      WHERE org_id = v_org_id AND severity = 'error'
      LIMIT 5
    LOOP
      RAISE NOTICE '      • %: %', rec.field_name, rec.message;
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
  
  -- Check 5: Active votes
  RAISE NOTICE '5️⃣ ACTIVE VOTES CHECK:';
  SELECT COUNT(*) INTO rec
  FROM votes
  WHERE org_id = v_org_id
    AND status = 'OPEN'
    AND opens_at <= NOW()
    AND closes_at > NOW();
  
  RAISE NOTICE '   Active votes: %', rec.count;
  
  IF rec.count > 0 THEN
    FOR rec IN
      SELECT id, title, type, status, opens_at, closes_at
      FROM votes
      WHERE org_id = v_org_id
        AND status = 'OPEN'
        AND opens_at <= NOW()
        AND closes_at > NOW()
      LIMIT 3
    LOOP
      RAISE NOTICE '      Vote: % (%, %)', rec.title, rec.type, rec.id;
      RAISE NOTICE '         Opens: %, Closes: %', rec.opens_at, rec.closes_at;
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

