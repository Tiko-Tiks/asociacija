-- ==================================================
-- FIX: Set search_path for validate_metadata function
-- ==================================================
-- Security Issue: Function has mutable search_path (security vulnerability)
-- Solution: Add SET search_path = public, pg_temp to function
-- Governance: Audit-safe - no schema changes, only security fix
-- ==================================================
-- 
-- IMPORTANT: This migration fixes the security vulnerability where
-- validate_metadata function doesn't have an explicit search_path set,
-- which can lead to search path manipulation attacks.
-- ==================================================

-- Drop dependent triggers first (they will be recreated after function recreation)
-- Only drop triggers from tables that exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resolutions') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_resolutions ON resolutions;
    DROP TRIGGER IF EXISTS validate_metadata_trigger ON resolutions;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_events ON events;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_attendance') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_event_attendance ON event_attendance;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meetings') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_meetings ON meetings;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'metadata') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_invoices ON invoices;
    DROP TRIGGER IF EXISTS trg_validate_invoice_project_tag ON invoices;
  END IF;
END $$;

-- Drop existing function (triggers are already dropped)
DROP FUNCTION IF EXISTS validate_metadata();

-- Recreate function with explicit search_path
CREATE OR REPLACE FUNCTION validate_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  metadata_keys refcursor;  -- Explicit cursor for architectural clarity and future extensions
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

  -- Atidaryti explicit cursor jsonb raktams (streaming, aiškus kontrolė)
  OPEN metadata_keys FOR
    SELECT jsonb_object_keys(NEW.metadata);

  LOOP
    FETCH metadata_keys INTO key;
    EXIT WHEN NOT FOUND;

    -- Griežtas prefix tikrinimas: privalomas subraktas (pvz., fact.hours, ne tik fact)
    -- Tai užtikrina semantinį aiškumą ir apsaugo nuo neapibrėžtų plikų prefix'ų
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

  -- Bendras draudimas dubliuoti struktūrinius laukus (minimalus, bendras visoms lentelėms)
  IF NEW.metadata ? 'title' 
     OR NEW.metadata ? 'status' 
     OR NEW.metadata ? 'created_at' 
     OR NEW.metadata ? 'org_id' THEN
    RAISE EXCEPTION 'Draudžiama dubliuoti struktūrinius laukus metadata viduje (title, status, created_at, org_id).';
  END IF;

  -- Immutability apsauga tik UPDATE atveju (INSERT metu OLD neegzistuoja)
  IF TG_OP = 'UPDATE' 
     AND TG_TABLE_NAME = 'resolutions'
     AND OLD.status = 'APPROVED'
     AND NEW.metadata <> OLD.metadata THEN
    RAISE EXCEPTION 'Negalima keisti metadata APPROVED nutarime. Sukurkite naują nutarimą su reference.';
  END IF;

  -- Lentelės-specifiniai draudimai (galima plėsti pagal poreikį, audit clarity išlaikant)
  -- Pvz., events lentelei:
  -- IF TG_TABLE_NAME = 'events' AND (NEW.metadata ? 'start_time' OR NEW.metadata ? 'end_time') THEN
  --   RAISE EXCEPTION 'Draudžiama dubliuoti events struktūrinius laukus metadata viduje.';
  -- END IF;

  RETURN NEW;
END;
$$;

-- Invoice-specific validator (project.tag required, no alternate IDs)
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

COMMENT ON FUNCTION validate_metadata IS 
'Governance: Validates metadata according to Registry v19.0 rules. Enforces namespace prefixes, prevents structural duplication, and enforces APPROVED resolution immutability. Security: search_path is set to prevent injection attacks.';

-- Recreate triggers that depend on this function
-- Only create triggers for tables that exist

-- Trigger for resolutions table (always exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resolutions') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_resolutions ON resolutions;
    CREATE TRIGGER trg_validate_metadata_resolutions
      BEFORE INSERT OR UPDATE ON resolutions
      FOR EACH ROW
      EXECUTE FUNCTION validate_metadata();
    
    -- Also recreate the alternative trigger name if it was used
    DROP TRIGGER IF EXISTS validate_metadata_trigger ON resolutions;
    RAISE NOTICE 'Created trigger trg_validate_metadata_resolutions on resolutions';
  END IF;
END $$;

-- Trigger for events table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_events ON events;
    CREATE TRIGGER trg_validate_metadata_events
      BEFORE INSERT OR UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION validate_metadata();
    RAISE NOTICE 'Created trigger trg_validate_metadata_events on events';
  END IF;
END $$;

-- Trigger for event_attendance table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_attendance') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_event_attendance ON event_attendance;
    CREATE TRIGGER trg_validate_metadata_event_attendance
      BEFORE INSERT OR UPDATE ON event_attendance
      FOR EACH ROW
      EXECUTE FUNCTION validate_metadata();
    RAISE NOTICE 'Created trigger trg_validate_metadata_event_attendance on event_attendance';
  END IF;
END $$;

-- Trigger for meetings table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meetings') THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_meetings ON meetings;
    CREATE TRIGGER trg_validate_metadata_meetings
      BEFORE INSERT OR UPDATE ON meetings
      FOR EACH ROW
      EXECUTE FUNCTION validate_metadata();
    RAISE NOTICE 'Created trigger trg_validate_metadata_meetings on meetings';
  END IF;
END $$;

-- Trigger for invoices table (if metadata exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'metadata'
  ) THEN
    DROP TRIGGER IF EXISTS trg_validate_metadata_invoices ON invoices;
    CREATE TRIGGER trg_validate_metadata_invoices
      BEFORE INSERT OR UPDATE ON invoices
      FOR EACH ROW
      EXECUTE FUNCTION validate_metadata();
    RAISE NOTICE 'Created trigger trg_validate_metadata_invoices on invoices';

    DROP TRIGGER IF EXISTS trg_validate_invoice_project_tag ON invoices;
    CREATE TRIGGER trg_validate_invoice_project_tag
      BEFORE INSERT OR UPDATE ON invoices
      FOR EACH ROW
      EXECUTE FUNCTION validate_invoice_project_tag();
    RAISE NOTICE 'Created trigger trg_validate_invoice_project_tag on invoices';
  END IF;
END $$;

-- ==================================================
-- VERIFICATION
-- ==================================================

-- Verify search_path is set correctly
DO $$
DECLARE
    v_search_path text;
BEGIN
    -- Check validate_metadata
    SELECT pg_get_functiondef(oid) INTO v_search_path
    FROM pg_proc
    WHERE proname = 'validate_metadata'
    AND pronamespace = 'public'::regnamespace
    AND pronargs = 0;  -- No arguments
    
    IF v_search_path LIKE '%SET search_path%' THEN
        RAISE NOTICE 'SUCCESS: validate_metadata has search_path set';
    ELSE
        RAISE WARNING 'validate_metadata does not have search_path set';
    END IF;
END $$;
