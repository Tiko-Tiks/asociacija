-- ==================================================
-- Fix: Include live voting totals in protocol snapshot
-- ==================================================
-- Problem: When preparing protocol after live voting session,
--          only remote votes were counted, not live (in-person) votes.
-- Solution: Combine vote_tallies (remote votes) with vote_live_totals (live votes)
-- ==================================================

-- Step 1: Create vote_live_totals table (if not exists)
-- This table stores live (in-person) voting results entered by meeting chair
CREATE TABLE IF NOT EXISTS public.vote_live_totals (
  vote_id UUID PRIMARY KEY REFERENCES public.votes(id) ON DELETE CASCADE,
  live_present_count INT NOT NULL DEFAULT 0,
  live_for_count INT NOT NULL DEFAULT 0,
  live_against_count INT NOT NULL DEFAULT 0,
  live_abstain_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_vote_live_totals_vote_id ON public.vote_live_totals(vote_id);

-- Enable RLS
ALTER TABLE public.vote_live_totals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Members of the org can view
DROP POLICY IF EXISTS "vote_live_totals_select" ON public.vote_live_totals;
CREATE POLICY "vote_live_totals_select" ON public.vote_live_totals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.votes v
      JOIN public.meetings m ON m.id = v.meeting_id
      JOIN public.memberships mem ON mem.org_id = m.org_id
      WHERE v.id = vote_live_totals.vote_id
        AND mem.user_id = auth.uid()
        AND mem.member_status = 'ACTIVE'
    )
  );

-- RLS Policy: OWNER/BOARD can insert/update
DROP POLICY IF EXISTS "vote_live_totals_insert" ON public.vote_live_totals;
CREATE POLICY "vote_live_totals_insert" ON public.vote_live_totals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.votes v
      JOIN public.meetings m ON m.id = v.meeting_id
      JOIN public.memberships mem ON mem.org_id = m.org_id
      WHERE v.id = vote_live_totals.vote_id
        AND mem.user_id = auth.uid()
        AND mem.member_status = 'ACTIVE'
        AND mem.role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS "vote_live_totals_update" ON public.vote_live_totals;
CREATE POLICY "vote_live_totals_update" ON public.vote_live_totals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.votes v
      JOIN public.meetings m ON m.id = v.meeting_id
      JOIN public.memberships mem ON mem.org_id = m.org_id
      WHERE v.id = vote_live_totals.vote_id
        AND mem.user_id = auth.uid()
        AND mem.member_status = 'ACTIVE'
        AND mem.role = 'OWNER'
    )
  );

COMMENT ON TABLE public.vote_live_totals IS 'Gyvo balsavimo (in-person) rezultatai, įvesti susirinkimo pirmininko';
COMMENT ON COLUMN public.vote_live_totals.live_present_count IS 'Kiek dalyvavo gyvai (iš meeting_attendance)';
COMMENT ON COLUMN public.vote_live_totals.live_for_count IS 'Kiek balsavo UŽ gyvai';
COMMENT ON COLUMN public.vote_live_totals.live_against_count IS 'Kiek balsavo PRIEŠ gyvai';
COMMENT ON COLUMN public.vote_live_totals.live_abstain_count IS 'Kiek SUSILAIKĖ gyvai';

