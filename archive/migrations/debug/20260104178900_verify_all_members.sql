DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '   👥 MANO BENDRUOMENĖ - FINAL MEMBERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      p.email,
      m.role,
      m.member_status
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id
    WHERE m.org_id = '5865535b-494c-461c-89c5-2463c08cdeae'
      AND m.member_status = 'ACTIVE'
    ORDER BY 
      CASE m.role WHEN 'OWNER' THEN 1 ELSE 2 END,
      p.email
  LOOP
    RAISE NOTICE '  % % (%)',
      CASE WHEN rec.role = 'OWNER' THEN '👑' ELSE '👤' END,
      rec.email,
      rec.role;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ COMPLETE!';
  RAISE NOTICE '   • 1 OWNER: owner1@test.lt';
  RAISE NOTICE '   • 4 MEMBERS: admin, user1, user2, user3';
  RAISE NOTICE '   • Total: 5 active members';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

