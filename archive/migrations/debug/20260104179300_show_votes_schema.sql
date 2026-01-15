DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📋 VOTES TABLE SCHEMA:';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOR rec IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'votes'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  • % (%)', rec.column_name, rec.data_type;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 VOTES COUNT:';
  SELECT COUNT(*) INTO rec FROM votes;
  RAISE NOTICE '  Total votes: %', rec.count;
  
  SELECT COUNT(*) INTO rec FROM votes WHERE org_id = '5865535b-494c-461c-89c5-2463c08cdeae';
  RAISE NOTICE '  Mano Bendruomenė votes: %', rec.count;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

