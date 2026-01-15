DO $$
DECLARE
  v_func_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_func_def
  FROM pg_proc
  WHERE proname = 'can_vote'
  LIMIT 1;

  RAISE NOTICE 'Function definition:';
  RAISE NOTICE '%', v_func_def;
END $$;

