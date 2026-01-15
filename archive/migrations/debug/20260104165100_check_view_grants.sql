DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52';
  v_count int;
  rec RECORD;
BEGIN
  -- Check grants
  RAISE NOTICE '=== GRANTS ON member_debts ===';
  FOR rec IN
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_name = 'member_debts'
  LOOP
    RAISE NOTICE 'Grantee: %, Privilege: %', rec.grantee, rec.privilege_type;
  END LOOP;

  -- Check if anon/authenticated roles have access
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking access ===';
  BEGIN
    SELECT COUNT(*) INTO v_count FROM member_debts WHERE org_id = v_org_id;
    RAISE NOTICE 'Query succeeded, rows: %', v_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Query failed: %', SQLERRM;
  END;
END $$;

