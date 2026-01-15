-- ==================================================
-- FIX: Įjungti pgcrypto plėtinį arba pakeisti hash skaičiavimą
-- ==================================================

-- VARIANTAS A: Įjungti pgcrypto (rekomenduojama)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Po šio, finalize_meeting_protocol turėtų veikti

-- ==================================================
-- VARIANTAS B: Jei pgcrypto negalima įjungti
-- Pakeisti hash skaičiavimą naudojant MD5
-- ==================================================
-- Jei variantas A neveikia, paleiskite šį:
/*
CREATE OR REPLACE FUNCTION public.finalize_meeting_protocol(
  p_meeting_id UUID
)
RETURNS TABLE(
  ok BOOLEAN,
  reason TEXT,
  protocol_id UUID,
  version INT,
  protocol_number TEXT,
  snapshot_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- ... (visa funkcija su pakeistu hash skaičiavimu)
-- Vietoj: v_hash := encode(digest(v_snapshot::TEXT, 'sha256'), 'hex');
-- Naudoti: v_hash := md5(v_snapshot::TEXT);
$$;
*/

