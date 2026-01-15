-- ==================================================
-- IDEAS → VOTING → PROJECTS → SUPPORT Module
-- Row Level Security Policies
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contributions ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- IDEAS POLICIES
-- ==================================================

-- Members can SELECT ideas from their org
CREATE POLICY ideas_select_member ON public.ideas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      INNER JOIN public.orgs o ON o.id = m.org_id
      WHERE m.org_id = ideas.org_id
        AND m.user_id = auth.uid()
        AND m.member_status = 'ACTIVE'
        AND o.status = 'ACTIVE'
        AND NOT (o.status = 'ONBOARDING' AND o.metadata->'fact'->>'pre_org' = 'true')
    )
  );

-- OWNER/BOARD can INSERT ideas
CREATE POLICY ideas_insert_owner_board ON public.ideas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = ideas.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- OWNER/BOARD can UPDATE ideas
CREATE POLICY ideas_update_owner_board ON public.ideas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = ideas.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- IDEA_ATTACHMENTS POLICIES
-- ==================================================

-- Members can SELECT attachments for ideas in their org
CREATE POLICY idea_attachments_select_member ON public.idea_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      JOIN public.memberships m ON m.org_id = i.org_id
      WHERE i.id = idea_attachments.idea_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- OWNER/BOARD can INSERT attachments
CREATE POLICY idea_attachments_insert_owner_board ON public.idea_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ideas i
      JOIN public.memberships m ON m.org_id = i.org_id
      WHERE i.id = idea_attachments.idea_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- IDEA_VOTES POLICIES
-- ==================================================

-- Members can SELECT votes from their org
CREATE POLICY idea_votes_select_member ON public.idea_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = idea_votes.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- OWNER/BOARD can INSERT/UPDATE votes (via RPC)
CREATE POLICY idea_votes_insert_owner_board ON public.idea_votes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = idea_votes.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

CREATE POLICY idea_votes_update_owner_board ON public.idea_votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = idea_votes.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- IDEA_BALLOTS POLICIES
-- ==================================================

-- Members can SELECT ballots from their org
CREATE POLICY idea_ballots_select_member ON public.idea_ballots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.idea_votes iv
      JOIN public.memberships m ON m.org_id = iv.org_id
      WHERE iv.id = idea_ballots.idea_vote_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can INSERT their own ballot (via RPC with validation)
CREATE POLICY idea_ballots_insert_member ON public.idea_ballots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.idea_votes iv ON iv.org_id = m.org_id
      WHERE m.id = idea_ballots.membership_id
        AND iv.id = idea_ballots.idea_vote_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can UPDATE their own ballot (change vote)
CREATE POLICY idea_ballots_update_member ON public.idea_ballots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = idea_ballots.membership_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- ==================================================
-- PROJECTS POLICIES
-- ==================================================

-- Members can SELECT projects from their org
CREATE POLICY projects_select_member ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = projects.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- OWNER/BOARD can INSERT/UPDATE projects
CREATE POLICY projects_insert_owner_board ON public.projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = projects.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

CREATE POLICY projects_update_owner_board ON public.projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = projects.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

-- ==================================================
-- PROJECT_CONTRIBUTIONS POLICIES
-- ==================================================

-- Members can SELECT contributions from their org
CREATE POLICY project_contributions_select_member ON public.project_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = project_contributions.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can INSERT their own contributions
CREATE POLICY project_contributions_insert_member ON public.project_contributions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = project_contributions.membership_id
        AND m.org_id = project_contributions.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
  );

-- Members can UPDATE their own contributions (before RECEIVED)
CREATE POLICY project_contributions_update_member ON public.project_contributions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = project_contributions.membership_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
    )
    AND project_contributions.status = 'PLEDGED'
  );

-- OWNER/BOARD can UPDATE contribution status (mark as RECEIVED/CANCELLED)
CREATE POLICY project_contributions_update_status_owner_board ON public.project_contributions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = project_contributions.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'ACTIVE'
        AND (
          m.role = 'OWNER' OR
          EXISTS (
            SELECT 1 FROM public.positions pos
            WHERE pos.user_id = auth.uid()
              AND pos.org_id = m.org_id
              AND pos.title = 'BOARD'
              AND pos.is_active = true
          )
        )
    )
  );

