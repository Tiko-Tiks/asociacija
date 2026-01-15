-- ==================================================
-- Finance + Project Reporting (v20) — Metadata Validation
-- Governance Layer v19.0 compliant (no schema changes)
-- ==================================================

-- 1) Strengthen global metadata validator to enforce object + non-null
CREATE OR REPLACE FUNCTION validate_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  metadata_keys refcursor;
  key text;
  allowed_prefixes text[] := ARRAY['fact', 'indicator', 'project', 'ui', 'template', 'ai'];
  has_valid_prefix boolean;
  prefix text;
BEGIN
  IF NEW.metadata IS NULL THEN
    RAISE EXCEPTION 'Metadata privaloma (NOT NULL).';
  END IF;

  IF jsonb_typeof(NEW.metadata) <> 'object' THEN
    RAISE EXCEPTION 'Metadata privalo būti JSON objektas.';
  END IF;

  OPEN metadata_keys FOR
    SELECT jsonb_object_keys(NEW.metadata);

  LOOP
    FETCH metadata_keys INTO key;
    EXIT WHEN NOT FOUND;

    has_valid_prefix := false;
    FOREACH prefix IN ARRAY allowed_prefixes
    LOOP
      IF key LIKE (prefix || '.%') THEN
        has_valid_prefix := true;
        EXIT;
      END IF;
    END LOOP;

    IF NOT has_valid_prefix THEN
      CLOSE metadata_keys;
      RAISE EXCEPTION 'Metadata raktas "%" neturi leidžiamo prefix''o su subraktu. Leidžiami prefix''ai: %',
                      key, allowed_prefixes;
    END IF;
  END LOOP;

  CLOSE metadata_keys;

  IF NEW.metadata ? 'title'
     OR NEW.metadata ? 'status'
     OR NEW.metadata ? 'created_at'
     OR NEW.metadata ? 'org_id' THEN
    RAISE EXCEPTION 'Draudžiama dubliuoti struktūrinius laukus metadata viduje (title, status, created_at, org_id).';
  END IF;

  IF TG_OP = 'UPDATE'
     AND TG_TABLE_NAME = 'resolutions'
     AND OLD.status = 'APPROVED'
     AND NEW.metadata <> OLD.metadata THEN
    RAISE EXCEPTION 'Negalima keisti metadata APPROVED nutarime. Sukurkite naują nutarimą su reference.';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Invoice-specific project tag validation
CREATE OR REPLACE FUNCTION validate_invoice_project_tag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  project_tag text;
BEGIN
  project_tag := NEW.metadata ->> 'project.tag';

  IF project_tag IS NULL OR btrim(project_tag) = '' THEN
    RAISE EXCEPTION 'Invoice metadata privalo turėti project.tag.';
  END IF;

  IF NEW.metadata ? 'project.id'
     OR NEW.metadata ? 'project.uuid'
     OR NEW.metadata ? 'project.slug'
     OR NEW.metadata ? 'project.code' THEN
    RAISE EXCEPTION 'Project identifikatorius leidžiamas tik per project.tag (draudžiami project.id/uuid/slug/code).';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Triggers (guarded: only if invoices.metadata exists)
DO $$
DECLARE
  has_metadata boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'metadata'
  ) INTO has_metadata;

  IF has_metadata THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_validate_metadata_invoices ON invoices';
    EXECUTE 'CREATE TRIGGER trg_validate_metadata_invoices
             BEFORE INSERT OR UPDATE ON invoices
             FOR EACH ROW
             EXECUTE FUNCTION validate_metadata()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_validate_invoice_project_tag ON invoices';
    EXECUTE 'CREATE TRIGGER trg_validate_invoice_project_tag
             BEFORE INSERT OR UPDATE ON invoices
             FOR EACH ROW
             EXECUTE FUNCTION validate_invoice_project_tag()';
  ELSE
    RAISE WARNING 'Skipping invoice metadata triggers: invoices.metadata column not found.';
  END IF;
END $$;

