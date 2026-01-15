-- ==================================================
-- FIX: Project Metadata Format
-- ==================================================
-- Problema: Projektų puslapis tuščias, nes metadata raktai nesutampa
-- 
-- UI kodas tikisi: metadata->>'project.phase' arba metadata->'project'->>'phase'
-- Bet SQL view naudoja: metadata->>'project.phase'
--
-- Šis fix'as patikrina ir parodo tikrą metadata struktūrą
-- ==================================================

-- STEP 1: Diagnozė - kokia dabartinė struktūra?
SELECT 
  'DIAGNOSE' AS step,
  id,
  title,
  status,
  jsonb_pretty(metadata) AS metadata_formatted
FROM resolutions
WHERE status = 'APPROVED'
LIMIT 5;

-- STEP 2: Patikrinti konkrečius raktus
SELECT
  id,
  title,
  -- Flat format (v19 canonical)
  metadata ->> 'project.phase' AS "project.phase (flat)",
  metadata ->> 'project.tag' AS "project.tag (flat)",
  metadata ->> 'indicator.budget_planned' AS "indicator.budget_planned (flat)",
  -- Nested format (legacy)
  metadata -> 'project' ->> 'phase' AS "project->phase (nested)",
  metadata -> 'indicator' ->> 'budget_planned' AS "indicator->budget_planned (nested)"
FROM resolutions
WHERE status = 'APPROVED';

-- ==================================================
-- Jei metadata yra nested formatu (project: {phase: "active"}),
-- galima konvertuoti į flat formatą su šiuo UPDATE
-- (TIK jei rezoliucija NĖRA APPROVED - APPROVED yra immutable!)
-- ==================================================

-- PAVYZDYS: Kaip turėtų atrodyti teisinga v19 metadata
/*
{
  "project.tag": "kelio-tvarkymas",
  "project.phase": "active",
  "indicator.budget_planned": 5000,
  "indicator.budget_spent": 0
}
*/

-- SVARBU: Pagal v19.0 taisykles, APPROVED rezoliucijų metadata NEGALIMA keisti!
-- Jei reikia pataisyti - reikia kurti NAUJĄ rezoliuciją.

