-- Add PENDING status to orgs.status check constraint
-- This allows organizations to be created with PENDING status during registration

-- First, drop the existing constraint
ALTER TABLE public.orgs
DROP CONSTRAINT IF EXISTS orgs_status_check;

-- Re-add constraint with PENDING included
ALTER TABLE public.orgs
ADD CONSTRAINT orgs_status_check 
CHECK (status IN ('DRAFT', 'ONBOARDING', 'PENDING', 'SUBMITTED_FOR_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'ACTIVE'));

-- Update comment
COMMENT ON COLUMN public.orgs.status IS 'Organization status: DRAFT, ONBOARDING, PENDING, SUBMITTED_FOR_REVIEW, NEEDS_CHANGES, REJECTED, ACTIVE';

