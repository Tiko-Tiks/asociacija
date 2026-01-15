-- ==================================================
-- B4: Finalize Voting Governance Core (Resolutions)
-- Enforces strict status flow, immutability, adoption, visibility,
-- governance gate, and audit logging.
-- ==================================================

-- 1) Visibility constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'resolutions_visibility_check'
      AND conrelid = 'public.resolutions'::regclass
  ) THEN
    ALTER TABLE public.resolutions
      ADD CONSTRAINT resolutions_visibility_check
      CHECK (visibility IN ('PUBLIC', 'MEMBERS', 'INTERNAL'));
  END IF;
END $$;

-- 2) Governance + status + immutability enforcement
CREATE OR REPLACE FUNCTION public.enforce_resolution_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_activation RECORD;
BEGIN
  -- Governance gate: org must be ACTIVE and have active ruleset
  SELECT *
  INTO v_activation
  FROM public.org_activation_state
  WHERE org_id = NEW.org_id
  LIMIT 1;

  IF NOT FOUND
     OR v_activation.org_status IS DISTINCT FROM 'ACTIVE'
     OR v_activation.has_active_ruleset IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'ORG_NOT_ACTIVE_OR_NO_RULESET';
  END IF;

  -- Visibility constraint (defense in depth)
  IF NEW.visibility NOT IN ('PUBLIC', 'MEMBERS', 'INTERNAL') THEN
    RAISE EXCEPTION 'INVALID_VISIBILITY';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- APPROVED requires adoption fields
    IF NEW.status = 'APPROVED' THEN
      IF NEW.adopted_at IS NULL OR NEW.adopted_by IS NULL THEN
        RAISE EXCEPTION 'APPROVED_REQUIRES_ADOPTION_FIELDS';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: enforce strict status flow
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'DRAFT' AND NEW.status = 'PROPOSED' THEN
      -- allowed
    ELSIF OLD.status = 'PROPOSED' AND NEW.status IN ('APPROVED', 'REJECTED') THEN
      -- allowed
      IF NEW.status = 'APPROVED' THEN
        NEW.adopted_at := now();
        NEW.adopted_by := auth.uid();
      END IF;
    ELSE
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
    END IF;
  END IF;

  -- Adoption guarantee (reject missing fields)
  IF NEW.status = 'APPROVED' THEN
    IF NEW.adopted_at IS NULL OR NEW.adopted_by IS NULL THEN
      RAISE EXCEPTION 'APPROVED_REQUIRES_ADOPTION_FIELDS';
    END IF;
  END IF;

  -- Immutability: block updates on APPROVED rows
  IF OLD.status = 'APPROVED' THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.visibility IS DISTINCT FROM OLD.visibility
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.adopted_at IS DISTINCT FROM OLD.adopted_at
       OR NEW.adopted_by IS DISTINCT FROM OLD.adopted_by THEN
      RAISE EXCEPTION 'APPROVED_RESOLUTION_IMMUTABLE';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_resolution_rules ON public.resolutions;
CREATE TRIGGER trg_enforce_resolution_rules
BEFORE INSERT OR UPDATE ON public.resolutions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_resolution_rules();

-- 3) Audit logging for inserts and status changes
CREATE OR REPLACE FUNCTION public.audit_resolution_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      org_id,
      user_id,
      action,
      target_table,
      target_id,
      old_value,
      new_value
    ) VALUES (
      NEW.org_id,
      auth.uid(),
      'RESOLUTION_CREATED',
      'resolutions',
      NEW.id,
      NULL,
      jsonb_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'status', NEW.status,
        'visibility', NEW.visibility
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_logs (
      org_id,
      user_id,
      action,
      target_table,
      target_id,
      old_value,
      new_value
    ) VALUES (
      NEW.org_id,
      auth.uid(),
      'RESOLUTION_STATUS_CHANGED',
      'resolutions',
      NEW.id,
      jsonb_build_object(
        'status', OLD.status,
        'adopted_at', OLD.adopted_at,
        'adopted_by', OLD.adopted_by
      ),
      jsonb_build_object(
        'status', NEW.status,
        'adopted_at', NEW.adopted_at,
        'adopted_by', NEW.adopted_by
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Soft-fail: do not block main operation
  RAISE NOTICE 'AUDIT_LOG_FAILED: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_resolution_changes ON public.resolutions;
CREATE TRIGGER trg_audit_resolution_changes
AFTER INSERT OR UPDATE ON public.resolutions
FOR EACH ROW
EXECUTE FUNCTION public.audit_resolution_changes();

-- ==================================================
-- Manual test flow (run in SQL editor):
-- 1) INSERT DRAFT
-- 2) UPDATE -> PROPOSED
-- 3) UPDATE -> APPROVED (should set adopted_at/by)
-- 4) ATTEMPT UPDATE (must fail)
-- ==================================================
