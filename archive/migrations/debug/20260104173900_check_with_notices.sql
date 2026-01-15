DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'CURRENT MEMBERSHIPS FOR user1, user2, user3:';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  FOR rec IN
    SELECT 
      p.email,
      o.name as org_name,
      o.id as org_id,
      m.role,
      m.member_status,
      CASE 
        WHEN o.id = '678b0788-b544-4bf8-8cf5-44dfb2185a52' THEN '✅ TARGET'
        ELSE '❌ WRONG ORG'
      END as expected
    FROM profiles p
    JOIN memberships m ON m.user_id = p.id
    JOIN orgs o ON o.id = m.org_id
    WHERE p.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
    ORDER BY p.email, m.member_status, o.name
  LOOP
    RAISE NOTICE '% → % (%): % - %', 
      rec.email, rec.org_name, rec.org_id, rec.member_status, rec.expected;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Mano Bendruomenė org ID:';
  FOR rec IN
    SELECT id, name FROM orgs WHERE name = 'Mano Bendruomenė'
  LOOP
    RAISE NOTICE '  %: %', rec.name, rec.id;
  END LOOP;
  
END $$;

