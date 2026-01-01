-- Create Community Applications Table
-- Stores registration requests from /register-community page

CREATE TABLE IF NOT EXISTS public.community_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  CONSTRAINT community_applications_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_applications_status ON public.community_applications(status);
CREATE INDEX IF NOT EXISTS idx_community_applications_created_at ON public.community_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_applications_email ON public.community_applications(email);

-- RLS Policies
ALTER TABLE public.community_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can view all applications
CREATE POLICY "community_applications_select_admin" ON public.community_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = auth.uid()
        AND m.role = 'OWNER'
        AND m.member_status = 'ACTIVE'
        AND o.slug IN ('branduolys', 'platform')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND email = 'admin@pastas.email'
    )
  );

-- Policy: Platform admins can update applications
CREATE POLICY "community_applications_update_admin" ON public.community_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = auth.uid()
        AND m.role = 'OWNER'
        AND m.member_status = 'ACTIVE'
        AND o.slug IN ('branduolys', 'platform')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND email = 'admin@pastas.email'
    )
  );

-- Policy: Anyone can insert (for registration form)
CREATE POLICY "community_applications_insert_anon" ON public.community_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.community_applications IS 'Community registration requests from public registration form';
COMMENT ON COLUMN public.community_applications.status IS 'PENDING, APPROVED, REJECTED, IN_PROGRESS';
COMMENT ON COLUMN public.community_applications.reviewed_by IS 'User ID of admin who reviewed the application';
COMMENT ON COLUMN public.community_applications.admin_notes IS 'Internal notes for admin review';

