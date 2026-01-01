-- ==================================================
-- UPDATE RESOLUTION TO PROPOSED
-- ==================================================
-- Updates resolution status from DRAFT to PROPOSED
-- Handles updated_at column if it exists
-- ==================================================

-- Update resolution to PROPOSED
UPDATE public.resolutions
SET
  status = 'PROPOSED'
WHERE id = '9750aca7-513f-4b1a-a349-769c50d08c05'
RETURNING 
  id, 
  status, 
  visibility,
  created_at;

-- If updated_at column exists, you can also update it:
-- UPDATE public.resolutions
-- SET
--   status = 'PROPOSED',
--   updated_at = now()
-- WHERE id = '9750aca7-513f-4b1a-a349-769c50d08c05'
-- RETURNING id, status, visibility, updated_at;

