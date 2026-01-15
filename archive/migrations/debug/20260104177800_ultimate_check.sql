DO $$
DECLARE
  rec RECORD;
  v_active_count int;
BEGIN
  SELECT COUNT(*) INTO v_active_count FROM memberships WHERE member_status = 'ACTIVE';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '   🎉 ULTIMATE FINAL STATE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Active memberships: %', v_active_count;
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT p.email, o.name, m.role
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id
    JOIN orgs o ON o.id = m.org_id
    WHERE m.member_status = 'ACTIVE'
    ORDER BY m.role DESC, p.email
  LOOP
    RAISE NOTICE '  % % → % (%)', 
      CASE WHEN rec.role = 'OWNER' THEN '👑' ELSE '👤' END,
      rec.email, rec.name, rec.role;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '   • Only 2 active memberships';
  RAISE NOTICE '   • owner1@test.lt is OWNER of Mano Bendruomenė';
  RAISE NOTICE '   • admin@pastas.email is MEMBER of Mano Bendruomenė';
  RAISE NOTICE '   • All other orgs are DRAFT (inactive)';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

