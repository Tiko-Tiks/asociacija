-- ==================================================
-- GA PROTOKOLŲ MODULIO SUKŪRIMAS
-- ==================================================
-- Sukuria protokolo lenteles, indeksus
-- ==================================================

-- ==================================================
-- 1. MEETING_PROTOCOLS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  protocol_number TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINAL')),
  snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  pdf_bucket TEXT DEFAULT 'meeting-documents',
  pdf_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_by UUID REFERENCES auth.users(id),
  finalized_at TIMESTAMPTZ,
  CONSTRAINT uq_meeting_protocol_version UNIQUE (meeting_id, version)
);

CREATE INDEX IF NOT EXISTS idx_meeting_protocols_org ON public.meeting_protocols(org_id);
CREATE INDEX IF NOT EXISTS idx_meeting_protocols_meeting ON public.meeting_protocols(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_protocols_status ON public.meeting_protocols(status);
CREATE INDEX IF NOT EXISTS idx_meeting_protocols_number ON public.meeting_protocols(org_id, protocol_number);

COMMENT ON TABLE public.meeting_protocols IS 'GA susirinkimų protokolai (immutable po finalizavimo)';
COMMENT ON COLUMN public.meeting_protocols.snapshot IS 'VISAS protokolo turinys (agenda + votes + quorum + dalyviai)';
COMMENT ON COLUMN public.meeting_protocols.snapshot_hash IS 'sha256(snapshot::text) - immutable garantija';
COMMENT ON COLUMN public.meeting_protocols.protocol_number IS 'Protokolo numeris (pvz. "2025-0002" arba "Nr. 2")';

-- ==================================================
-- 2. MEETING_PROTOCOL_SIGNATURES LENTELĖ (optional MVP)
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_protocol_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES public.meeting_protocols(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('CHAIRMAN', 'SECRETARY')),
  signed_by UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  signature_type TEXT CHECK (signature_type IN ('typed', 'ep-signature')),
  signature_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_meeting_protocol_signatures_protocol ON public.meeting_protocol_signatures(protocol_id);

COMMENT ON TABLE public.meeting_protocol_signatures IS 'Protokolo parašai (optional MVP)';
COMMENT ON COLUMN public.meeting_protocol_signatures.role IS 'CHAIRMAN arba SECRETARY';

-- ==================================================
-- 3. ENABLE RLS
-- ==================================================

ALTER TABLE public.meeting_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_protocol_signatures ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 
  '=== PROTOCOL MODULIS SUKURTAS ===' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('meeting_protocols', 'meeting_protocol_signatures')) as tables_created;

