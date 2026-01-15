-- ==================================================
-- DEBUG: Remote Voting Issue
-- ==================================================
-- Patikrinti, kodėl REMOTE voting nerodomas
-- ==================================================

-- PAKEISTI MEETING_ID
-- meeting_id: '4baafb4e-4c76-4317-8bf9-f4c10e011766'

-- ==================================================
-- 1. PATIKRINTI AR VOTES SUKURTI
-- ==================================================
-- NOTE: votes lentelė neturi channel stulpelio (channel yra vote_ballots lentelėje)
SELECT 
  v.id AS vote_id,
  v.kind,
  v.status,
  v.meeting_id,
  v.resolution_id,
  mai.item_no,
  mai.title AS agenda_title,
  r.title AS resolution_title,
  v.opens_at,
  v.closes_at
FROM votes v
LEFT JOIN resolutions r ON r.id = v.resolution_id
LEFT JOIN meeting_agenda_items mai ON mai.resolution_id = r.id
WHERE v.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no NULLS LAST;

-- Expected: Votes su kind='GA', status='OPEN' visiems items su resolution_id

-- ==================================================
-- 2. PATIKRINTI AR RESOLUTIONS SUKURTOS PROCEDŪRINIAIS KLAUSIMAIS
-- ==================================================
SELECT 
  mai.item_no,
  mai.title AS agenda_title,
  mai.resolution_id,
  r.id AS resolution_id_check,
  r.title AS resolution_title,
  r.status AS resolution_status
FROM meeting_agenda_items mai
LEFT JOIN resolutions r ON r.id = mai.resolution_id
WHERE mai.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
ORDER BY mai.item_no;

-- Expected: Visi items turi resolution_id ir resolution egzistuoja

-- ==================================================
-- 3. PATIKRINTI AR VOTES YRA OPEN STATUS
-- ==================================================
SELECT 
  COUNT(*) AS total_votes,
  COUNT(*) FILTER (WHERE status = 'OPEN') AS open_votes,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed_votes,
  COUNT(*) FILTER (WHERE kind = 'GA') AS ga_votes
FROM votes
WHERE meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- Expected: open_votes >= 3 (procedural items 1-3)

-- ==================================================
-- 4. PATIKRINTI REMOTE VOTERS
-- ==================================================
-- NOTE: meeting_remote_voters view turi tik meeting_id ir membership_id
SELECT 
  mrv.membership_id,
  mrv.meeting_id
FROM meeting_remote_voters mrv
WHERE mrv.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid;

-- Expected: Remote voters įrašai (jei narys užregistravo norą balsuoti nuotoliu)

-- ==================================================
-- 5. PATIKRINTI VOTE_BALLOTS (Remote votes count)
-- ==================================================
SELECT 
  vb.membership_id,
  vb.channel,
  COUNT(*) AS votes_count
FROM vote_ballots vb
JOIN votes v ON v.id = vb.vote_id
WHERE v.meeting_id = '4baafb4e-4c76-4317-8bf9-f4c10e011766'::uuid
  AND vb.channel IN ('REMOTE', 'WRITTEN')
GROUP BY vb.membership_id, vb.channel;

-- Expected: Remote/Written votes per member

