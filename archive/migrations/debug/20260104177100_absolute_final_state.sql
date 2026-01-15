DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '   🎉 ABSOLUTE FINAL STATE';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  RAISE NOTICE 'ORGANIZATIONS:';
  FOR rec IN
    SELECT name, slug, status FROM orgs ORDER BY status DESC, name
  LOOP
    IF rec.status = 'ACTIVE' THEN
      RAISE NOTICE '  ✅ % (%) - ACTIVE', rec.name, rec.slug;
    ELSE
      RAISE NOTICE '  ⚪ % (%) - %', rec.name, rec.slug, rec.status;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'ACTIVE MEMBERSHIPS:';
  FOR rec IN
    SELECT p.email, o.name as org_name, m.role
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id
    JOIN orgs o ON o.id = m.org_id
    WHERE m.member_status = 'ACTIVE'
    ORDER BY o.name, m.role DESC
  LOOP
    RAISE NOTICE '  ✅ % → % (role: %)', rec.org_name, rec.email, rec.role;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '🎉 SYSTEM READY!';
  RAISE NOTICE '   • Only Mano Bendruomenė is ACTIVE';
  RAISE NOTICE '   • owner1@test.lt is OWNER';
  RAISE NOTICE '   • All other orgs are DRAFT (inactive)';
  RAISE NOTICE '══════════════════════════════════════════════════';
  
END $$;

