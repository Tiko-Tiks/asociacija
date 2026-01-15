-- ==================================================
-- DIAGNOSE: Project Metadata Format
-- ==================================================
-- Problema: Projektų puslapis tuščias, nors yra APPROVED rezoliucija
-- Tikslas: Patikrinti kokiu formatu saugoma metadata
-- ==================================================

-- 1. Visų APPROVED rezoliucijų metadata
SELECT 
  id,
  title,
  status,
  metadata,
  jsonb_typeof(metadata) AS metadata_type
FROM resolutions
WHERE status = 'APPROVED'
LIMIT 10;

-- 2. Patikrinti ar yra project.phase (flat format)
SELECT 
  id,
  title,
  metadata ->> 'project.phase' AS project_phase_flat,
  metadata -> 'project' ->> 'phase' AS project_phase_nested,
  metadata
FROM resolutions
WHERE status = 'APPROVED';

-- 3. Patikrinti visus metadata raktus
SELECT 
  id,
  title,
  jsonb_object_keys(metadata) AS metadata_keys
FROM resolutions
WHERE status = 'APPROVED'
  AND metadata IS NOT NULL;

-- 4. Patikrinti indicator raktus
SELECT 
  id,
  title,
  metadata ->> 'indicator.budget_planned' AS budget_planned_flat,
  metadata -> 'indicator' ->> 'budget_planned' AS budget_planned_nested
FROM resolutions
WHERE status = 'APPROVED';

