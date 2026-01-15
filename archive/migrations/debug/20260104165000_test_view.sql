-- Quick inline test
DO $$
DECLARE
  v_org_id uuid := '678b0788-b544-4bf8-8cf5-44dfb2185a52';
  v_count int;
  rec RECORD;
BEGIN
  RAISE NOTICE '=== TEST 1: View row count ===';
  SELECT COUNT(*) INTO v_count FROM member_debts WHERE org_id = v_org_id;
  RAISE NOTICE 'Rows in member_debts: %', v_count;

  IF v_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== TEST 2: Sample data ===';
    FOR rec IN 
      SELECT membership_id, full_name, email, debt_status 
      FROM member_debts 
      WHERE org_id = v_org_id 
      LIMIT 3
    LOOP
      RAISE NOTICE 'Member: %, email: %, status: %', rec.full_name, rec.email, rec.debt_status;
    END LOOP;
  ELSE
    RAISE NOTICE 'NO ROWS - checking underlying data...';
    
    SELECT COUNT(*) INTO v_count 
    FROM memberships 
    WHERE org_id = v_org_id AND member_status = 'ACTIVE';
    
    RAISE NOTICE 'Active memberships: %', v_count;
  END IF;
END $$;

