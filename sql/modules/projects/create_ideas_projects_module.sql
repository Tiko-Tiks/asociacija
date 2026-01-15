-- ==================================================
-- IDEAS → VOTING → PROJECTS → SUPPORT Module
-- Database Schema
-- ==================================================

-- ENUMs (using TEXT with CHECK constraints for flexibility)
-- Note: PostgreSQL ENUMs are also valid, but TEXT+CHECK allows easier migration

-- 1. Ideas table
CREATE TABLE IF NOT EXISTS public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  title text NOT NULL,
  summary text NULL,
  details text NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'PASSED', 'FAILED', 'NOT_COMPLETED', 'ARCHIVED')),
  public_visible boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz NULL,
  closed_at timestamptz NULL,
  passed_at timestamptz NULL
);

-- Create indexes only if they don't exist and table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ideas') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_org') THEN
      CREATE INDEX idx_ideas_org ON public.ideas(org_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_status') THEN
      CREATE INDEX idx_ideas_status ON public.ideas(org_id, status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ideas_public') THEN
      CREATE INDEX idx_ideas_public ON public.ideas(public_visible, status) WHERE public_visible = true;
    END IF;
  END IF;
END $$;

-- 2. Idea attachments
CREATE TABLE IF NOT EXISTS public.idea_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  bucket text NOT NULL DEFAULT 'idea-documents',
  path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NULL,
  size_bytes bigint NULL,
  uploaded_by uuid NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_attachments') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_attachments_idea') THEN
      CREATE INDEX idx_idea_attachments_idea ON public.idea_attachments(idea_id);
    END IF;
  END IF;
END $$;

-- 3. Idea votes (one vote per idea)
CREATE TABLE IF NOT EXISTS public.idea_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL UNIQUE REFERENCES public.ideas(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opens_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz NOT NULL,
  duration_days int NOT NULL DEFAULT 7,
  closed_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_votes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_votes_org') THEN
      CREATE INDEX idx_idea_votes_org ON public.idea_votes(org_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_votes_status') THEN
      CREATE INDEX idx_idea_votes_status ON public.idea_votes(status, closes_at);
    END IF;
  END IF;
END $$;

-- 4. Idea ballots (one ballot per membership per vote)
CREATE TABLE IF NOT EXISTS public.idea_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_vote_id uuid NOT NULL REFERENCES public.idea_votes(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('FOR', 'AGAINST')),
  cast_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(idea_vote_id, membership_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_ballots') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_ballots_vote') THEN
      CREATE INDEX idx_idea_ballots_vote ON public.idea_ballots(idea_vote_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idea_ballots_membership') THEN
      CREATE INDEX idx_idea_ballots_membership ON public.idea_ballots(membership_id);
    END IF;
  END IF;
END $$;

-- 5. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  idea_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'FUNDING' CHECK (status IN ('PLANNING', 'FUNDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  budget_eur numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  funding_opened_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

-- Add missing columns if table exists but is missing them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    -- Add idea_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'idea_id') THEN
      ALTER TABLE public.projects ADD COLUMN idea_id uuid NULL;
    END IF;
    -- Add budget_eur if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'budget_eur') THEN
      ALTER TABLE public.projects ADD COLUMN budget_eur numeric(12,2) NOT NULL DEFAULT 0;
    END IF;
    -- Add other columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'title') THEN
      ALTER TABLE public.projects ADD COLUMN title text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'description') THEN
      ALTER TABLE public.projects ADD COLUMN description text NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'status') THEN
      ALTER TABLE public.projects ADD COLUMN status text NOT NULL DEFAULT 'FUNDING' CHECK (status IN ('PLANNING', 'FUNDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_by') THEN
      ALTER TABLE public.projects ADD COLUMN created_by uuid NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_at') THEN
      ALTER TABLE public.projects ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'funding_opened_at') THEN
      ALTER TABLE public.projects ADD COLUMN funding_opened_at timestamptz NOT NULL DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'completed_at') THEN
      ALTER TABLE public.projects ADD COLUMN completed_at timestamptz NULL;
    END IF;
  END IF;
END $$;

