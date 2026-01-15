-- PROJEKTO INICIALIZAVIMO TESTAS
-- Paleiskite šį SQL Supabase Dashboard → SQL Editor

-- 1. Pridėti project metadata prie DRAFT rezoliucijos
UPDATE resolutions 
SET metadata = jsonb_build_object(
  'project.phase', 'planned',
  'indicator.budget_planned', 5000,
  'indicator.progress', 0
)
WHERE id = 'fc5b363d-9935-4893-9537-596c2b5dd1fc'
  AND status = 'DRAFT';

-- 2. Patikrinti ar metadata pridėta
SELECT 
  id, 
  title, 
  status,
  metadata->>'project.phase' as project_phase,
  metadata->>'indicator.budget_planned' as budget_planned,
  metadata->>'indicator.progress' as progress
FROM resolutions 
WHERE id = 'fc5b363d-9935-4893-9537-596c2b5dd1fc';

-- 3. (OPTIONAL) Patvirtinti rezoliuciją kaip APPROVED testavimui
-- DĖMESIO: Tai apeina governance - tik testavimui!
/*
UPDATE resolutions 
SET 
  status = 'APPROVED',
  adopted_at = NOW()
WHERE id = 'fc5b363d-9935-4893-9537-596c2b5dd1fc';
*/

-- 4. Patikrinti projektų registrą
SELECT 
  r.id as resolution_id,
  r.title,
  r.status,
  r.metadata->>'project.phase' as phase,
  r.metadata->>'indicator.budget_planned' as budget,
  r.metadata->>'indicator.progress' as progress
FROM resolutions r
WHERE r.status = 'APPROVED'
  AND (
    r.metadata->>'project.phase' IS NOT NULL 
    OR r.metadata->'project'->>'phase' IS NOT NULL
  );

