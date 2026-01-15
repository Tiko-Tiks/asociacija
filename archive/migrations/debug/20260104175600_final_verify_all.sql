DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '🎯 FINAL VERIFICATION:';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      p.email,
      COUNT(*) FILTER (WHERE m.member_status = 'ACTIVE') as active_count,
      array_agg(o.name ORDER BY o.name) FILTER (WHERE m.member_status = 'ACTIVE') as orgs
    FROM profiles p
    LEFT JOIN memberships m ON m.user_id = p.id
    LEFT JOIN orgs o ON o.id = m.org_id
    WHERE p.email IN ('owner1@test.lt', 'owner2@test.lt', 'owner3@test.lt', 'info@kruminiai.lt', 
                      'user1@test.lt', 'user2@test.lt', 'user3@test.lt')
    GROUP BY p.email
    ORDER BY p.email
  LOOP
    IF rec.active_count = 1 THEN
      RAISE NOTICE '✅ %: %', rec.email, rec.orgs[1];
    ELSIF rec.active_count > 1 THEN
      RAISE NOTICE '❌ %: % orgs → %', rec.email, rec.active_count, rec.orgs;
    END IF;
  END LOOP;
  
END $$;

