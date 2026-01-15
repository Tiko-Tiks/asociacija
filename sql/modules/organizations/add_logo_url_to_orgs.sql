-- ==================================================
-- SQL Migracija: Pridėti logo_url stulpelį į orgs lentelę
-- ==================================================
-- 
-- Aprašymas:
-- Prideda logo_url stulpelį į orgs lentelę, kad organizacijos galėtų turėti
-- savo logotipą arba avatarą.
--
-- Naudojimas:
-- 1. Eikite į Supabase Dashboard → SQL Editor
-- 2. Nukopijuokite visą šį failo turinį
-- 3. Įklijuokite į SQL Editor
-- 4. Spauskite "Run" arba Ctrl+Enter
--
-- Pastaba:
-- Šis SQL kodas yra saugus - jis patikrina, ar stulpelis jau egzistuoja,
-- prieš bandydamas jį pridėti. Galite jį paleisti kelis kartus be klaidų.
--
-- ==================================================

-- Pridėti logo_url stulpelį, jei jis dar neegzistuoja
DO $$
BEGIN
  -- Patikrinti, ar stulpelis jau egzistuoja
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orgs' 
      AND column_name = 'logo_url'
  ) THEN
    -- Pridėti logo_url stulpelį
    ALTER TABLE public.orgs 
    ADD COLUMN logo_url TEXT;
    
    -- Pridėti komentarą
    COMMENT ON COLUMN public.orgs.logo_url IS 
      'Organization logo or avatar image URL. Stored in Supabase Storage or external URL.';
    
    -- Patvirtinimo pranešimas
    RAISE NOTICE 'logo_url stulpelis sėkmingai pridėtas į orgs lentelę';
  ELSE
    -- Jei stulpelis jau egzistuoja
    RAISE NOTICE 'logo_url stulpelis jau egzistuoja orgs lentelėje';
  END IF;
END $$;

-- Patikrinimas: Rodyti logo_url stulpelio informaciją
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orgs' 
  AND column_name = 'logo_url';

-- ==================================================
-- Migracija baigta
-- ==================================================
-- 
-- Jei matote rezultatą su logo_url stulpeliu, migracija sėkminga!
-- Dabar galite naudoti logo upload funkcionalumą.
--
-- ==================================================

