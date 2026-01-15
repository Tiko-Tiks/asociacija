-- Create org-logos storage bucket for organization logos
-- This bucket stores uploaded organization logos/avatars

-- Note: Storage buckets are created via Supabase Dashboard or Storage API
-- This SQL file provides the RLS policies for the bucket

-- First, create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage → Create Bucket
-- 2. Name: org-logos
-- 3. Public: Yes (so logos can be accessed via public URLs)
-- 4. File size limit: 5MB
-- 5. Allowed MIME types: image/*

-- Then run the policies below:

-- Policy: Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-logos');

-- Policy: Allow authenticated users to update their org logos
CREATE POLICY "Authenticated users can update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'org-logos')
WITH CHECK (bucket_id = 'org-logos');

-- Policy: Allow public read access to logos
CREATE POLICY "Public read access for org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');

-- Policy: Allow authenticated users to delete their org logos
CREATE POLICY "Authenticated users can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-logos');

