-- ==================================================
-- SQL Migracija: Pridėti organizacijos detalių laukus į community_applications
-- ==================================================
-- 
-- Aprašymas:
-- Prideda laukus, kurie bus naudojami oficialiame bendruomenės puslapyje:
-- - registration_number: Registracijos numeris
-- - address: Adresas
-- - usage_purpose: Kur bus naudojama (oficialiame puslapyje)
--
-- Naudojimas:
-- 1. Eikite į Supabase Dashboard → SQL Editor
-- 2. Nukopijuokite visą šį failo turinį
-- 3. Įklijuokite į SQL Editor
-- 4. Spauskite "Run" arba Ctrl+Enter
--
-- ==================================================

-- Pridėti registration_number stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'community_applications' 
      AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE public.community_applications 
    ADD COLUMN registration_number TEXT;
    
    COMMENT ON COLUMN public.community_applications.registration_number IS 
      'Organizacijos registracijos numeris (pvz., juridinių asmenų registre)';
  END IF;
END $$;

-- Pridėti address stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'community_applications' 
      AND column_name = 'address'
  ) THEN
    ALTER TABLE public.community_applications 
    ADD COLUMN address TEXT;
    
    COMMENT ON COLUMN public.community_applications.address IS 
      'Organizacijos adresas (oficialus adresas)';
  END IF;
END $$;

-- Pridėti usage_purpose stulpelį
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'community_applications' 
      AND column_name = 'usage_purpose'
  ) THEN
    ALTER TABLE public.community_applications 
    ADD COLUMN usage_purpose TEXT;
    
    COMMENT ON COLUMN public.community_applications.usage_purpose IS 
      'Kur bus naudojama platforma (oficialiame bendruomenės puslapyje)';
  END IF;
END $$;

-- Patikrinimas: Rodyti pridėtų stulpelių informaciją
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'community_applications' 
  AND column_name IN ('registration_number', 'address', 'usage_purpose')
ORDER BY column_name;

-- ==================================================
-- Migracija baigta
-- ==================================================
-- 
-- Jei matote rezultatus su visais trimis stulpeliais, migracija sėkminga!
-- Dabar galite naudoti šiuos laukus registracijos formoje.
--
-- ==================================================

