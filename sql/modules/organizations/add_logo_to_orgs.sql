-- Add logo_url column to orgs table for organization logo/avatar
-- This allows each organization to have a custom logo or avatar image

-- Add logo_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orgs' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.orgs 
    ADD COLUMN logo_url TEXT;
    
    COMMENT ON COLUMN public.orgs.logo_url IS 'Organization logo or avatar image URL. Stored in Supabase Storage or external URL.';
  END IF;
END $$;

