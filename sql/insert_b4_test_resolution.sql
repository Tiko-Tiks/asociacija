-- ==================================================
-- INSERT B4 TEST RESOLUTION
-- ==================================================
-- Automatically uses first active organization
-- Handles updated_at column if it exists
-- ==================================================

-- Insert test resolution
INSERT INTO public.resolutions (
  id,
  org_id,
  title,
  content,
  status,
  visibility,
  created_at
)
SELECT 
  gen_random_uuid(),
  o.id,  -- Automatically uses first active org
  'B4 TEST DRAFT',
  'Balsavimo modulio testas – DRAFT būsena',
  'DRAFT',
  'INTERNAL',
  now()
FROM public.orgs o
WHERE o.status = 'ACTIVE'
ORDER BY o.created_at DESC
LIMIT 1
RETURNING 
  id, 
  status, 
  visibility,
  created_at,
  org_id;

-- If you need to see available organizations first:
-- SELECT id, name, slug FROM public.orgs WHERE status = 'ACTIVE' ORDER BY name;

