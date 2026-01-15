-- Add token and token_expires_at columns to community_applications table
-- Token is used for secure onboarding link access

ALTER TABLE public.community_applications
ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_community_applications_token 
ON public.community_applications(token) 
WHERE token IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.community_applications.token IS 'Unique token for onboarding link access';
COMMENT ON COLUMN public.community_applications.token_expires_at IS 'Token expiration timestamp (default: 7 days from creation)';

