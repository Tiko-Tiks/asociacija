-- ==================================================
-- FIX: finalize_meeting_protocol digest() error (FINAL)
-- ==================================================
-- Problema: digest() funkcija nėra matoma
-- Sprendimas: Įjungti pgcrypto extension (funkcijos bus public schema)
-- ==================================================
-- Date: 2026-01-11
-- Issue: function digest(text, unknown) does not exist
-- Governance: v19.0 Schema Freeze compliant (extensions are NOT schema)
-- ==================================================

-- Įjungti pgcrypto extension
-- Tai sukurs digest() funkciją public schema
-- Funkcija naudoja SET search_path = public, pg_temp, todėl digest() bus matomas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Patikrinti, ar funkcija egzistuoja
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'digest' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'pgcrypto extension įjungtas, bet digest() funkcija nerasta. Patikrinkite extension nustatymus.';
  END IF;
  
  RAISE NOTICE 'pgcrypto extension įjungtas sėkmingai. digest() funkcija prieinama.';
END;
$$;

-- Funkcija jau naudoja digest() su SHA256
-- Po extension įjungimo, funkcija veiks be problemų
-- SHA256 atitinka dokumentacijos komentarą:
-- COMMENT ON COLUMN public.meeting_protocols.snapshot_hash IS 'sha256(snapshot::text) - immutable garantija';
