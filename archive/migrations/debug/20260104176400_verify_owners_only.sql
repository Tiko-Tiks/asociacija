DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '   🎯 FINAL OWNERS-ONLY VERIFICATION';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      p.email,
      o.name as org_name,
      m.role
    FROM profiles p
    JOIN memberships m ON m.user_id = p.id
    JOIN orgs o ON o.id = m.org_id
    WHERE m.member_status = 'ACTIVE'
    ORDER BY o.name, p.email
  LOOP
    RAISE NOTICE '✅ % → % (role: %)', rec.email, rec.org_name, rec.role;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '🎉 DONE!';
  RAISE NOTICE '══════════════════════════════════════════════════';
  
END $$;

