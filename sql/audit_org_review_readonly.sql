-- ==================================================
-- READ-ONLY AUDIT: Organization Review Request System
-- ==================================================
-- Patikrina esamą struktūrą prieš implementuojant review request sistemą
-- ==================================================

-- 1. Check orgs table structure
SELECT 
  'orgs table structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orgs'
ORDER BY ordinal_position;

-- 2. Check if orgs.status exists and what values it has
SELECT 
  'orgs.status check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'status'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status_exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'status'
    ) THEN (
      SELECT string_agg(DISTINCT status::text, ', ' ORDER BY status::text)
      FROM public.orgs
      WHERE status IS NOT NULL
      LIMIT 10
    )
    ELSE NULL
  END as existing_status_values;

-- 3. Check for required org fields (name, contact_email, etc.)
SELECT 
  'orgs required fields' as check_type,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orgs'
  AND column_name IN ('name', 'contact_email', 'slug', 'created_at')
ORDER BY column_name;

-- 4. Check for document storage (bylaws)
SELECT 
  'document storage check' as check_type,
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%document%' 
    OR table_name LIKE '%bylaw%'
    OR column_name LIKE '%bylaw%'
    OR column_name LIKE '%document%'
  )
ORDER BY table_name, column_name;

-- 5. Check org_documents table (if exists)
SELECT 
  'org_documents table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_name = 'org_documents'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as table_exists;

-- 6. Check governance_configs structure
SELECT 
  'governance_configs structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'governance_configs'
ORDER BY ordinal_position;

-- 7. Check notifications table (if exists)
SELECT 
  'notifications table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as table_exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN (
      SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    )
    ELSE NULL
  END as columns;

-- 8. Check for platform admin role/mechanism
SELECT 
  'platform admin check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' 
        AND table_name = 'platform_admins'
    ) THEN 'platform_admins table EXISTS'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name = 'is_platform_admin'
    ) THEN 'users.is_platform_admin EXISTS'
    ELSE 'NO PLATFORM ADMIN MECHANISM FOUND'
  END as admin_mechanism;

-- 9. Sample org data (first 3 orgs)
SELECT 
  'sample org data' as check_type,
  id,
  name,
  slug,
  status,
  created_at
FROM public.orgs
ORDER BY created_at
LIMIT 3;

