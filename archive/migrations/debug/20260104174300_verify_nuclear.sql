DO $$
DECLARE
  rec RECORD;
  v_multi_count int := 0;
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '   FINAL VERIFICATION AFTER NUCLEAR CLEANUP';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Show active memberships
  FOR rec IN
    SELECT 
      p.email,
      o.name as org_name,
      m.member_status
    FROM profiles p
    JOIN memberships m ON m.user_id = p.id
    JOIN orgs o ON o.id = m.org_id
    WHERE p.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
      AND m.member_status = 'ACTIVE'
    ORDER BY p.email, o.name
  LOOP
    RAISE NOTICE '✅ % → % (ACTIVE)', rec.email, rec.org_name;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- Count multi-org users
  SELECT COUNT(*) INTO v_multi_count
  FROM (
    SELECT p.email
    FROM profiles p
    JOIN memberships m ON m.user_id = p.id
    WHERE p.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
      AND m.member_status = 'ACTIVE'
    GROUP BY p.email
    HAVING COUNT(DISTINCT m.org_id) > 1
  ) sub;
  
  IF v_multi_count = 0 THEN
    RAISE NOTICE '🎉 SUCCESS! All users in single org only!';
  ELSE
    RAISE NOTICE '❌ FAILED! Still % multi-org users', v_multi_count;
  END IF;
  
END $$;

