DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '   ✅ ABSOLUTE FINAL STATE';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      o.name as org_name,
      p.email,
      m.role
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id  
    JOIN orgs o ON o.id = m.org_id
    WHERE m.member_status = 'ACTIVE'
    ORDER BY o.name, m.role DESC, p.email
  LOOP
    RAISE NOTICE '% → % (role: %)', rec.org_name, rec.email, rec.role;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 MULTI-ORG CLEANUP COMPLETE!';
  
END $$;

