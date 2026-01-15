DO $$
DECLARE
  v_idea_id uuid := 'c6256542-b03d-4139-b959-02696e27a1bc';
  rec RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CHECKING IDEA AND ITS VOTES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if it's an idea
  SELECT title, status INTO rec FROM ideas WHERE id = v_idea_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Found IDEA:';
    RAISE NOTICE '  Title: %', rec.title;
    RAISE NOTICE '  Status: %', rec.status;
    RAISE NOTICE '';
    
    -- Find associated vote
    RAISE NOTICE 'Looking for idea votes...';
    FOR rec IN
      SELECT id, status, closes_at
      FROM idea_votes
      WHERE idea_id = v_idea_id
      ORDER BY created_at DESC
    LOOP
      RAISE NOTICE '  Vote ID: %', rec.id;
      RAISE NOTICE '    Status: %', rec.status;
      RAISE NOTICE '    Closes: %', rec.closes_at;
    END LOOP;
  ELSE
    RAISE NOTICE 'Not an idea. Checking as vote ID...';
    
    SELECT idea_id, status INTO rec FROM idea_votes WHERE id = v_idea_id;
    
    IF FOUND THEN
      RAISE NOTICE 'Found as VOTE ID:';
      RAISE NOTICE '  Idea ID: %', rec.idea_id;
      RAISE NOTICE '  Status: %', rec.status;
    ELSE
      RAISE NOTICE '❌ Not found in ideas or idea_votes tables!';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
END $$;

