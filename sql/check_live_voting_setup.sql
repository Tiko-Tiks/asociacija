-- ==================================================
-- CHECK: vote_live_totals table and RPC
-- ==================================================

-- 1. Patikrinti ar vote_live_totals lentelė egzistuoja
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'vote_live_totals'
) AS table_exists;

-- 2. Patikrinti ar set_vote_live_totals RPC egzistuoja
SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'set_vote_live_totals'
) AS rpc_exists;

-- 3. Patikrinti vote_live_totals turinį (jei lentelė egzistuoja)
SELECT * FROM vote_live_totals
WHERE vote_id IN (
  SELECT id FROM votes 
  WHERE meeting_id = 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8'::uuid
);

-- 4. Patikrinti meeting_attendance (IN_PERSON dalyviai)
SELECT 
  ma.membership_id,
  ma.present,
  ma.mode,
  m.full_name
FROM meeting_attendance ma
LEFT JOIN memberships mem ON mem.id = ma.membership_id
LEFT JOIN profiles m ON m.id = mem.user_id
WHERE ma.meeting_id = 'e1871cb7-bb1c-43aa-a2e0-9193333ae1d8'::uuid
  AND ma.mode = 'IN_PERSON'
  AND ma.present = true;

-- Expected: 3 IN_PERSON dalyviai

