DO $$
DECLARE
  rec RECORD;
  v_active_orgs int;
  v_active_memberships int;
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '   🎉🎉🎉 CLEANUP COMPLETE! 🎉🎉🎉';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO v_active_orgs FROM orgs WHERE status = 'ACTIVE';
  SELECT COUNT(*) INTO v_active_memberships FROM memberships WHERE member_status = 'ACTIVE';
  
  RAISE NOTICE 'STATISTICS:';
  RAISE NOTICE '  • Active organizations: %', v_active_orgs;
  RAISE NOTICE '  • Active memberships: %', v_active_memberships;
  RAISE NOTICE '';
  
  RAISE NOTICE 'ACTIVE ORGANIZATION:';
  FOR rec IN SELECT name, slug FROM orgs WHERE status = 'ACTIVE'
  LOOP
    RAISE NOTICE '  ✅ % (slug: %)', rec.name, rec.slug;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'ACTIVE MEMBERSHIPS:';
  FOR rec IN
    SELECT p.email, o.name as org, m.role
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id
    JOIN orgs o ON o.id = m.org_id
    WHERE m.member_status = 'ACTIVE'
  LOOP
    RAISE NOTICE '  ✅ % (%)', rec.email, rec.role;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '✅ SYSTEM CLEAN & READY FOR TESTING!';
  RAISE NOTICE '══════════════════════════════════════════════════';
  
END $$;

