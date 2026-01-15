DO $$
DECLARE
  v_target_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52';
  v_admin_user_id uuid := '64ceab66-d6b8-4142-a1ff-87f63739b029';
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'Orgs needing admin as OWNER:';
  RAISE NOTICE '═══════════════════════════════════════════════';
  
  FOR rec IN
    SELECT 
      o.id,
      o.name,
      o.slug,
      (SELECT role FROM memberships WHERE org_id = o.id AND user_id = v_admin_user_id LIMIT 1) as admin_role
    FROM orgs o
    WHERE o.id != v_target_org_id
      AND NOT EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.org_id = o.id
          AND m.user_id = v_admin_user_id
          AND m.role = 'OWNER'
          AND m.member_status = 'ACTIVE'
      )
  LOOP
    RAISE NOTICE 'Org: % (%) - Admin role: %', rec.name, rec.slug, COALESCE(rec.admin_role::text, 'NO MEMBERSHIP');
  END LOOP;
END $$;

