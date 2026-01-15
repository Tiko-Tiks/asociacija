-- ==================================================
-- LEGACY DATA FUNCTIONS AND VIEWS (v19.0+)
-- ==================================================
-- Governance / Audit-Safe Mode
-- NO SCHEMA CHANGES - Only metadata jsonb extension
-- ==================================================

-- ==================================================
-- 1) DROP AND RECREATE rpc_get_legacy_summary
-- ==================================================
-- Returns JSON summary of legacy projects and ideas
-- Governance: Metadata-only extension (project.* namespace)
-- ==================================================

DROP FUNCTION IF EXISTS public.rpc_get_legacy_summary(uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_legacy_summary(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_legacy int;
  v_projects int;
  v_ideas int;
  v_total_planned_eur numeric;
  v_avg_progress numeric;
  v_unique_phases text[];
  v_result jsonb;
BEGIN
  -- Count total legacy resolutions (DRAFT with project.* metadata)
  SELECT COUNT(*) INTO v_total_legacy
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}';
  
  -- Count projects (have project.tag)
  SELECT COUNT(*) INTO v_projects
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' ? 'tag';
  
  -- Count ideas (legacy ideas, typically without project.tag or with specific marker)
  -- Assumption: ideas don't have project.tag, or have a specific structure
  SELECT COUNT(*) INTO v_ideas
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND NOT (metadata -> 'project' ? 'tag');
  
  -- Calculate total planned budget (from project.budget.planned.amount)
  SELECT COALESCE(SUM((metadata -> 'project' -> 'budget' -> 'planned' ->> 'amount')::numeric), 0)
  INTO v_total_planned_eur
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' -> 'budget' -> 'planned' ? 'amount';
  
  -- Calculate average progress (from project.progress)
  SELECT COALESCE(AVG((metadata -> 'project' ->> 'progress')::numeric), 0)
  INTO v_avg_progress
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' ? 'progress';
  
  -- Get unique phases (from project.phase)
  SELECT COALESCE(ARRAY_AGG(DISTINCT metadata -> 'project' ->> 'phase'), ARRAY[]::text[])
  INTO v_unique_phases
  FROM public.resolutions
  WHERE org_id = p_org_id
    AND status = 'DRAFT'
    AND metadata @> '{"project":{}}'
    AND metadata -> 'project' ? 'phase';
  
  -- Build JSON result
  v_result := jsonb_build_object(
    'org_id', p_org_id,
    'total_legacy', v_total_legacy,
    'projects', v_projects,
    'ideas', v_ideas,
    'total_planned_eur', v_total_planned_eur,
    'avg_progress', COALESCE(v_avg_progress, 0),
    'unique_phases', v_unique_phases
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_get_legacy_summary IS 
'Governance: Returns JSON summary of legacy projects/ideas from resolutions.metadata (project.* namespace). Metadata-only extension, no schema changes.';

GRANT EXECUTE ON FUNCTION public.rpc_get_legacy_summary TO authenticated;

-- ==================================================
-- 2) CREATE rpc_get_legacy_resolutions
-- ==================================================
-- Returns TABLE of legacy resolutions with project/idea data
-- Governance: Metadata-only extension (project.* namespace)
-- ==================================================

CREATE OR REPLACE FUNCTION public.rpc_get_legacy_resolutions(
  p_org_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  resolution_id uuid,
  title text,
  status text,
  created_at timestamptz,
  legacy_id text,
  project_name text,
  planned_budget_eur numeric,
  progress_percent numeric,
  phase text,
  type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS resolution_id,
    r.title,
    r.status,
    r.created_at,
    -- legacy_id: use id as text, or extract from metadata if exists
    COALESCE(r.id::text, '') AS legacy_id,
    -- project_name: from metadata.project.name or title fallback
    COALESCE(
      r.metadata -> 'project' ->> 'name',
      r.title
    ) AS project_name,
    -- planned_budget_eur: from metadata.project.budget.planned.amount
    COALESCE(
      (r.metadata -> 'project' -> 'budget' -> 'planned' ->> 'amount')::numeric,
      0
    ) AS planned_budget_eur,
    -- progress_percent: from metadata.project.progress
    COALESCE(
      (r.metadata -> 'project' ->> 'progress')::numeric,
      0
    ) AS progress_percent,
    -- phase: from metadata.project.phase
    r.metadata -> 'project' ->> 'phase' AS phase,
    -- type: 'Projektas' if has project.tag, 'Idėja' otherwise
    CASE 
      WHEN r.metadata -> 'project' ? 'tag' THEN 'Projektas'
      ELSE 'Idėja'
    END AS type
  FROM public.resolutions r
  WHERE r.org_id = p_org_id
    AND r.status = 'DRAFT'
    AND r.metadata @> '{"project":{}}'
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.rpc_get_legacy_resolutions IS 
'Governance: Returns TABLE of legacy resolutions (projects/ideas) from resolutions.metadata (project.* namespace). Metadata-only extension, no schema changes.';

GRANT EXECUTE ON FUNCTION public.rpc_get_legacy_resolutions TO authenticated;

-- ==================================================
-- 3) CREATE legacy_meeting_attendance_summary VIEW
-- ==================================================
-- Read-only view summarizing meeting attendance
-- Governance: Read-only view, no schema changes
-- ==================================================

CREATE OR REPLACE VIEW public.legacy_meeting_attendance_summary AS
SELECT 
  ma.meeting_id,
  COALESCE(m.title, 'Meeting ' || ma.meeting_id::text) AS meeting_title,
  COUNT(*) FILTER (WHERE ma.present = true) AS total_present,
  COUNT(*) * 2.0 AS estimated_hours,
  m.org_id
FROM public.meeting_attendance ma
LEFT JOIN public.meetings m ON m.id = ma.meeting_id
GROUP BY ma.meeting_id, m.org_id, m.title;

COMMENT ON VIEW public.legacy_meeting_attendance_summary IS 
'Governance: Read-only view summarizing legacy meeting_attendance data. No schema changes - uses existing meeting_attendance table.';

GRANT SELECT ON public.legacy_meeting_attendance_summary TO authenticated;

-- ==================================================
-- 4) CREATE rpc_get_meeting_summary
-- ==================================================
-- Returns JSON summary of meeting attendance
-- Governance: Read-only aggregation, no schema changes
-- ==================================================

CREATE OR REPLACE FUNCTION public.rpc_get_meeting_summary(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_meetings int;
  v_total_present int;
  v_total_estimated_hours numeric;
  v_result jsonb;
BEGIN
  -- Aggregate from legacy_meeting_attendance_summary view
  SELECT 
    COUNT(DISTINCT meeting_id),
    COALESCE(SUM(total_present), 0),
    COALESCE(SUM(estimated_hours), 0)
  INTO 
    v_total_meetings,
    v_total_present,
    v_total_estimated_hours
  FROM public.legacy_meeting_attendance_summary
  WHERE org_id = p_org_id;
  
  -- Build JSON result
  v_result := jsonb_build_object(
    'org_id', p_org_id,
    'total_meetings', COALESCE(v_total_meetings, 0),
    'total_present', COALESCE(v_total_present, 0),
    'total_estimated_hours', COALESCE(v_total_estimated_hours, 0)
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.rpc_get_meeting_summary IS 
'Governance: Returns JSON summary of meeting attendance from legacy_meeting_attendance_summary view. Read-only aggregation, no schema changes.';

GRANT EXECUTE ON FUNCTION public.rpc_get_meeting_summary TO authenticated;
