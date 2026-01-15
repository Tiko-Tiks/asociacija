-- ==================================================
-- PATIKRINTI MEETINGS LENTELĖS SCHEMĄ
-- ==================================================
-- Patikrinti ar yra metadata stulpelis
-- ==================================================

-- Patikrinti visus stulpelius
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meetings'
ORDER BY ordinal_position;

-- Patikrinti ar metadata stulpelis egzistuoja
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'meetings'
        AND column_name = 'metadata'
    ) THEN '✅ metadata stulpelis EGZISTUOJA'
    ELSE '❌ metadata stulpelis NĖRA'
  END AS metadata_status;