-- Add foreign key constraint if ideas table exists and constraint doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ideas') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
        AND table_name = 'projects' 
        AND constraint_name LIKE '%idea_id%'
    ) THEN
      ALTER TABLE public.projects 
      ADD CONSTRAINT projects_idea_id_fkey 
      FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    -- Check if idea_id column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'idea_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_idea') THEN
        CREATE INDEX idx_projects_idea ON public.projects(idea_id);
      END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_org') THEN
      CREATE INDEX idx_projects_org ON public.projects(org_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_status') THEN
      CREATE INDEX idx_projects_status ON public.projects(org_id, status);
    END IF;
  END IF;
END $$;

-- 6. Project contributions
CREATE TABLE IF NOT EXISTS public.project_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('MONEY', 'IN_KIND', 'WORK')),
  status text NOT NULL DEFAULT 'PLEDGED' CHECK (status IN ('PLEDGED', 'RECEIVED', 'CANCELLED')),
  money_amount_eur numeric(12,2) NULL,
  in_kind_items jsonb NULL,
  work_offer jsonb NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'MONEY' AND money_amount_eur IS NOT NULL AND money_amount_eur > 0) OR
    (kind = 'IN_KIND' AND in_kind_items IS NOT NULL) OR
    (kind = 'WORK' AND work_offer IS NOT NULL)
  )
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_contributions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_contributions_project') THEN
      CREATE INDEX idx_project_contributions_project ON public.project_contributions(project_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_contributions_org_kind_status') THEN
      CREATE INDEX idx_project_contributions_org_kind_status ON public.project_contributions(org_id, kind, status);
    END IF;
  END IF;
END $$;

-- 7. View: Idea vote tally (only create if required tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ideas')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_votes')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idea_ballots') THEN
    EXECUTE $sql$
CREATE OR REPLACE VIEW public.idea_vote_tally AS
SELECT 
  iv.idea_id,
  iv.id as vote_id,
  iv.org_id,
  iv.status as vote_status,
  iv.closes_at,
  COUNT(CASE WHEN ib.choice = 'FOR' THEN 1 END)::int as votes_for,
  COUNT(CASE WHEN ib.choice = 'AGAINST' THEN 1 END)::int as votes_against,
  COUNT(ib.id)::int as votes_total,
  (SELECT COUNT(*)::int FROM public.memberships m
   INNER JOIN public.orgs o ON o.id = m.org_id
   WHERE m.org_id = iv.org_id 
     AND m.member_status = 'ACTIVE'
     AND o.status = 'ACTIVE'
     AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
  ) as total_active_members,
  CASE 
    WHEN iv.status = 'OPEN' AND now() < iv.closes_at THEN 'OPEN'
    WHEN iv.status = 'CLOSED' OR now() >= iv.closes_at THEN 'CLOSED'
    ELSE 'OPEN'
  END as effective_status
FROM public.idea_votes iv
LEFT JOIN public.idea_ballots ib ON iv.id = ib.idea_vote_id
GROUP BY iv.id, iv.idea_id, iv.org_id, iv.status, iv.closes_at
$sql$;
  END IF;
END $$;

-- 8. View: Project funding totals (only create if projects table exists with required columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'budget_eur') THEN
      EXECUTE $sql$
CREATE OR REPLACE VIEW public.project_funding_totals AS
SELECT 
  p.id as project_id,
  p.org_id,
  p.budget_eur as goal_budget_eur,
  COALESCE(SUM(CASE WHEN pc.kind = 'MONEY' AND pc.status = 'PLEDGED' THEN pc.money_amount_eur ELSE 0 END), 0)::numeric(12,2) as pledged_money_eur,
  COALESCE(SUM(CASE WHEN pc.kind = 'MONEY' AND pc.status = 'RECEIVED' THEN pc.money_amount_eur ELSE 0 END), 0)::numeric(12,2) as received_money_eur,
  COUNT(CASE WHEN pc.kind = 'IN_KIND' AND pc.status = 'PLEDGED' THEN 1 END)::int as pledged_in_kind_count,
  COALESCE(SUM(
    CASE 
      WHEN pc.kind = 'WORK' AND pc.status = 'PLEDGED' AND pc.work_offer->>'hours' IS NOT NULL 
      THEN (pc.work_offer->>'hours')::numeric
      ELSE 0
    END
  ), 0)::numeric(12,2) as pledged_work_hours,
  CASE 
    WHEN p.budget_eur > 0 THEN 
      (COALESCE(SUM(CASE WHEN pc.kind = 'MONEY' AND pc.status = 'RECEIVED' THEN pc.money_amount_eur ELSE 0 END), 0) / p.budget_eur * 100)::numeric(5,2)
    ELSE 0
  END as progress_ratio
FROM public.projects p
LEFT JOIN public.project_contributions pc ON p.id = pc.project_id
GROUP BY p.id, p.org_id, p.budget_eur
$sql$;
    END IF;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.ideas IS 'Community ideas that can be voted on and turned into projects';
COMMENT ON TABLE public.idea_votes IS 'Voting sessions for ideas (one vote per idea)';
COMMENT ON TABLE public.idea_ballots IS 'Individual votes cast by members';
COMMENT ON TABLE public.projects IS 'Projects created from passed ideas';
COMMENT ON TABLE public.project_contributions IS 'Member contributions (money, in-kind, work) to projects';
COMMENT ON VIEW public.idea_vote_tally IS 'Aggregated vote counts and participation metrics';
COMMENT ON VIEW public.project_funding_totals IS 'Funding progress and totals for projects';

