-- Debug: Why are DRAFT org memberships still ACTIVE?
DO $$
DECLARE
  rec RECORD;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'admin@pastas.email';
  
  RAISE NOTICE 'Admin ID: %', v_admin_id;
  RAISE NOTICE '';
  RAISE NOTICE 'All admin memberships:';
  
  FOR rec IN
    SELECT 
      o.name,
      o.status as org_status,
      m.role,
      m.member_status,
      m.org_id
    FROM memberships m
    JOIN orgs o ON o.id = m.org_id
    WHERE m.user_id = v_admin_id
    ORDER BY m.member_status, o.name
  LOOP
    RAISE NOTICE '  % - % (org: %, status: %)', 
      rec.name, rec.member_status, rec.org_status, rec.role;
  END LOOP;
  
END $$;

