-- Check token status and diagnose issues
-- Token: _ha9-8hRf9eQMrtj2PuYOYkxXtY4F__BMyItqOTZYAE

SELECT 
  id,
  community_name,
  email,
  token,
  token_expires_at,
  status,
  created_at,
  -- Check if token matches exactly
  CASE 
    WHEN token = '_ha9-8hRf9eQMrtj2PuYOYkxXtY4F__BMyItqOTZYAE' THEN 'TOKEN_MATCHES'
    ELSE 'TOKEN_DOES_NOT_MATCH'
  END as token_match,
  -- Check expiration
  CASE 
    WHEN token_expires_at > NOW() THEN 'VALID'
    ELSE 'EXPIRED'
  END as expiration_status,
  -- Check status
  CASE 
    WHEN status = 'PENDING' THEN 'OK - Can proceed'
    WHEN status = 'IN_PROGRESS' THEN 'OK - Already started'
    WHEN status = 'APPROVED' THEN 'WARNING - Already approved'
    WHEN status = 'REJECTED' THEN 'ERROR - Rejected'
    WHEN status = 'DECLINED' THEN 'ERROR - Declined'
    ELSE 'UNKNOWN_STATUS'
  END as status_check,
  -- Full onboarding link
  CONCAT('http://localhost:3000/onboarding/continue?token=', token) as onboarding_link
FROM community_applications
WHERE email = 'owner2@test.lt'
ORDER BY created_at DESC;

-- Also check if token exists with exact match
SELECT 
  id,
  community_name,
  email,
  token,
  status,
  token_expires_at,
  CASE 
    WHEN token_expires_at > NOW() THEN 'VALID'
    ELSE 'EXPIRED'
  END as expiration_status
FROM community_applications
WHERE token = '_ha9-8hRf9eQMrtj2PuYOYkxXtY4F__BMyItqOTZYAE';
