-- ==================================================
-- SIMPLE VOTE MODULIO SUKŪRIMAS
-- ==================================================
-- Sukuria simple vote lenteles, view, indeksus
-- ==================================================

-- ==================================================
-- 1. VOTE_CHOICE ENUM (jei neegzistuoja)
-- ==================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'vote_choice'
  ) THEN
    CREATE TYPE public.vote_choice AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');
    RAISE NOTICE 'Created vote_choice enum';
  ELSE
    RAISE NOTICE 'vote_choice enum already exists';
  END IF;
END $$;

-- ==================================================
-- 2. SIMPLE_VOTES LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.simple_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closes_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simple_votes_org ON public.simple_votes(org_id);
CREATE INDEX IF NOT EXISTS idx_simple_votes_org_status ON public.simple_votes(org_id, status);
CREATE INDEX IF NOT EXISTS idx_simple_votes_created_at ON public.simple_votes(created_at DESC);

COMMENT ON TABLE public.simple_votes IS 'Paprasti balsavimai (poll) be kvorumo ir susirinkimo';
COMMENT ON COLUMN public.simple_votes.status IS 'OPEN arba CLOSED';
COMMENT ON COLUMN public.simple_votes.closes_at IS 'Planuota uždarymo data (optional)';

-- ==================================================
-- 3. SIMPLE_VOTE_BALLOTS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.simple_vote_ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.simple_votes(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  choice public.vote_choice NOT NULL,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_simple_vote_ballot UNIQUE (vote_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_simple_vote_ballots_vote ON public.simple_vote_ballots(vote_id);
CREATE INDEX IF NOT EXISTS idx_simple_vote_ballots_membership ON public.simple_vote_ballots(membership_id);

COMMENT ON TABLE public.simple_vote_ballots IS 'Paprastų balsavimų balsai';
COMMENT ON COLUMN public.simple_vote_ballots.choice IS 'FOR, AGAINST, arba ABSTAIN';

-- ==================================================
-- 4. SIMPLE_VOTE_ATTACHMENTS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.simple_vote_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.simple_votes(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'vote-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simple_vote_attachments_vote ON public.simple_vote_attachments(vote_id);

COMMENT ON TABLE public.simple_vote_attachments IS 'Paprastų balsavimų priedai (failų metaduomenys)';
COMMENT ON COLUMN public.simple_vote_attachments.storage_path IS 'Supabase Storage path';

-- ==================================================
-- 5. SIMPLE_VOTE_TALLIES VIEW
-- ==================================================

CREATE OR REPLACE VIEW public.simple_vote_tallies AS
SELECT 
  sv.id as vote_id,
  COUNT(CASE WHEN svb.choice = 'FOR' THEN 1 END)::INT as votes_for,
  COUNT(CASE WHEN svb.choice = 'AGAINST' THEN 1 END)::INT as votes_against,
  COUNT(CASE WHEN svb.choice = 'ABSTAIN' THEN 1 END)::INT as votes_abstain,
  COUNT(svb.id)::INT as votes_total,
  COUNT(DISTINCT svb.membership_id)::INT as unique_voters
FROM public.simple_votes sv
LEFT JOIN public.simple_vote_ballots svb ON svb.vote_id = sv.id
GROUP BY sv.id;

COMMENT ON VIEW public.simple_vote_tallies IS 'Paprastų balsavimų suvestinė (UŽ/PRIEŠ/SUSILAIKĖ + kiek balsavo)';

GRANT SELECT ON public.simple_vote_tallies TO authenticated;

-- ==================================================
-- 6. ENABLE RLS
-- ==================================================

ALTER TABLE public.simple_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_vote_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_vote_attachments ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 
  '=== SIMPLE VOTE MODULIS SUKURTAS ===' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('simple_votes', 'simple_vote_ballots', 'simple_vote_attachments')) as tables_created,
  (SELECT COUNT(*) FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name = 'simple_vote_tallies') as views_created,
  (SELECT COUNT(*) FROM pg_type WHERE typname = 'vote_choice') as enum_created;

