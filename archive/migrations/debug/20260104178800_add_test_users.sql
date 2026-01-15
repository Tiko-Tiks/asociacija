-- Add user1, user2, user3 as MEMBER to Mano Bendruomenė
-- Org ID: 5865535b-494c-461c-89c5-2463c08cdeae

DO $$
DECLARE
  v_org_id uuid := '5865535b-494c-461c-89c5-2463c08cdeae';
  v_user_id uuid;
  v_test_users text[] := ARRAY['user1@test.lt', 'user2@test.lt', 'user3@test.lt'];
  v_email text;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'Adding test users to Mano Bendruomenė';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  FOREACH v_email IN ARRAY v_test_users
  LOOP
    -- Check if user exists in profiles
    SELECT id INTO v_user_id FROM profiles WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
      RAISE NOTICE '❌ User % does not exist in profiles - SKIPPED', v_email;
      RAISE NOTICE '   (User needs to be created via auth signup first)';
    ELSE
      -- Check if membership already exists
      IF EXISTS (
        SELECT 1 FROM memberships 
        WHERE user_id = v_user_id AND org_id = v_org_id
      ) THEN
        -- Update existing membership to ACTIVE
        UPDATE memberships
        SET member_status = 'ACTIVE',
            left_at = NULL,
            status_reason = NULL
        WHERE user_id = v_user_id 
          AND org_id = v_org_id;
        
        RAISE NOTICE '✅ % - Reactivated existing membership', v_email;
      ELSE
        -- Create new membership
        INSERT INTO memberships (
          org_id, 
          user_id, 
          role, 
          status, 
          member_status,
          joined_at
        )
        VALUES (
          v_org_id,
          v_user_id,
          'MEMBER',
          'ACTIVE',
          'ACTIVE',
          NOW()
        );
        
        RAISE NOTICE '✅ % - Created new membership', v_email;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Users added successfully!';
  
END $$;

-- Simplified final check
SELECT 
  p.email,
  m.role,
  m.member_status
FROM memberships m
JOIN profiles p ON p.id = m.user_id
WHERE m.org_id = '5865535b-494c-461c-89c5-2463c08cdeae'
  AND m.member_status = 'ACTIVE'
ORDER BY m.role DESC, p.email;

