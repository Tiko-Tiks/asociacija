DO $$
DECLARE
  rec RECORD;
  v_user_id uuid;
BEGIN
  -- Find user3@test.lt
  SELECT id INTO v_user_id FROM profiles WHERE email = 'user3@test.lt';

  RAISE NOTICE '=== USER MULTI-ORG CHECK ===';
  RAISE NOTICE 'User: user3@test.lt (id: %)', v_user_id;
  RAISE NOTICE '';

  FOR rec IN
    SELECT 
      m.org_id,
      o.name as org_name,
      o.slug,
      m.role,
      m.member_status,
      gc.answers->>'track_fees' as track_fees,
      gc.answers->>'restrict_debtors' as restrict_debtors
    FROM memberships m
    JOIN orgs o ON o.id = m.org_id
    LEFT JOIN governance_configs gc ON gc.org_id = m.org_id
    WHERE m.user_id = v_user_id
    ORDER BY m.joined_at
  LOOP
    RAISE NOTICE 'Org: % (slug: %)', rec.org_name, rec.slug;
    RAISE NOTICE '  Role: %, Status: %', rec.role, rec.member_status;
    RAISE NOTICE '  track_fees: %, restrict_debtors: %', rec.track_fees, rec.restrict_debtors;
    RAISE NOTICE '';
  END LOOP;

  -- Check all multi-org users
  RAISE NOTICE '=== ALL MULTI-ORG USERS ===';
  FOR rec IN
    SELECT 
      u.email,
      COUNT(DISTINCT m.org_id) as org_count
    FROM profiles u
    JOIN memberships m ON m.user_id = u.id
    WHERE m.member_status = 'ACTIVE'
    GROUP BY u.id, u.email
    HAVING COUNT(DISTINCT m.org_id) > 1
    ORDER BY org_count DESC
  LOOP
    RAISE NOTICE 'User: % → % orgs', rec.email, rec.org_count;
  END LOOP;
END $$;

