-- ==================================================
-- Governance Compliance System
-- ==================================================
-- Schema versioning ir compliance tracking
-- ==================================================

-- 1. Governance Schema Versions table
CREATE TABLE IF NOT EXISTS public.governance_schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_no INTEGER NOT NULL UNIQUE,
  change_summary TEXT NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_governance_schema_versions_active 
  ON public.governance_schema_versions(is_active, version_no DESC);

COMMENT ON TABLE public.governance_schema_versions IS 'Global governance schema versijos';
COMMENT ON COLUMN public.governance_schema_versions.version_no IS 'Schema versijos numeris (1, 2, 3...)';
COMMENT ON COLUMN public.governance_schema_versions.is_active IS 'Ar ši schema versija yra aktyvi';

-- Initialize with version 1 if no versions exist
INSERT INTO public.governance_schema_versions (version_no, change_summary, is_active)
SELECT 1, 'Initial schema version', true
WHERE NOT EXISTS (SELECT 1 FROM public.governance_schema_versions WHERE version_no = 1);

-- 2. Add compliance columns to governance_configs (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'governance_configs' 
      AND column_name = 'schema_version_no'
  ) THEN
    ALTER TABLE public.governance_configs 
    ADD COLUMN schema_version_no INTEGER NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'governance_configs' 
      AND column_name = 'last_validated_at'
  ) THEN
    ALTER TABLE public.governance_configs 
    ADD COLUMN last_validated_at TIMESTAMPTZ NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'governance_configs' 
      AND column_name = 'compliance_status'
  ) THEN
    ALTER TABLE public.governance_configs 
    ADD COLUMN compliance_status TEXT NOT NULL DEFAULT 'UNKNOWN'
      CHECK (compliance_status IN ('OK', 'NEEDS_UPDATE', 'INVALID', 'UNKNOWN'));
  END IF;
END $$;

COMMENT ON COLUMN public.governance_configs.schema_version_no IS 'Kuri schema versija užpildyta';
COMMENT ON COLUMN public.governance_configs.last_validated_at IS 'Paskutinio validavimo data';
COMMENT ON COLUMN public.governance_configs.compliance_status IS 'Compliance būsena: OK, NEEDS_UPDATE, INVALID, UNKNOWN';

-- 3. Governance Compliance Issues table
CREATE TABLE IF NOT EXISTS public.governance_compliance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  schema_version_no INTEGER NOT NULL,
  issue_code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error')),
  question_key TEXT NULL,
  message TEXT NOT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_governance_compliance_issues_org_version 
  ON public.governance_compliance_issues(org_id, schema_version_no);
CREATE INDEX IF NOT EXISTS idx_governance_compliance_issues_org_severity 
  ON public.governance_compliance_issues(org_id, severity);
CREATE INDEX IF NOT EXISTS idx_governance_compliance_issues_unresolved 
  ON public.governance_compliance_issues(org_id, resolved_at) 
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.governance_compliance_issues IS 'Organizacijų compliance problemos';
COMMENT ON COLUMN public.governance_compliance_issues.issue_code IS 'Problemos kodas: MISSING_REQUIRED, INVALID_TYPE, INACTIVE_ANSWERED, OUT_OF_RANGE';
COMMENT ON COLUMN public.governance_compliance_issues.severity IS 'Severity: warning arba error';

-- 4. Helper function to get current active schema version
CREATE OR REPLACE FUNCTION public.get_active_schema_version()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_version INTEGER;
BEGIN
  SELECT version_no INTO v_version
  FROM public.governance_schema_versions
  WHERE is_active = true
  ORDER BY version_no DESC
  LIMIT 1;
  
  RETURN COALESCE(v_version, 1);
END;
$$;

COMMENT ON FUNCTION public.get_active_schema_version IS 'Grąžina aktyvią schema versiją';

-- 5. Function to create new schema version (for admin)
CREATE OR REPLACE FUNCTION public.create_schema_version(
  p_change_summary TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(
  ok BOOLEAN,
  version_no INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_version INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_created_by, auth.uid());
  
  -- Get current max version
  SELECT COALESCE(MAX(version_no), 0) + 1 INTO v_new_version
  FROM public.governance_schema_versions;
  
  -- Deactivate old versions
  UPDATE public.governance_schema_versions
  SET is_active = false
  WHERE is_active = true;
  
  -- Create new version
  INSERT INTO public.governance_schema_versions (
    version_no,
    change_summary,
    created_by,
    is_active
  ) VALUES (
    v_new_version,
    p_change_summary,
    v_user_id,
    true
  );
  
  -- Mark all orgs as NEEDS_UPDATE (except those already INVALID)
  -- INVALID orgs stay INVALID, but OK/UNKNOWN/NEEDS_UPDATE become NEEDS_UPDATE
  UPDATE public.governance_configs
  SET compliance_status = 'NEEDS_UPDATE'
  WHERE compliance_status IN ('OK', 'UNKNOWN', 'NEEDS_UPDATE');
  
  RETURN QUERY SELECT true, v_new_version, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.create_schema_version IS 'Sukuria naują schema versiją (tik admin)';

