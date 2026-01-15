-- ==================================================
-- FIX: finalize_meeting_protocol digest() error
-- ==================================================
-- Problema: digest() reikalauja pgcrypto plėtinio
-- Sprendimas: Įjungti pgcrypto extension (schema freeze compliant)
-- ==================================================
-- Date: 2026-01-11
-- Issue: function digest(text, unknown) does not exist
-- Governance: v19.0 Schema Freeze compliant (extensions are NOT schema)
-- ==================================================

-- Įjungti pgcrypto extension (tai NĖRA schema pakeitimas)
-- Schema freeze apriboja tik SCHEMA (tables, columns), ne EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Funkcija jau naudoja digest() su SHA256
-- Įjungus pgcrypto, funkcija veiks be problemų
-- SHA256 atitinka dokumentacijos komentarą:
-- COMMENT ON COLUMN public.meeting_protocols.snapshot_hash IS 'sha256(snapshot::text) - immutable garantija';
