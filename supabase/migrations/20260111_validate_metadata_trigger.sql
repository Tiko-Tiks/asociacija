CREATE OR REPLACE FUNCTION validate_metadata()
RETURNS trigger AS $$
DECLARE
  metadata_keys refcursor;  -- Explicit cursor for architectural clarity and future extensions
  key text;
  allowed_prefixes text[] := ARRAY['fact', 'indicator', 'project', 'ui', 'template', 'ai'];
  has_valid_prefix boolean;
  prefix text;
BEGIN
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
$$ LANGUAGE plpgsql;

-- Trigger taikymas (tik leidžiamoms lentelėms – audit_logs append-only, todėl netaikyti)
DROP TRIGGER IF EXISTS trg_validate_metadata_resolutions ON resolutions;
CREATE TRIGGER trg_validate_metadata_resolutions
  BEFORE INSERT OR UPDATE ON resolutions
  FOR EACH ROW
  EXECUTE FUNCTION validate_metadata();

DROP TRIGGER IF EXISTS trg_validate_metadata_events ON events;
CREATE TRIGGER trg_validate_metadata_events
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION validate_metadata();

DROP TRIGGER IF EXISTS trg_validate_metadata_event_attendance ON event_attendance;
CREATE TRIGGER trg_validate_metadata_event_attendance
  BEFORE INSERT OR UPDATE ON event_attendance
  FOR EACH ROW
  EXECUTE FUNCTION validate_metadata();

-- Analogiškai memberships, positions ir kt. (jei metadata naudojama)
-- audit_logs: JOKIO trigger'io – append-only principas