-- Step 2: Update build_meeting_protocol_snapshot function to include live voting totals
CREATE OR REPLACE FUNCTION public.build_meeting_protocol_snapshot(
  p_meeting_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_meeting RECORD;
  v_attendance_summary JSONB;
  v_quorum JSONB;
  v_agenda JSONB;
  v_snapshot JSONB;
  v_quorum_function_exists BOOLEAN;
BEGIN
  -- Get meeting
  SELECT * INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'MEETING_NOT_FOUND');
  END IF;
  
  -- 1) Meeting meta
  -- Already have v_meeting
  
  -- 2) Attendance summary (using unique participants - no double counting)
  -- Remote participants from vote_ballots (WRITTEN/REMOTE), Live from meeting_attendance (IN_PERSON)
  SELECT jsonb_build_object(
    'present_in_person', COALESCE((
      SELECT COUNT(*)
      FROM public.meeting_attendance
      WHERE meeting_id = p_meeting_id
        AND present = true
        AND mode = 'IN_PERSON'
    ), 0),
    'present_written', COALESCE((
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'WRITTEN'
    ), 0),
    'present_remote', COALESCE((
      SELECT COUNT(DISTINCT vb.membership_id)
      FROM public.votes v
      INNER JOIN public.vote_ballots vb ON vb.vote_id = v.id
      WHERE v.meeting_id = p_meeting_id
        AND v.kind = 'GA'
        AND vb.channel = 'REMOTE'
    ), 0),
    'present_total', (
      SELECT 
        COALESCE((
          SELECT COUNT(DISTINCT membership_id)
          FROM public.meeting_remote_voters
          WHERE meeting_id = p_meeting_id
        ), 0) + COALESCE((
          SELECT COUNT(*)
          FROM public.meeting_attendance
          WHERE meeting_id = p_meeting_id
            AND present = true
            AND mode = 'IN_PERSON'
        ), 0)
    ),
    'total_active_members', (
      SELECT COUNT(*) FROM public.memberships
      WHERE org_id = v_meeting.org_id
      AND member_status = 'ACTIVE'
    )
  ) INTO v_attendance_summary;
  
  -- 3) Quorum
  -- REQUIRE meeting_quorum_status function (source of truth)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'meeting_quorum_status'
  ) INTO v_quorum_function_exists;
  
  IF NOT v_quorum_function_exists THEN
    -- Quorum function is required - return error
    RETURN jsonb_build_object('error', 'QUORUM_FUNCTION_MISSING');
  END IF;
  
  -- Use meeting_quorum_status (source of truth)
  SELECT to_jsonb(q.*) INTO v_quorum
  FROM public.meeting_quorum_status(p_meeting_id) q;
  
  -- 4) Agenda with votes
  -- FIX: Include live voting totals when calculating tallies
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_no', ai.item_no,
      'title', ai.title,
      'summary', ai.summary,
      'details', ai.details,
      'resolution_id', ai.resolution_id,
      'resolution', CASE 
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', r.id,
            'title', r.title,
            'status', r.status,
            'adopted_at', r.adopted_at,
            'adopted_by', r.adopted_by,
            'recommended_at', r.recommended_at,
            'recommended_by', r.recommended_by
          )
          FROM public.resolutions r
          WHERE r.id = ai.resolution_id
        )
        ELSE NULL
      END,
      'vote', CASE 
        WHEN ai.resolution_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', v.id,
            'kind', v.kind,
            'status', v.status,
            'opens_at', v.opens_at,
            'closes_at', v.closes_at,
            'closed_at', v.closed_at,
            'tallies', (
              SELECT jsonb_build_object(
                'votes_for', 
                  COALESCE((SELECT votes_for FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_for_count FROM public.vote_live_totals WHERE vote_id = v.id), 0),
                'votes_against', 
                  COALESCE((SELECT votes_against FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_against_count FROM public.vote_live_totals WHERE vote_id = v.id), 0),
                'votes_abstain', 
                  COALESCE((SELECT votes_abstain FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_abstain_count FROM public.vote_live_totals WHERE vote_id = v.id), 0),
                'votes_total', 
                  COALESCE((SELECT votes_for FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_for_count FROM public.vote_live_totals WHERE vote_id = v.id), 0) +
                  COALESCE((SELECT votes_against FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_against_count FROM public.vote_live_totals WHERE vote_id = v.id), 0) +
                  COALESCE((SELECT votes_abstain FROM public.vote_tallies WHERE vote_id = v.id), 0) + 
                  COALESCE((SELECT live_abstain_count FROM public.vote_live_totals WHERE vote_id = v.id), 0)
              )
            )
          )
          FROM public.votes v
          WHERE v.kind = 'GA'
          AND v.meeting_id = p_meeting_id
          AND v.resolution_id = ai.resolution_id
          LIMIT 1
        )
        ELSE NULL
      END,
      'attachments', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', aa.id,
            'file_name', aa.file_name,
            'storage_path', aa.storage_path,
            'mime_type', aa.mime_type,
            'size_bytes', aa.size_bytes
          )
        )
        FROM public.meeting_agenda_attachments aa
        WHERE aa.agenda_item_id = ai.id
      )
    )
    ORDER BY ai.item_no
  ) INTO v_agenda
  FROM public.meeting_agenda_items ai
  WHERE ai.meeting_id = p_meeting_id;
  
  -- Build final snapshot
  SELECT jsonb_build_object(
    'meeting', jsonb_build_object(
      'id', v_meeting.id,
      'org_id', v_meeting.org_id,
      'title', v_meeting.title,
      'scheduled_at', v_meeting.scheduled_at,
      'location', v_meeting.location,
      'meeting_type', v_meeting.meeting_type,
      'status', v_meeting.status,
      'published_at', v_meeting.published_at,
      'notice_days', v_meeting.notice_days
    ),
    'attendance', v_attendance_summary,
    'quorum', v_quorum,
    'agenda', COALESCE(v_agenda, '[]'::jsonb),
    'generated_at', NOW()
  ) INTO v_snapshot;
  
  RETURN v_snapshot;
END;
$$;

COMMENT ON FUNCTION public.build_meeting_protocol_snapshot IS 'Surenka visą protokolo turinį iš gyvų DB duomenų. Dabar apima ir gyvo balsavimo (live voting) balsus.';
