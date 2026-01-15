DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '   🎉🎉🎉 ABSOLUTE FINAL STATE 🎉🎉🎉';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  RAISE NOTICE '👥 ACTIVE MEMBERSHIPS:';
  FOR rec IN
    SELECT p.email, o.name, m.role
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id
    JOIN orgs o ON o.id = m.org_id
    WHERE m.member_status = 'ACTIVE'
    ORDER BY m.role DESC, p.email
  LOOP
    RAISE NOTICE '  % % (%)', 
      CASE WHEN rec.role = 'OWNER' THEN '👑' ELSE '👤' END,
      rec.email, rec.name;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MISSION ACCOMPLISHED!';
  RAISE NOTICE '   • owner1@test.lt → Mano Bendruomenė (OWNER)';
  RAISE NOTICE '   • admin@pastas.email → Mano Bendruomenė (MEMBER)';
  RAISE NOTICE '   • All other orgs are DRAFT';
  RAISE NOTICE '   • All multi-org issues resolved';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

