-- ==================================================
-- MEMBER INVITES TABLE
-- ==================================================
-- Table for managing member invitations to organizations
-- ==================================================

CREATE TABLE IF NOT EXISTS public.member_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_invites_org ON public.member_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_member_invites_token ON public.member_invites(token);
CREATE INDEX IF NOT EXISTS idx_member_invites_email ON public.member_invites(email);
CREATE INDEX IF NOT EXISTS idx_member_invites_status ON public.member_invites(status);

-- RLS Policies
ALTER TABLE public.member_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read invites for their email
CREATE POLICY "Users can read invites for their email"
  ON public.member_invites
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: OWNER can manage invites for their org
CREATE POLICY "OWNER can manage invites for their org"
  ON public.member_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE org_id = member_invites.org_id
        AND user_id = auth.uid()
        AND member_status = 'ACTIVE'
        AND role = 'OWNER'
    )
  );

-- Policy: Users can update invites they created (to mark as accepted)
CREATE POLICY "Users can update their own invites"
  ON public.member_invites
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

COMMENT ON TABLE public.member_invites IS 'Narių kvietimai į organizacijas';
COMMENT ON COLUMN public.member_invites.token IS 'Unikalus kvietimo tokenas';
COMMENT ON COLUMN public.member_invites.status IS 'Kvietimo būsena: PENDING, ACCEPTED, EXPIRED, CANCELLED';
COMMENT ON COLUMN public.member_invites.expires_at IS 'Kvietimo galiojimo pabaigos data';

