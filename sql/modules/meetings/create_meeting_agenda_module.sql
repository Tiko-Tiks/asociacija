-- ==================================================
-- GA SUSIRINKIMO MODULIO SUKŪRIMAS
-- ==================================================
-- Sukuria agenda lenteles, meetings papildymus, RPC funkcijas
-- ==================================================

-- ==================================================
-- 1. MEETINGS LENTELĖS PAPILDYMAS
-- ==================================================

-- Add meeting_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'meeting_type'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN meeting_type TEXT NOT NULL DEFAULT 'GA';
    
    RAISE NOTICE 'Added meeting_type column to meetings';
  ELSE
    RAISE NOTICE 'meetings.meeting_type already exists';
  END IF;
END $$;

-- Add status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'));
    
    RAISE NOTICE 'Added status column to meetings';
  ELSE
    RAISE NOTICE 'meetings.status already exists';
  END IF;
END $$;

-- Add location column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN location TEXT;
    
    RAISE NOTICE 'Added location column to meetings';
  ELSE
    RAISE NOTICE 'meetings.location already exists';
  END IF;
END $$;

-- Add published_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN published_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added published_at column to meetings';
  ELSE
    RAISE NOTICE 'meetings.published_at already exists';
  END IF;
END $$;

-- Add notice_days column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'notice_days'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN notice_days INT;
    
    RAISE NOTICE 'Added notice_days column to meetings';
  ELSE
    RAISE NOTICE 'meetings.notice_days already exists';
  END IF;
END $$;

-- Add notice_sent_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'notice_sent_at'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN notice_sent_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added notice_sent_at column to meetings';
  ELSE
    RAISE NOTICE 'meetings.notice_sent_at already exists';
  END IF;
END $$;

-- Add agenda_version column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meetings'
    AND column_name = 'agenda_version'
  ) THEN
    ALTER TABLE public.meetings
    ADD COLUMN agenda_version INT NOT NULL DEFAULT 1;
    
    RAISE NOTICE 'Added agenda_version column to meetings';
  ELSE
    RAISE NOTICE 'meetings.agenda_version already exists';
  END IF;
END $$;

-- ==================================================
-- 2. MEETING_AGENDA_ITEMS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  item_no INT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  details TEXT,
  resolution_id UUID REFERENCES public.resolutions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT uq_meeting_agenda_item_no UNIQUE (meeting_id, item_no)
);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting ON public.meeting_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_resolution ON public.meeting_agenda_items(resolution_id);

COMMENT ON TABLE public.meeting_agenda_items IS 'Susirinkimo darbotvarkės klausimai';
COMMENT ON COLUMN public.meeting_agenda_items.item_no IS 'Klausimo numeris darbotvarkėje (1..n)';
COMMENT ON COLUMN public.meeting_agenda_items.resolution_id IS 'Susietas nutarimo projektas (optional)';

-- ==================================================
-- 3. MEETING_AGENDA_ATTACHMENTS LENTELĖ
-- ==================================================

CREATE TABLE IF NOT EXISTS public.meeting_agenda_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id UUID NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'meeting-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_attachments_item ON public.meeting_agenda_attachments(agenda_item_id);

COMMENT ON TABLE public.meeting_agenda_attachments IS 'Darbotvarkės klausimų priedai (failų metaduomenys)';
COMMENT ON COLUMN public.meeting_agenda_attachments.storage_path IS 'Supabase Storage path (pvz: org/{orgId}/meetings/{meetingId}/agenda/{itemId}/file.pdf)';

-- ==================================================
-- 4. MEETING_AGENDA_PUBLIC VIEW
-- ==================================================

CREATE OR REPLACE VIEW public.meeting_agenda_public AS
SELECT 
  m.id as meeting_id,
  m.org_id,
  m.title as meeting_title,
  m.scheduled_at,
  m.location,
  m.status as meeting_status,
  m.published_at,
  ai.id as agenda_item_id,
  ai.item_no,
  ai.title as item_title,
  ai.summary,
  ai.details,
  ai.resolution_id,
  aa.id as attachment_id,
  aa.storage_path,
  aa.file_name,
  aa.mime_type,
  aa.size_bytes
FROM public.meetings m
LEFT JOIN public.meeting_agenda_items ai ON ai.meeting_id = m.id
LEFT JOIN public.meeting_agenda_attachments aa ON aa.agenda_item_id = ai.id
WHERE m.status = 'PUBLISHED'
ORDER BY m.scheduled_at DESC, ai.item_no ASC;

COMMENT ON VIEW public.meeting_agenda_public IS 'Publikuotų susirinkimų darbotvarkės su priedais (nariams)';

GRANT SELECT ON public.meeting_agenda_public TO authenticated;

-- ==================================================
-- 5. ENABLE RLS
-- ==================================================

ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_attachments ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- VERIFICATION
-- ==================================================

SELECT 
  '=== MEETING AGENDA MODULIS SUKURTAS ===' as status,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = 'meetings' 
   AND column_name IN ('meeting_type', 'status', 'location', 'published_at', 'notice_days', 'notice_sent_at', 'agenda_version')) as meetings_columns_added,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('meeting_agenda_items', 'meeting_agenda_attachments')) as agenda_tables_created,
  (SELECT COUNT(*) FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name = 'meeting_agenda_public') as views_created;

