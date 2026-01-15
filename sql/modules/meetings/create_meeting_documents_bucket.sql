-- ============================================
-- CREATE MEETING-DOCUMENTS STORAGE BUCKET
-- ============================================
-- 
-- Run this in Supabase SQL Editor to create
-- the storage bucket for meeting attachments
--
-- ============================================

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-documents',
  'meeting-documents',
  false, -- Private bucket (requires auth)
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket

-- Policy: Authenticated users can upload to their org's folder
CREATE POLICY "Authenticated users can upload meeting documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-documents'
);

-- Policy: Authenticated users can view documents
CREATE POLICY "Authenticated users can view meeting documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-documents'
);

-- Policy: Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete meeting documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-documents'
);

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'meeting-documents';

