DO $$
DECLARE
  v_membership_id uuid := '36257e97-1f10-4351-9064-29b96c41df7a';
  v_idea_vote_id uuid := 'dbb56d1c-dd1f-4b72-9db5-87907f3c1e83';
  v_user_id uuid;
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSING MEMBER VOTING ISSUE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Get user from membership
  SELECT user_id, role, member_status INTO rec
  FROM memberships
  WHERE id = v_membership_id;
  
  IF FOUND THEN
    v_user_id := rec.user_id;
    
    RAISE NOTICE 'Membership found:';
    RAISE NOTICE '  Membership ID: %', v_membership_id;
    RAISE NOTICE '  User ID: %', v_user_id;
    RAISE NOTICE '  Role: %', rec.role;
    RAISE NOTICE '  Status: %', rec.member_status;
    RAISE NOTICE '';
    
    -- Get user email
    SELECT email INTO rec FROM profiles WHERE id = v_user_id;
    RAISE NOTICE '  Email: %', rec.email;
    RAISE NOTICE '';
    
    -- Test can_cast_idea_vote
    RAISE NOTICE 'Testing can_cast_idea_vote...';
    SELECT * INTO rec FROM can_cast_idea_vote(v_idea_vote_id, v_user_id);
    
    RAISE NOTICE '';
    RAISE NOTICE 'RESULT:';
    RAISE NOTICE '  Allowed: %', rec.allowed;
    RAISE NOTICE '  Reason: %', rec.reason;
    RAISE NOTICE '  Details: %', rec.details;
    
    IF NOT rec.allowed THEN
      RAISE NOTICE '';
      RAISE NOTICE '❌ VOTE BLOCKED!';
      RAISE NOTICE '   Reason: %', rec.reason;
      
      -- If blocked by can_vote, check governance
      IF rec.reason = 'CAN_VOTE_BLOCKED' THEN
        RAISE NOTICE '';
        RAISE NOTICE '📋 Checking can_vote function...';
        
        SELECT * INTO rec FROM can_vote('5865535b-494c-461c-89c5-2463c08cdeae', v_user_id);
        RAISE NOTICE '   can_vote allowed: %', rec.allowed;
        RAISE NOTICE '   can_vote reason: %', rec.reason;
        RAISE NOTICE '   can_vote details: %', rec.details;
      END IF;
    ELSE
      RAISE NOTICE '';
      RAISE NOTICE '✅ Member CAN vote!';
    END IF;
    
  ELSE
    RAISE NOTICE '❌ Membership not found!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

