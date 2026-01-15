DO $$
DECLARE
  rec RECORD;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'admin@pastas.email';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'CHECKING DATABASE STATE (not cache)';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      o.name,
      o.status as org_status,
      m.member_status,
      m.left_at
    FROM memberships m
    JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_admin_id
    ORDER BY m.member_status, o.name
  LOOP
    RAISE NOTICE '% - % (org: %) [left_at: %]',
      rec.name, rec.member_status, rec.org_status, rec.left_at;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'If you see ACTIVE memberships in DRAFT orgs - UPDATE failed!';
  RAISE NOTICE 'If you see LEFT memberships - SUCCESS!';
  
END $$;

