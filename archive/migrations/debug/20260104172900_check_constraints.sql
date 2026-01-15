DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Check all triggers on memberships
  RAISE NOTICE 'Triggers on memberships:';
  FOR rec IN 
    SELECT tgname FROM pg_trigger WHERE tgrelid = 'memberships'::regclass
  LOOP
    RAISE NOTICE '  • %', rec.tgname;
  END LOOP;
  
  -- Check constraints
  RAISE NOTICE '';
  RAISE NOTICE 'Unique constraints on memberships:';
  FOR rec IN
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'memberships'::regclass AND contype IN ('u', 'p')
  LOOP
    RAISE NOTICE '  • %', rec.conname;
  END LOOP;
END $$;

