DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'ALL constraints on memberships:';
  FOR rec IN
    SELECT 
      conname as constraint_name,
      contype as type,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint 
    WHERE conrelid = 'memberships'::regclass
    ORDER BY contype, conname
  LOOP
    RAISE NOTICE '  [%] %: %', rec.type, rec.constraint_name, rec.definition;
  END LOOP;
END $$;

