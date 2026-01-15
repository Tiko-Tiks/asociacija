-- Get token for email: owner2@test.lt
-- Run this in Supabase SQL Editor or psql

SELECT 
  id,
  community_name,
  email,
  token,
  token_expires_at,
  status,
  created_at,
  CASE 
    WHEN token_expires_at > NOW() THEN 'VALID'
    ELSE 'EXPIRED'
  END as token_status,
  -- Full onboarding link
  CONCAT('http://localhost:3000/onboarding/continue?token=', token) as onboarding_link
FROM community_applications
WHERE email = 'owner2@test.lt'
ORDER BY created_at DESC
LIMIT 1;
