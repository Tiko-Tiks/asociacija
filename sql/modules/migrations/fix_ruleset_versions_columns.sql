-- ==================================================
-- Fix ruleset_versions table columns
-- ==================================================
-- Adds missing columns to ruleset_versions if they don't exist
-- ==================================================

DO $$
BEGIN
  -- Add quorum_percentage column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'quorum_percentage'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN quorum_percentage INTEGER NULL;
    
    COMMENT ON COLUMN public.ruleset_versions.quorum_percentage IS 'Kvorumas procentais nuo ACTIVE narių';
  END IF;
  
  -- Add notice_period_days column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'notice_period_days'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN notice_period_days INTEGER NULL;
    
    COMMENT ON COLUMN public.ruleset_versions.notice_period_days IS 'Pranešimo laikotarpis dienomis';
  END IF;
  
  -- Add annual_fee column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'annual_fee'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN annual_fee NUMERIC(12,2) NULL;
    
    COMMENT ON COLUMN public.ruleset_versions.annual_fee IS 'Metinis nario mokestis';
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN status TEXT NULL;
    
    -- Add check constraint for valid statuses
    ALTER TABLE public.ruleset_versions
    ADD CONSTRAINT ruleset_versions_status_check 
    CHECK (status IS NULL OR status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'));
    
    COMMENT ON COLUMN public.ruleset_versions.status IS 'Ruleset versijos statusas: DRAFT, ACTIVE, ARCHIVED';
  END IF;
  
  -- Add org_id column if it doesn't exist (needed for query)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'ruleset_versions' 
      AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.ruleset_versions 
    ADD COLUMN org_id UUID NULL;
    
    -- Add foreign key if orgs table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'orgs'
    ) THEN
      ALTER TABLE public.ruleset_versions
      ADD CONSTRAINT ruleset_versions_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;
    END IF;
    
    COMMENT ON COLUMN public.ruleset_versions.org_id IS 'Organizacijos ID';
  END IF;
END $$;

