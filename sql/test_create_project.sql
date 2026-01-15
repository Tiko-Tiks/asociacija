-- TEST: Create a project by adding project metadata to an APPROVED resolution
-- This is for TESTING ONLY

-- First, let's check existing APPROVED resolutions
SELECT id, title, status, metadata 
FROM resolutions 
WHERE status = 'APPROVED'
LIMIT 5;

-- Create a test APPROVED resolution with project metadata
-- (In production, this would happen through the voting/approval process)

-- Option 1: If you have an existing APPROVED resolution, add project metadata:
-- UPDATE resolutions 
-- SET metadata = jsonb_set(
--   COALESCE(metadata, '{}'::jsonb),
--   '{project.phase}',
--   '"active"'::jsonb
-- )
-- WHERE id = '<resolution_id>' AND status = 'APPROVED';

-- Option 2: Create a new test resolution with project metadata
-- NOTE: This bypasses governance for testing purposes only!
/*
INSERT INTO resolutions (
  org_id,
  title,
  content,
  status,
  visibility,
  metadata
)
SELECT 
  id as org_id,
  'Testinis Projektas: Tvarkome kelią' as title,
  'Rezoliucija dėl kelio tvarkymo projekto pradėjimo. Skirta 5000 EUR.' as content,
  'APPROVED' as status,
  'MEMBERS' as visibility,
  jsonb_build_object(
    'project.phase', 'active',
    'project.code', 'PRJ-2026-001',
    'indicator.budget_planned', 5000,
    'indicator.progress', 0.25
  ) as metadata
FROM orgs
WHERE slug = 'kruminiai'
LIMIT 1
RETURNING id, title, metadata;
*/

-- Check projects after adding
SELECT 
  r.id,
  r.title,
  r.status,
  r.metadata->>'project.phase' as project_phase,
  r.metadata->>'indicator.progress' as progress,
  r.metadata->>'indicator.budget_planned' as budget
FROM resolutions r
WHERE r.status = 'APPROVED'
  AND (
    r.metadata->>'project.phase' IS NOT NULL 
    OR r.metadata->'project'->>'phase' IS NOT NULL
  );

