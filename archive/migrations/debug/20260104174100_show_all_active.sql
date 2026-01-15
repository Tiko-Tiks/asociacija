DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'ALL ACTIVE MEMBERSHIPS for user1, user2, user3:';
  RAISE NOTICE '';
  
  FOR rec IN
    SELECT 
      p.email,
      o.name as org_name,
      o.id as org_id,
      m.member_status
    FROM profiles p
    JOIN memberships m ON m.user_id = p.id
    JOIN orgs o ON o.id = m.org_id
    WHERE p.email IN ('user1@test.lt', 'user2@test.lt', 'user3@test.lt')
      AND m.member_status = 'ACTIVE'
    ORDER BY p.email, o.name
  LOOP
    RAISE NOTICE '%  →  %  (%)', rec.email, rec.org_name, rec.org_id;
  END LOOP;
  
END $$;

