-- ==================================================
-- Admin: Delete Organization (for testing purposes)
-- ==================================================
-- WARNING: This permanently deletes ALL data related to the organization!
-- Use only for test organizations.
-- ==================================================

-- Function to delete organization and all related data
CREATE OR REPLACE FUNCTION public.admin_delete_org(p_org_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  deleted_tables TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_name TEXT;
  v_deleted_tables TEXT[] := '{}';
  v_count INT;
BEGIN
  -- Check if org exists
  SELECT name INTO v_org_name FROM public.orgs WHERE id = p_org_id;
  
  IF v_org_name IS NULL THEN
    RETURN QUERY SELECT false, 'Organizacija nerasta'::TEXT, v_deleted_tables;
    RETURN;
  END IF;

  -- Delete in order (child tables first, then parent tables)
  
  -- 1. Delete votes and vote_entries
  DELETE FROM public.vote_entries WHERE vote_id IN (
    SELECT id FROM public.votes WHERE org_id = p_org_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'vote_entries: ' || v_count); END IF;
  
  DELETE FROM public.votes WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'votes: ' || v_count); END IF;

  -- 2. Delete meeting related data
  DELETE FROM public.meeting_attendance WHERE meeting_id IN (
    SELECT id FROM public.meetings WHERE org_id = p_org_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'meeting_attendance: ' || v_count); END IF;
  
  DELETE FROM public.meeting_agenda_items WHERE meeting_id IN (
    SELECT id FROM public.meetings WHERE org_id = p_org_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'meeting_agenda_items: ' || v_count); END IF;
  
  DELETE FROM public.meeting_protocols WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'meeting_protocols: ' || v_count); END IF;
  
  DELETE FROM public.meetings WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'meetings: ' || v_count); END IF;

  -- 3. Delete resolutions
  DELETE FROM public.resolutions WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'resolutions: ' || v_count); END IF;

  -- 4. Delete positions
  DELETE FROM public.positions WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'positions: ' || v_count); END IF;

  -- 5. Delete invoices
  DELETE FROM public.invoices WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'invoices: ' || v_count); END IF;

  -- 6. Delete projects and project members
  DELETE FROM public.project_members WHERE project_id IN (
    SELECT id FROM public.projects WHERE org_id = p_org_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'project_members: ' || v_count); END IF;
  
  DELETE FROM public.projects WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'projects: ' || v_count); END IF;

  -- 7. Delete ideas
  DELETE FROM public.ideas WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'ideas: ' || v_count); END IF;

  -- 8. Delete memberships and consents
  DELETE FROM public.consents WHERE membership_id IN (
    SELECT id FROM public.memberships WHERE org_id = p_org_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'consents: ' || v_count); END IF;
  
  DELETE FROM public.memberships WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'memberships: ' || v_count); END IF;

  -- 9. Delete governance related
  DELETE FROM public.governance_configs WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'governance_configs: ' || v_count); END IF;
  
  DELETE FROM public.governance_answers WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'governance_answers: ' || v_count); END IF;

  -- 10. Delete rulesets
  DELETE FROM public.org_rulesets WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'org_rulesets: ' || v_count); END IF;
  
  DELETE FROM public.ruleset_versions WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'ruleset_versions: ' || v_count); END IF;

  -- 11. Delete review requests
  DELETE FROM public.org_review_requests WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'org_review_requests: ' || v_count); END IF;

  -- 12. Delete audit logs
  DELETE FROM public.audit_logs WHERE org_id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'audit_logs: ' || v_count); END IF;

  -- 13. Finally delete the organization
  DELETE FROM public.orgs WHERE id = p_org_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN v_deleted_tables := array_append(v_deleted_tables, 'orgs: ' || v_count); END IF;

  RETURN QUERY SELECT 
    true, 
    ('Organizacija "' || v_org_name || '" sėkmingai ištrinta')::TEXT,
    v_deleted_tables;
END;
$$;

COMMENT ON FUNCTION public.admin_delete_org IS 'Ištrina organizaciją ir visus susijusius duomenis (tik testavimui!)';

-- ==================================================
-- Naudojimo pavyzdžiai:
-- ==================================================

-- 1. Peržiūrėti organizacijas:
-- SELECT id, name, slug, status FROM orgs ORDER BY created_at DESC;

-- 2. Ištrinti organizaciją pagal ID:
-- SELECT * FROM admin_delete_org('čia-org-uuid');

-- 3. Ištrinti organizaciją pagal slug:
-- SELECT * FROM admin_delete_org((SELECT id FROM orgs WHERE slug = 'test-org'));

-- 4. Ištrinti visas testines organizacijas (atsargiai!):
-- SELECT * FROM admin_delete_org(id) FROM orgs WHERE name LIKE 'TEST%';
