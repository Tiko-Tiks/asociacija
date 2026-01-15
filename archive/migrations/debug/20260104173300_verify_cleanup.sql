DO $$
DECLARE
  v_target_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52';
  v_admin_user_id uuid := '64ceab66-d6b8-4142-a1ff-87f63739b029';
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'FINAL CLEANUP VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      o.name as org_name,
      o.slug,
      COUNT(m.id) FILTER (WHERE m.member_status = 'ACTIVE') as total_active,
      COUNT(m.id) FILTER (WHERE m.member_status = 'ACTIVE' AND m.user_id = v_admin_user_id) as admin_count,
      COUNT(m.id) FILTER (WHERE m.member_status = 'ACTIVE' AND m.user_id != v_admin_user_id) as non_admin_count,
      CASE WHEN o.id = v_target_org_id THEN '✅ TARGET' ELSE '❌ OTHER' END as type
    FROM orgs o
    LEFT JOIN memberships m ON m.org_id = o.id
    GROUP BY o.id, o.name, o.slug
    HAVING COUNT(m.id) FILTER (WHERE m.member_status = 'ACTIVE') > 0
    ORDER BY non_admin_count DESC, total_active DESC
  LOOP
    RAISE NOTICE '% %:', rec.type, rec.org_name;
    RAISE NOTICE '  Total active: %', rec.total_active;
    RAISE NOTICE '  Admin: %, Other users: %', rec.admin_count, rec.non_admin_count;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Multi-org users (should be ZERO):';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  FOR rec IN
    SELECT 
      p.email,
      COUNT(DISTINCT m.org_id) as org_count
    FROM profiles p
    JOIN memberships m ON m.user_id = p.id
    WHERE m.member_status = 'ACTIVE'
      AND p.id != v_admin_user_id
    GROUP BY p.id, p.email
    HAVING COUNT(DISTINCT m.org_id) > 1
  LOOP
    RAISE NOTICE '  ❌ %: % orgs', rec.email, rec.org_count;
  END LOOP;
  
  IF NOT FOUND THEN
    RAISE NOTICE '  ✅ SUCCESS! No multi-org users!';
  END IF;
  
END $$;

