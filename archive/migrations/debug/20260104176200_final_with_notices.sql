DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '   ✅ FINAL SUCCESS CHECK';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      p.email,
      COUNT(*) FILTER (WHERE m.member_status = 'ACTIVE') as count,
      string_agg(o.name || ' (' || m.role || ')', ', ' ORDER BY o.name) FILTER (WHERE m.member_status = 'ACTIVE') as info
    FROM profiles p
    LEFT JOIN memberships m ON m.user_id = p.id
    LEFT JOIN orgs o ON o.id = m.org_id
    WHERE p.email IN ('owner1@test.lt', 'owner2@test.lt', 'owner3@test.lt', 'info@kruminiai.lt',
                      'user1@test.lt', 'user2@test.lt', 'user3@test.lt')
    GROUP BY p.email
    ORDER BY p.email
  LOOP
    IF rec.count = 1 THEN
      RAISE NOTICE '✅ %: %', rec.email, rec.info;
    ELSE
      RAISE NOTICE '❌ %: %', rec.email, COALESCE(rec.info, 'NO ORGS');
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 CLEANUP COMPLETE!';
  
END $$;

