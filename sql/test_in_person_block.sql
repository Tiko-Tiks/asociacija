-- ==================================================
-- TEST 6: IN_PERSON Block
-- ==================================================
-- Patikrinti, kad GA HARD MODE blokuoja IN_PERSON channel
-- ==================================================

-- 1. Rasti aktyvų GA vote (iš naujo susirinkimo arba sukurti testinį)
-- Naudojame užbaigto susirinkimo votes kaip pavyzdį
SELECT 
  v.id AS vote_id,
  v.kind,
  v.status,
  v.meeting_id,
  m.scheduled_at
FROM votes v
JOIN meetings m ON m.id = v.meeting_id
WHERE v.kind = 'GA'
LIMIT 1;

-- 2. Patikrinti can_cast_vote su IN_PERSON channel
-- Tai turėtų grąžinti ok=false, reason='GA_IN_PERSON_BLOCKED'
-- PASTABA: Reikia pakeisti vote_id į realų ID iš 1 užklausos

-- Pavyzdys (pakeiskite vote_id):
-- SELECT * FROM can_cast_vote(
--   'VOTE_ID'::uuid,
--   'MEMBERSHIP_ID'::uuid,
--   'IN_PERSON'::vote_channel
-- );

-- 3. Patikrinti cast_vote su IN_PERSON channel
-- Tai turėtų grąžinti klaidą 'GA_IN_PERSON_BLOCKED'

-- 4. Patikrinti can_cast_vote su REMOTE channel
-- Tai turėtų veikti (jei dar ne freeze)

-- ==================================================
-- TIKIMASI:
-- IN_PERSON → BLOCKED (GA_IN_PERSON_BLOCKED)
-- REMOTE → ALLOWED (jei prieš freeze)
-- WRITTEN → ALLOWED
-- ==================================================

